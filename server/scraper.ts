import axios from 'axios';
import * as cheerio from 'cheerio';
import { log } from './index';

export interface ProductData {
  title: string;
  price: string;
  originalPrice: string;
  discount: string;
  rating: number;
  reviews: number;
  image: string;
  features: string[];
  url: string;
  asin: string;
}

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isBlockedResponse(html: string): boolean {
  const blockedIndicators = [
    'robot check',
    'captcha',
    'automated access',
    'api-services-support@amazon',
    'sorry, we just need to make sure',
    'enter the characters you see below',
    'type the characters',
  ];
  
  const lowerHtml = html.toLowerCase();
  return blockedIndicators.some(indicator => lowerHtml.includes(indicator));
}

function parsePriceAmount(value: string): number {
  return parseFloat(String(value || "").replace(/[₹,\s]/g, "").replace(/[^0-9.]/g, "")) || 0;
}

function hasVerifiedDiscount(product: ProductData): boolean {
  const deal = parsePriceAmount(product.price);
  const mrp = parsePriceAmount(product.originalPrice);
  return deal > 0 && mrp > deal && mrp > 2000;
}

export function extractASIN(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
    /asin=([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await delay(1000 * attempt);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8,hi;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 20000,
        maxRedirects: 5,
      });

      const html = response.data;
      
      if (isBlockedResponse(html)) {
        throw new Error('Amazon is temporarily blocking requests. Please try again later.');
      }
      
      return html;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      log(`[Scraper] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        await delay(2000 * attempt);
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

export async function scrapeAmazonProduct(url: string): Promise<ProductData> {
  const asin = extractASIN(url);
  
  if (!asin) {
    throw new Error('Invalid Amazon URL - could not extract product ID (ASIN)');
  }

  const amazonInUrl = `https://www.amazon.in/dp/${asin}`;

  try {
    const html = await fetchWithRetry(amazonInUrl);
    const $ = cheerio.load(html);

    const title = $('#productTitle').text().trim() || 
                  $('h1.a-size-large').text().trim() ||
                  $('span.product-title-word-break').text().trim();

    if (!title) {
      throw new Error('Could not extract product details. Amazon may be blocking the request.');
    }

    // ── Deal price (the actual amount you pay) ─────────────────────────────
    // We try very specific containers first to avoid picking up per-unit prices.
    // Per-unit prices (e.g. ₹62.67/count) appear in secondary price blocks —
    // the real deal price is always in the primary "apex" or "core" price display.
    let price = '';
    const dealPriceSelectors = [
      '#apex_offerDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen',
      '#corePrice_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen',
      '#price_inside_buybox',
      '#priceblock_dealprice',
      '#priceblock_ourprice',
      '.a-price.priceToPay .a-offscreen',
      '.a-price:not(.a-text-price) .a-offscreen',
    ];
    for (const sel of dealPriceSelectors) {
      const val = $(sel).first().text().trim();
      if (val && val.includes('₹')) { price = val; break; }
    }
    // Fallback: reconstruct from whole + fraction but ONLY from apex container
    if (!price) {
      const whole = $('#apex_offerDisplay_desktop_feature_div .a-price-whole, #corePriceDisplay_desktop_feature_div .a-price-whole').first().text().trim().replace(/[,\.]/g, '');
      if (whole) price = `₹${whole}`;
    }
    if (!price) price = '₹0';

    // ── MRP / Original price (the strikethrough price) ─────────────────────
    // Must be HIGHER than the deal price. The strikethrough element is always
    // inside .a-text-price. We pick the one that corresponds to the deal price
    // block, not a per-unit breakdown.
    let originalPrice = '';
    const mrpSelectors = [
      '#apex_offerDisplay_desktop_feature_div .a-text-price .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen',
      '#corePrice_desktop_feature_div .a-text-price .a-offscreen',
      '.a-price.a-text-price span.a-offscreen',
      '.a-text-price .a-offscreen',
    ];
    const dealNum = parseFloat(price.replace(/[₹,]/g, '')) || 0;
    for (const sel of mrpSelectors) {
      const val = $(sel).first().text().trim();
      if (val && val.includes('₹')) {
        const candidate = parseFloat(val.replace(/[₹,]/g, '')) || 0;
        // Only accept as MRP if it's genuinely higher than the deal price
        if (candidate > dealNum) { originalPrice = val; break; }
      }
    }
    if (!originalPrice) originalPrice = price; // no valid MRP found → same as price

    // Always calculate the discount from the verified detail-page prices.
    // Search-card badges can be stale or refer to a different variant.
    let discount = '';
    const origNum = parsePriceAmount(originalPrice);
    if (origNum > dealNum && dealNum > 0) {
      const discountPercent = Math.round(((origNum - dealNum) / origNum) * 100);
      if (discountPercent > 0 && discountPercent < 100) discount = `${discountPercent}% OFF`;
    }

    let rating = 0;
    const ratingText = $('span.a-icon-alt').first().text().trim();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
    }

    let reviews = 0;
    const reviewsText = $('#acrCustomerReviewText').text().trim();
    const reviewsMatch = reviewsText.match(/([\d,]+)/);
    if (reviewsMatch) {
      reviews = parseInt(reviewsMatch[1].replace(/,/g, ''));
    }

    const image = $('#landingImage').attr('src') || 
                  $('#imgBlkFront').attr('src') ||
                  $('.a-dynamic-image').first().attr('src') ||
                  '';

    const features: string[] = [];
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
      const feature = $(el).text().trim();
      if (feature && !feature.includes('See more') && feature.length > 5) {
        features.push(feature);
      }
    });

    return {
      title,
      price,
      originalPrice,
      discount,
      rating,
      reviews,
      image,
      features: features.slice(0, 5),
      url: amazonInUrl,
      asin,
    };

  } catch (error) {
    log(`[Scraper] Scraping error: ${error}`);
    throw error;
  }
}

