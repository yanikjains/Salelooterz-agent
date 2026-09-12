import { searchAmazonIndia, ProductData, getFallbackProducts } from './scraper';
import { log } from './index';

export interface DiscoveredProduct extends ProductData {
  category: string;
  /** Time the live Amazon search returned this product. */
  scrapedAt: string;
}

function withScrapeTime(products: ProductData[], category: string, scrapedAt = new Date().toISOString()): DiscoveredProduct[] {
  return products.map(product => ({ ...product, category, scrapedAt }));
}

/**
 * WhatsApp deal search terms — targets quality products with high discounts (60%+ off).
 * These terms are designed to surface genuinely discounted products across all price ranges.
 * Used exclusively for the daily WhatsApp batch.
 */
export const premiumWhatsAppSearchTerms: Record<string, string[]> = {
  electronics: [
    "bluetooth earphones deal sale",
    "smart LED bulb combo offer",
    "power bank 10000mah deal",
    "wireless mouse keyboard combo sale",
    "portable bluetooth speaker deal",
    "USB C fast charger sale",
    "smartwatch fitness band offer",
    "noise cancelling earbuds deal",
    "mini projector sale offer",
    "gaming headset deal discount",
  ],
  mobile: [
    "redmi smartphone sale offer",
    "realme phone deal discount",
    "4G smartphone deal under 10000",
    "samsung galaxy deal sale",
    "refurbished smartphone deal certified",
    "oneplus nord sale offer",
    "poco phone deal discount",
    "lava 5G phone sale",
  ],
  home: [
    "air purifier sale deal",
    "electric kettle offer discount",
    "mixer grinder sale deal",
    "ceiling fan deal offer",
    "LED strip light sale",
    "water bottle insulated deal",
    "mosquito killer lamp sale",
    "extension board power strip deal",
    "room heater sale deal",
    "table fan offer discount",
  ],
  fashion: [
    "men t-shirt combo pack sale",
    "women kurta set sale offer",
    "men casual shoes deal discount",
    "women handbag sale offer",
    "men jeans sale deal",
    "women leggings combo sale",
    "sports shoes men sale discount",
    "women top dress sale deal",
    "men wallet sale offer",
    "women saree sale discount",
  ],
  beauty: [
    "face wash sale deal discount",
    "sunscreen SPF 50 offer",
    "hair oil sale deal",
    "face serum deal discount",
    "trimmer men sale offer",
    "lipstick combo sale deal",
    "moisturiser sale discount",
    "shampoo conditioner combo deal",
    "kajal eyeliner sale offer",
    "body lotion sale deal",
  ],
  fitness: [
    "yoga mat sale deal discount",
    "resistance band set sale",
    "dumbbells set deal offer",
    "protein powder deal sale",
    "skipping rope sale offer",
    "gym gloves deal discount",
    "gym bag sale offer",
    "fitness tracker band sale deal",
    "sports water bottle deal",
    "ab roller wheel sale",
  ],
  kitchen: [
    "non stick tawa pan sale",
    "pressure cooker deal discount",
    "lunch box steel combo sale",
    "water bottle deal offer",
    "knife set sale discount",
    "casserole set deal sale",
    "chopping board deal offer",
    "masala box spice container sale",
    "flask thermos deal discount",
    "cookie baking set sale",
  ],

  // ── Demographic categories ────────────────────────────────────────────────
  boys: [
    "gaming accessories sale deal",
    "action figure toy sale discount",
    "school bag backpack sale offer",
    "cricket bat ball set deal",
    "RC car toy sale discount",
    "earphones gaming deal sale",
    "watch boys sale offer",
    "jersey sports t-shirt sale",
  ],
  girls: [
    "hair accessories combo sale",
    "women jewellery set sale deal",
    "handbag purse sale offer",
    "makeup kit combo sale discount",
    "women footwear sale deal",
    "perfume women sale offer",
    "saree kurti sale deal",
    "watch women sale discount",
  ],
  men: [
    "men clothing combo sale",
    "men formal shirt sale deal",
    "men grooming kit sale offer",
    "men perfume deodorant sale",
    "men running shoes deal sale",
    "men belt wallet combo sale",
    "men winter jacket sale deal",
    "men cap hat sale offer",
  ],
  women: [
    "women ethnic wear sale deal",
    "women accessories combo sale",
    "women fitness activewear sale",
    "women sandals sale deal offer",
    "ladies watch sale discount",
    "women skincare combo sale",
    "women winter wear sale deal",
    "women home wear nightsuit sale",
  ],
};

