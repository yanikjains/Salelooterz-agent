import { searchAmazonIndia, ProductData, getFallbackProducts } from './scraper';

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
    "wireless earbuds",
    "smartwatch under 2000",
    "power bank 20000mah",
    "bluetooth speaker",
    "headphones"
  ],
  mobile: [
    "smartphone under 15000",
    "mobile 5G phone",
    "redmi phone",
    "samsung phone",
    "realme phone"
  ],
  home: [
    "air purifier",
    "water purifier",
    "mixer grinder",
    "vacuum cleaner",
    "ceiling fan"
  ],
  fashion: [
    "men casual shoes",
    "women handbag",
    "men wallet leather",
    "women kurta set",
    "sports shoes men"
  ],
  beauty: [
    "face serum vitamin c",
    "hair dryer",
    "trimmer for men",
    "sunscreen",
    "lipstick"
  ],
  fitness: [
    "yoga mat",
    "dumbbells",
    "resistance band",
    "protein powder",
    "gym gloves"
  ],
  kitchen: [
    "non stick pan",
    "pressure cooker",
    "lunch box steel",
    "water bottle",
    "knife set"
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
    console.log(`[Premium] Discovering "${category}" using: "${searchTerm}"`);
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
    console.error(`[Premium] Scraping failed for ${category}:`, error);
    return getFallbackProducts(category, limit).map(p => ({ ...p, category }));
  }
}

export async function discoverProducts(category: string, limit: number = 5): Promise<DiscoveredProduct[]> {
  try {
    const searchTerm = getRandomSearchTerm(category);
    console.log(`Discovering products for "${category}" using search: "${searchTerm}"`);
    
    const products = await searchAmazonIndia(searchTerm, limit);
    
    if (products.length === 0) {
      console.log(`No products found via scraping, using fallback for ${category}`);
      const fallbackData = getFallbackProducts(category, limit);
      return fallbackData.map(product => ({
        ...product,
        category,
      }));
    }
    
    return products.map(product => ({
      ...product,
      category,
    }));
  } catch (error) {
    console.error(`Scraping failed for ${category}, using fallback:`, error);
    const fallbackData = getFallbackProducts(category, limit);
    return fallbackData.map(product => ({
      ...product,
      category,
    }));
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
      console.error(`Skipping ${category}:`, error);
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
    console.log(`Discovering hot deals using: "${searchTerm}"`);
    const products = await searchAmazonIndia(searchTerm, limit);
    
    if (products.length === 0) {
      console.log('No deals found via scraping, using mixed fallback');
      const allFallback: DiscoveredProduct[] = [];
      for (const cat of Object.keys(categorySearchTerms).slice(0, 3)) {
        allFallback.push(...getFallbackProducts(cat, 2).map(p => ({ ...p, category: cat })));
      }
      return allFallback.slice(0, limit);
    }
    
    return products.map(product => ({
      ...product,
      category: "deals",
    }));
  } catch (error) {
    console.error('Hot deals scraping failed:', error);
    const allFallback: DiscoveredProduct[] = [];
    for (const cat of Object.keys(categorySearchTerms).slice(0, 3)) {
      allFallback.push(...getFallbackProducts(cat, 2).map(p => ({ ...p, category: cat })));
    }
    return allFallback.slice(0, limit);
  }
}