export async function searchAmazonIndia(query: string, limit: number = 5): Promise<ProductData[]> {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
  
  try {
    const html = await fetchWithRetry(searchUrl);
    const $ = cheerio.load(html);
    const candidates: Array<{ asin: string; url: string; title: string }> = [];
    const seenAsins = new Set<string>();
    const candidateLimit = Math.max(limit * 2, limit + 6);

    $('div[data-asin]').each((_, element) => {
      if (candidates.length >= candidateLimit) return false;
      
      const asin = ($(element).attr('data-asin') || '').trim().toUpperCase();
      if (!asin || asin.length !== 10) return;
      if (seenAsins.has(asin)) return;
      seenAsins.add(asin);

      const titleEl = $(element).find('h2 a span, .a-size-medium.a-color-base.a-text-normal, .a-size-base-plus.a-color-base.a-text-normal').first();
      const title = titleEl.text().trim();
      
      if (!title || title.length < 10) return;
      candidates.push({ asin, title, url: `https://www.amazon.in/dp/${asin}` });
    });

    // Search pages are discovery only. Re-fetch every accepted candidate from
    // its detail page so messages never use stale card prices or variant data.
    const products: ProductData[] = [];
    for (const candidate of candidates) {
      if (products.length >= limit) break;
      try {
        const verified = await scrapeAmazonProduct(candidate.url);
        if (verified.asin !== candidate.asin) continue;
        if (!verified.title || verified.title.trim().length < 10) continue;
        if (!hasVerifiedDiscount(verified)) continue;
        products.push(verified);
        await delay(350);
      } catch (error) {
        log(`[Scraper] Skipping unverified Amazon result ${candidate.asin}: ${error instanceof Error ? error.message : error}`);
      }
    }

    log(`[Scraper] Verified ${products.length}/${candidates.length} live detail pages for "${query}"`);
    return products;

  } catch (error) {
    log(`[Scraper] Search error: ${error}`);
    throw error;
  }
}

/**
 * No fallback products — only live Amazon data is ever used.
 * If scraping fails for a category the scheduler simply contributes
 * 0 products for that slot and moves on.
 */
export function getFallbackProducts(_category: string, _limit: number): ProductData[] {
  return [];
}
