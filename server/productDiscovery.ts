import { searchAmazonIndia, ProductData, getFallbackProducts } from './scraper';

export interface DiscoveredProduct extends ProductData {
  category: string;
}

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
