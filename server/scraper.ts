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

    // ── Discount ────────────────────────────────────────────────────────────
    let discount = '';
    const savingsPercent = $('.savingsPercentage').first().text().trim();
    if (savingsPercent) {
      discount = savingsPercent.replace('-', '').replace('%', '') + '% OFF';
    } else {
      const origNum = parseFloat(originalPrice.replace(/[₹,]/g, '')) || 0;
      if (origNum > dealNum && dealNum > 0) {
        const discountPercent = Math.round(((origNum - dealNum) / origNum) * 100);
        if (discountPercent > 0 && discountPercent < 100) discount = `${discountPercent}% OFF`;
      }
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
    const products: ProductData[] = [];

    $('div[data-asin]').each((_, element) => {
      if (products.length >= limit) return false;
      
      const asin = $(element).attr('data-asin');
      if (!asin || asin.length !== 10) return;

      const titleEl = $(element).find('h2 a span, .a-size-medium.a-color-base.a-text-normal, .a-size-base-plus.a-color-base.a-text-normal').first();
      const title = titleEl.text().trim();
      
      if (!title || title.length < 10) return;

      // ── Deal price: prefer the .a-offscreen text inside a non-strikethrough
      // price element. Avoid per-unit prices by using the offscreen full text.
      let price = $(element).find('.a-price:not(.a-text-price) .a-offscreen').first().text().trim();
      if (!price) {
        const whole = $(element).find('.a-price-whole').first().text().trim().replace(/[,\.]/g, '');
        if (whole) price = `₹${whole}`;
      }
      if (!price) return;

      const priceNum = parseFloat(price.replace(/[₹,]/g, '')) || 0;
      if (priceNum <= 0) return;

      // ── MRP: must be strictly higher than the deal price
      let originalPrice = '';
      $(element).find('.a-price.a-text-price .a-offscreen').each((_, el) => {
        if (originalPrice) return;
        const val = $(el).text().trim();
        const candidate = parseFloat(val.replace(/[₹,]/g, '')) || 0;
        if (candidate > priceNum) originalPrice = val;
      });
      if (!originalPrice) originalPrice = price; // no valid MRP → same as price

      const ratingText = $(element).find('.a-icon-alt').first().text().trim();
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      const reviewsText = $(element).find('.a-size-base.s-underline-text, [aria-label*="stars"]').first().text().trim();
      const reviewsMatch = reviewsText.match(/([\d,]+)/);
      const reviews = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, '')) : 0;

      const image = $(element).find('img.s-image').attr('src') || '';

      const origNum = parseFloat(originalPrice.replace(/[₹,]/g, '')) || 0;
      let discount = '';
      if (origNum > priceNum && priceNum > 0) {
        const discountPercent = Math.round(((origNum - priceNum) / origNum) * 100);
        if (discountPercent > 0 && discountPercent < 100) discount = `${discountPercent}% OFF`;
      }

      products.push({
        title,
        price,
        originalPrice,
        discount,
        rating,
        reviews,
        image,
        features: [],
        url: `https://www.amazon.in/dp/${asin}`,
        asin,
      });
    });

    return products;

  } catch (error) {
    log(`[Scraper] Search error: ${error}`);
    throw error;
  }
}

