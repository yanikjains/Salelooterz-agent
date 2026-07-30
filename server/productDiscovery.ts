import { searchAmazonIndia, ProductData, getFallbackProducts } from './scraper';
import { log } from './index';

export interface DiscoveredProduct extends ProductData {
  category: string;
}

/**
 * LUXURY WhatsApp search terms — targets expensive products (₹5k–₹2L) with genuine deals.
 * Used exclusively for the daily WhatsApp batch.
 */
export const premiumWhatsAppSearchTerms: Record<string, string[]> = {
  electronics: [
    "Sony WH1000XM5 noise cancelling headphones",
    "Apple AirPods Pro 2nd generation",
    "Bose QuietComfort 45 headphones",
    "Samsung 55 inch QLED 4K TV",
    "Sony Alpha mirrorless camera",
    "Apple iPad Pro M2",
    "MacBook Air M2 chip",
    "DJI Mini 4 Pro drone",
    "Sony Bravia 65 inch OLED",
    "Apple Watch Ultra 2",
    "Samsung Galaxy Tab S9",
    "JBL PartyBox speaker premium",
  ],
  mobile: [
    "iPhone 15 Pro Max",
    "Samsung Galaxy S24 Ultra",
    "OnePlus 12 5G flagship",
    "Google Pixel 8 Pro",
    "Samsung Galaxy Z Fold 5",
    "Vivo X100 Pro",
    "Motorola Razr 40 Ultra",
    "Nothing Phone 2a Plus",
  ],
  home: [
    "Dyson V15 Detect cordless vacuum",
    "LG 8kg fully automatic front load washing machine",
    "Samsung 500L double door refrigerator",
    "Dyson Hot Cool air purifier fan",
    "robot vacuum mop Wi-Fi",
    "Haier 320L french door refrigerator",
    "Bosch 8kg washing machine",
    "Samsung 55L convection microwave oven",
  ],
  fashion: [
    "Emporio Armani watch men premium",
    "Fossil Gen 6 smartwatch",
    "Ray Ban Aviator Classic polarized",
    "Nike Air Jordan premium sneakers",
    "Louis Philippe formal suit men",
    "Michael Kors handbag women",
    "Tommy Hilfiger leather jacket men",
    "Titan Raga watch women gold",
  ],
  beauty: [
    "Dyson Airwrap multi styler complete",
    "Dyson Supersonic hair dryer",
    "Forest Essentials luxury face kit",
    "Sulwhasoo First Care Activating Serum",
    "Clinique Moisture Surge premium set",
    "Kérastase Elixir Ultime hair oil",
    "Charlotte Tilbury Magic Cream",
    "Estee Lauder Advanced Night Repair",
  ],
  fitness: [
    "Garmin Fenix 7 solar GPS smartwatch",
    "Apple Watch Series 9 GPS",
    "NordicTrack T Series treadmill",
    "Bowflex SelectTech 552 adjustable dumbbells",
    "Precor elliptical cross trainer",
    "Polar Vantage V3 sports watch",
    "Rogue fitness barbell premium",
    "Technogym exercise bike premium",
  ],
  kitchen: [
    "KitchenAid Artisan stand mixer",
    "De Longhi Dedica espresso machine",
    "Vitamix professional blender",
    "Instant Pot Pro 10-in-1 pressure cooker",
    "Breville Barista Express espresso",
    "Le Creuset cast iron dutch oven",
    "Ninja Foodi 11-in-1 SmartLid",
    "Panasonic bread maker premium",
  ],

  // ── Demographic categories — luxury tier ─────────────────────────────────
  boys: [
    "Sony PlayStation 5 console",
    "Apple AirPods Max premium",
    "mechanical gaming keyboard premium",
    "ASUS ROG gaming headset",
    "DJI Action 4 camera",
    "Apple Watch SE 2nd gen boys",
    "Razer gaming mouse premium",
    "Alienware gaming laptop",
  ],
  girls: [
    "Dyson Airwrap styler women",
    "Tanishq gold earrings women",
    "Michael Kors crossbody bag women",
    "Chanel Chance EDP perfume women",
    "Fossil Carlie watch women gold",
    "Swarovski crystal necklace set",
    "Charlotte Tilbury lipstick luxury",
    "Kérastase hair serum premium women",
  ],
  men: [
    "Casio G-Shock GBD-H2000 men",
    "Ray Ban Clubmaster premium polarized",
    "Mack Weldon premium men clothing",
    "Nike Air Max 270 premium",
    "Calvin Klein Eternity EDP men",
    "Fossil Townsman chronograph watch men",
    "Woodland premium leather shoes men",
    "Arrow formal suit men premium",
  ],
  women: [
    "Kanjivaram silk saree premium",
    "Tanishq 22k gold bangles women",
    "Forest Essentials ayurvedic luxury set",
    "Anita Dongre designer kurta set",
    "MAC Studio Fix foundation premium",
    "Fossil Karlie watch rose gold women",
    "premium cashmere pashmina shawl",
    "Titan Raga gold bracelet women",
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
      // fallback: try second premium term
      const searchTerm2 = getRandomPremiumTerm(category);
      const p2 = await searchAmazonIndia(searchTerm2, limit);
      if (p2.length > 0) return p2.map(p => ({ ...p, category }));
      return getFallbackProducts(category, limit).map(p => ({ ...p, category }));
    }
    return products.map(p => ({ ...p, category }));
  } catch (error) {
    log(`[Premium] Scraping failed for ${category}: ${error}`);
    return getFallbackProducts(category, limit).map(p => ({ ...p, category }));
  }
}

export async function discoverProducts(category: string, limit: number = 5): Promise<DiscoveredProduct[]> {
  try {
    const searchTerm = getRandomSearchTerm(category);
    log(`[Discovery] "${category}" — searching: "${searchTerm}"`);

    const products = await searchAmazonIndia(searchTerm, limit);

    if (products.length === 0) {
      log(`[Discovery] No results for "${category}" — using fallback products`);
      return getFallbackProducts(category, limit).map(product => ({ ...product, category }));
    }

    return products.map(product => ({ ...product, category }));
  } catch (error) {
    log(`[Discovery] Scraping failed for "${category}" — using fallback: ${error}`);
    return getFallbackProducts(category, limit).map(product => ({ ...product, category }));
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
      log(`[Discovery] No hot deals found — using mixed fallback`);
      const allFallback: DiscoveredProduct[] = [];
      for (const cat of Object.keys(categorySearchTerms).slice(0, 3)) {
        allFallback.push(...getFallbackProducts(cat, 2).map(p => ({ ...p, category: cat })));
      }
      return allFallback.slice(0, limit);
    }

    return products.map(product => ({ ...product, category: "deals" }));
  } catch (error) {
    log(`[Discovery] Hot deals scraping failed — using fallback: ${error}`);
    const allFallback: DiscoveredProduct[] = [];
    for (const cat of Object.keys(categorySearchTerms).slice(0, 3)) {
      allFallback.push(...getFallbackProducts(cat, 2).map(p => ({ ...p, category: cat })));
    }
    return allFallback.slice(0, limit);
  }
}
