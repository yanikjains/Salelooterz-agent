import { searchAmazonIndia, ProductData, getFallbackProducts } from './scraper';

export interface DiscoveredProduct extends ProductData {
  category: string;
}

/**
 * Premium WhatsApp search terms — targets expensive products with genuine deals.
 * Used exclusively for the daily WhatsApp batch.
 */
export const premiumWhatsAppSearchTerms: Record<string, string[]> = {
  electronics: [
    "Sony WH1000XM5 headphones",
    "Apple AirPods Pro",
    "Bose QuietComfort headphones",
    "Samsung QLED TV 43 inch",
    "Sony camera mirrorless",
    "iPad 10th generation",
    "MacBook Air M2",
    "Kindle Paperwhite",
    "GoPro camera",
    "DJI drone",
  ],
  mobile: [
    "iPhone 15",
    "Samsung Galaxy S23",
    "OnePlus 12",
    "Google Pixel 8",
    "Nothing Phone 2",
    "Samsung Galaxy A55",
    "Vivo X100",
    "Motorola Edge 50 Pro",
  ],
  home: [
    "Dyson vacuum cleaner",
    "robot vacuum mop",
    "LG washing machine fully automatic",
    "Samsung double door refrigerator",
    "Philips air fryer XXL",
    "Instant Pot electric cooker",
    "Dyson air purifier",
    "Whirlpool microwave oven",
  ],
  fashion: [
    "Ray Ban sunglasses",
    "Nike Air Max shoes men",
    "Adidas Ultraboost running shoes",
    "Tommy Hilfiger jacket men",
    "premium leather handbag women",
    "Fastrack watch men",
    "Woodland boots men",
    "Levi 511 slim jeans men",
  ],
  beauty: [
    "Dyson Airwrap hair styler",
    "Philips hair straightener premium",
    "La Roche Posay sunscreen",
    "Minimalist face serum vitamin c",
    "The Ordinary niacinamide",
    "Bombay Shaving Company premium kit",
    "Lakme premium makeup",
    "Neutrogena moisturizer",
  ],
  fitness: [
    "Garmin smartwatch",
    "Fitbit Charge 6",
    "treadmill motorized home",
    "Whey protein premium 5kg",
    "Bowflex dumbbells",
    "Crossfit kettlebell set",
    "smart fitness band",
    "Nike gym shoes premium",
  ],
  kitchen: [
    "Philips air fryer HD9252",
    "Instant Pot Duo pressure cooker",
    "Breville espresso machine",
    "KitchenAid hand mixer",
    "Tefal cookware set premium",
    "Bosch food processor",
    "Ninja blender",
    "Le Creuset cast iron",
  ],

  // ── Demographic categories ──────────────────────────────────────────────
  boys: [
    "JBL earphones wireless gaming",
    "gaming mouse RGB mechanical",
    "mechanical keyboard gaming",
    "PlayStation DualSense controller",
    "Nike shoes boys premium",
    "Apple Watch SE",
    "Boat Airdopes gaming",
    "GoPro HERO action camera",
    "Realme smartwatch boys",
    "popsocket gaming phone",
  ],
  girls: [
    "Maybelline premium makeup kit",
    "gold plated earrings set",
    "Guess handbag women",
    "perfume women EDP premium",
    "hair curler professional ceramic",
    "The Ordinary serum set",
    "sunglasses women cat eye premium",
    "Fossil watch women gold",
    "Swarovski bracelet women",
    "nail art kit professional",
  ],
  men: [
    "Woodland formal shoes men leather",
    "Philips OneBlade trimmer",
    "Casio G-Shock watch men",
    "Fossil leather wallet men",
    "men bomber jacket premium",
    "Calvin Klein perfume men",
    "Puma running shoes men",
    "Peter England formal shirt",
    "Bluetooth earphones men premium",
    "Ray Ban polarized men",
  ],
  women: [
    "silk saree premium zari",
    "designer anarkali kurta set women",
    "gold earrings 22k women",
    "Lakme CC cream women",
    "Prestige induction cooktop",
    "women trench coat premium",
    "gold bangles premium",
    "WOW skin science face cream women",
    "Manyavar ethnic set women",
    "Tanishq jewellery women",
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