export const fallbackProducts: Record<string, ProductData[]> = {
  electronics: [
    {
      asin: "B0BDHWDR12",
      title: "boAt Airdopes 141 Bluetooth Truly Wireless in Ear Earbuds with 42H Playtime",
      price: "₹1,299",
      originalPrice: "₹4,490",
      discount: "71% OFF",
      rating: 4.1,
      reviews: 245678,
      image: "",
      features: ["42 hours total playback", "BEAST Mode for gaming", "IPX4 water resistance", "IWP technology"],
      url: "https://www.amazon.in/dp/B0BDHWDR12",
      category: "electronics"
    } as any,
    {
      asin: "B09G9FPHY6",
      title: "Noise ColorFit Pulse Grand Smart Watch with 1.69\" HD Display",
      price: "₹1,499",
      originalPrice: "₹4,999",
      discount: "70% OFF",
      rating: 4.0,
      reviews: 89234,
      image: "",
      features: ["1.69\" HD display", "150+ watch faces", "24/7 heart rate monitoring", "SpO2 monitoring"],
      url: "https://www.amazon.in/dp/B09G9FPHY6",
      category: "electronics"
    } as any,
  ],
  mobile: [
    {
      asin: "B0CHX1W1XY",
      title: "Redmi 13C 5G (Starshine Green, 4GB RAM, 128GB Storage)",
      price: "₹10,999",
      originalPrice: "₹14,999",
      discount: "27% OFF",
      rating: 4.2,
      reviews: 34567,
      image: "",
      features: ["MediaTek Dimensity 6100+", "50MP AI Dual Camera", "5000mAh Battery", "90Hz Display"],
      url: "https://www.amazon.in/dp/B0CHX1W1XY",
      category: "mobile"
    } as any,
  ],
  home: [
    {
      asin: "B08R68T5RG",
      title: "Philips Air Purifier AC0819/20, Removes 99.5% Particles",
      price: "₹6,999",
      originalPrice: "₹9,995",
      discount: "30% OFF",
      rating: 4.3,
      reviews: 12890,
      image: "",
      features: ["Removes 99.5% particles", "HEPA filter", "Smart air sensor", "Quiet operation"],
      url: "https://www.amazon.in/dp/B08R68T5RG",
      category: "home"
    } as any,
  ],
  fashion: [
    {
      asin: "B07FJ5YL8Q",
      title: "Campus Men's Oxyfit Running Shoes",
      price: "₹649",
      originalPrice: "₹1,499",
      discount: "57% OFF",
      rating: 4.0,
      reviews: 45678,
      image: "",
      features: ["Lightweight", "Memory foam insole", "Anti-skid sole", "Breathable mesh"],
      url: "https://www.amazon.in/dp/B07FJ5YL8Q",
      category: "fashion"
    } as any,
  ],
  beauty: [
    {
      asin: "B0845XSLTV",
      title: "Mamaearth Vitamin C Face Wash with Vitamin C and Turmeric, 100ml",
      price: "₹199",
      originalPrice: "₹349",
      discount: "43% OFF",
      rating: 4.1,
      reviews: 156789,
      image: "",
      features: ["With Vitamin C & Turmeric", "Cleanses skin impurities", "Made Safe certified", "Paraben free"],
      url: "https://www.amazon.in/dp/B0845XSLTV",
      category: "beauty"
    } as any,
  ],
  fitness: [
    {
      asin: "B0B7QWFBVH",
      title: "Boldfit Yoga Mat for Women and Men, 6mm Extra Thick",
      price: "₹299",
      originalPrice: "₹999",
      discount: "70% OFF",
      rating: 4.2,
      reviews: 23456,
      image: "",
      features: ["6mm thick for comfort", "Anti-slip surface", "Lightweight & portable", "Easy to clean"],
      url: "https://www.amazon.in/dp/B0B7QWFBVH",
      category: "fitness"
    } as any,
  ],
  kitchen: [
    {
      asin: "B09JQMJHXY",
      title: "Prestige Omega Deluxe Induction Base Non-Stick Kitchen Set, 3 Pcs",
      price: "₹1,149",
      originalPrice: "₹2,795",
      discount: "59% OFF",
      rating: 4.3,
      reviews: 34567,
      image: "",
      features: ["Induction base", "Non-stick coating", "Cool touch handles", "Dishwasher safe"],
      url: "https://www.amazon.in/dp/B09JQMJHXY",
      category: "kitchen"
    } as any,
  ],
};

export function getFallbackProducts(category: string, limit: number): ProductData[] {
  const products = fallbackProducts[category] || fallbackProducts.electronics;
  return products.slice(0, limit);
}