export const categorySearchTerms: Record<string, string[]> = {
  electronics: [
    // Budget (under ₹1000)
    "USB C cable fast charging under 500",
    "phone holder for car under 300",
    "earphones under 500 wired",
    // Mid (₹1000–₹5000)
    "wireless earbuds under 2000",
    "smartwatch under 3000",
    "power bank 20000mah",
    "bluetooth speaker under 2000",
    "USB hub multiport",
    // Premium (₹5000+)
    "headphones noise cancelling",
    "smartwatch premium GPS",
    "portable projector mini"
  ],
  mobile: [
    // Budget
    "smartphone under 8000",
    "4G phone under 6000",
    // Mid
    "smartphone under 15000",
    "5G phone under 20000",
    "redmi phone",
    "realme phone",
    // Premium
    "samsung phone flagship",
    "oneplus 5G flagship",
    "google pixel smartphone"
  ],
  home: [
    // Budget
    "mosquito repellent electric",
    "water bottle stainless steel under 300",
    "extension cord 4 socket",
    // Mid
    "air purifier room",
    "water purifier RO",
    "mixer grinder 750W",
    "ceiling fan energy saving",
    // Premium
    "robot vacuum cleaner",
    "air conditioner 1.5 ton 5 star",
    "washing machine fully automatic"
  ],
  fashion: [
    // Budget
    "men t-shirt combo pack under 500",
    "women casual top under 400",
    "men slippers under 300",
    // Mid
    "men casual shoes under 2000",
    "women handbag",
    "men wallet leather",
    "women kurta set",
    "sports shoes men",
    // Premium
    "men formal shoes leather premium",
    "women saree silk",
    "men jacket winter premium"
  ],
  beauty: [
    // Budget
    "face wash under 200",
    "sunscreen SPF 50 under 300",
    "lipstick under 300",
    // Mid
    "face serum vitamin c",
    "hair dryer 1800W",
    "trimmer for men",
    "moisturiser SPF day cream",
    // Premium
    "serum retinol anti ageing",
    "hair straightener ceramic professional",
    "perfume for women EDP 100ml"
  ],
  fitness: [
    // Budget
    "skipping rope",
    "gym gloves under 300",
    "resistance band set",
    // Mid
    "yoga mat anti slip 6mm",
    "dumbbells set adjustable",
    "protein powder whey 1kg",
    "ab roller wheel",
    // Premium
    "treadmill home use motorized",
    "adjustable dumbbell set 20kg",
    "smartwatch fitness GPS heart rate"
  ],
  kitchen: [
    // Budget
    "lunch box steel under 300",
    "water bottle under 200",
    "wooden spatula set",
    // Mid
    "non stick pan set",
    "pressure cooker 5L",
    "knife set stainless steel",
    "chopping board bamboo",
    // Premium
    "air fryer digital 5L",
    "stand mixer kitchen",
    "espresso coffee maker"
  ]
};

export const categories = [
  { id: "electronics", name: "Electronics", icon: "📱", description: "Gadgets & Audio" },
  { id: "mobile", name: "Mobiles", icon: "📲", description: "Smartphones" },
  { id: "home", name: "Home", icon: "🏠", description: "Appliances" },
  { id: "fashion", name: "Fashion", icon: "👗", description: "Clothing & Shoes" },
  { id: "beauty", name: "Beauty", icon: "💄", description: "Skincare" },
  { id: "fitness", name: "Fitness", icon: "💪", description: "Sports & Health" },
  { id: "kitchen", name: "Kitchen", icon: "🍳", description: "Cookware" },
];

function getRandomSearchTerm(category: string): string {
  const terms = categorySearchTerms[category] || categorySearchTerms.electronics;
  return terms[Math.floor(Math.random() * terms.length)];
}

function getRandomPremiumTerm(category: string): string {
  const terms = premiumWhatsAppSearchTerms[category] || premiumWhatsAppSearchTerms.electronics;
  return terms[Math.floor(Math.random() * terms.length)];
}

/** Scrapes premium/expensive products for the daily WhatsApp batch */
export async function discoverPremiumProducts(category: string, limit: number = 5): Promise<DiscoveredProduct[]> {
  try {
    const searchTerm = getRandomPremiumTerm(category);
    log(`[Premium] Discovering "${category}" using: "${searchTerm}"`);
    const products = await searchAmazonIndia(searchTerm, limit + 3);
    if (products.length === 0) {
      // Try a second premium term before giving up
      const searchTerm2 = getRandomPremiumTerm(category);
      const p2 = await searchAmazonIndia(searchTerm2, limit);
      return withScrapeTime(p2, category);
    }
    return withScrapeTime(products, category);
  } catch (error) {
    log(`[Premium] Scraping failed for ${category}: ${error}`);
    return []; // no fake data — only live Amazon results
  }
}

export async function discoverProducts(category: string, limit: number = 5): Promise<DiscoveredProduct[]> {
  try {
    const searchTerm = getRandomSearchTerm(category);
    log(`[Discovery] "${category}" — searching: "${searchTerm}"`);
    const products = await searchAmazonIndia(searchTerm, limit);
    if (products.length === 0) {
      log(`[Discovery] No results for "${category}" — skipping (no fake data)`);
      return [];
    }
    return withScrapeTime(products, category);
  } catch (error) {
    log(`[Discovery] Scraping failed for "${category}": ${error}`);
    return []; // no fake data — only live Amazon results
  }
}

export async function discoverFromAllCategories(limit: number = 5): Promise<DiscoveredProduct[]> {
  const allProducts: DiscoveredProduct[] = [];
  const categoriesToSearch = Object.keys(categorySearchTerms);
  const perCategory = Math.max(1, Math.ceil(limit / categoriesToSearch.length));
  
  for (const category of categoriesToSearch) {
    try {
      const products = await discoverProducts(category, perCategory);
      allProducts.push(...products);

      if (allProducts.length >= limit) break;

      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      log(`[Discovery] Skipping "${category}": ${error}`);
      continue;
    }
  }
  
  return allProducts.slice(0, limit);
}

export async function discoverHotDeals(limit: number = 5): Promise<DiscoveredProduct[]> {
  const dealSearchTerms = [
    "deals today",
    "best sellers",
    "trending products",
    "lightning deals",
  ];
  
  const searchTerm = dealSearchTerms[Math.floor(Math.random() * dealSearchTerms.length)];
  
  try {
    log(`[Discovery] Hot deals — searching: "${searchTerm}"`);
    const products = await searchAmazonIndia(searchTerm, limit);

    if (products.length === 0) {
      log(`[Discovery] No hot deals found — skipping (no fake data)`);
      return [];
    }

    return withScrapeTime(products, "deals");
  } catch (error) {
    log(`[Discovery] Hot deals scraping failed: ${error}`);
    return []; // no fake data — only live Amazon results
  }
}
