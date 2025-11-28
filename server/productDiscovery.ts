export interface DiscoveredProduct {
  asin: string;
  title: string;
  price: string;
  originalPrice: string;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  features: string[];
  category: string;
  url: string;
}

const trendingProducts: Record<string, DiscoveredProduct[]> = {
  electronics: [
    {
      asin: "B0BDHWDR12",
      title: "Apple AirPods Pro (2nd Generation) Wireless Earbuds with MagSafe Charging Case",
      price: "$189.99",
      originalPrice: "$249.99",
      discount: 24,
      rating: 4.7,
      reviews: 89234,
      image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500",
      features: [
        "Active Noise Cancellation reduces unwanted background noise",
        "Adaptive Transparency lets you hear the world around you",
        "Personalized Spatial Audio with dynamic head tracking",
        "Up to 6 hours of listening time with a single charge"
      ],
      category: "electronics",
      url: "https://amazon.com/dp/B0BDHWDR12"
    },
    {
      asin: "B09V3KXJPB",
      title: "Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones",
      price: "$328.00",
      originalPrice: "$399.99",
      discount: 18,
      rating: 4.6,
      reviews: 45678,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
      features: [
        "Industry-leading noise cancellation with 8 microphones",
        "Crystal-clear hands-free calling",
        "30-hour battery life with quick charging",
        "Multipoint connection for seamless switching"
      ],
      category: "electronics",
      url: "https://amazon.com/dp/B09V3KXJPB"
    },
    {
      asin: "B0BDJ279KF",
      title: "Samsung Galaxy Watch 6 Classic 47mm Bluetooth Smartwatch",
      price: "$299.99",
      originalPrice: "$429.99",
      discount: 30,
      rating: 4.5,
      reviews: 12890,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
      features: [
        "Rotating bezel for easy navigation",
        "Advanced health monitoring with BioActive Sensor",
        "Sleep tracking and body composition analysis",
        "Up to 40 hours battery life"
      ],
      category: "electronics",
      url: "https://amazon.com/dp/B0BDJ279KF"
    },
    {
      asin: "B0C7KXLBQ2",
      title: "Anker PowerCore 26800mAh Portable Charger Power Bank",
      price: "$45.99",
      originalPrice: "$69.99",
      discount: 34,
      rating: 4.8,
      reviews: 156789,
      image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500",
      features: [
        "Ultra-high capacity charges iPhone 14 over 6 times",
        "PowerIQ technology for fastest possible charge",
        "Three USB ports to charge three devices at once",
        "MultiProtect safety system for complete protection"
      ],
      category: "electronics",
      url: "https://amazon.com/dp/B0C7KXLBQ2"
    }
  ],
  home: [
    {
      asin: "B07PXGQC1Q",
      title: "Instant Pot Duo 7-in-1 Electric Pressure Cooker 6 Quart",
      price: "$79.95",
      originalPrice: "$119.95",
      discount: 33,
      rating: 4.7,
      reviews: 234567,
      image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=500",
      features: [
        "7-in-1 functionality replaces 7 kitchen appliances",
        "Cooks up to 70% faster than traditional methods",
        "Easy one-touch cooking programs",
        "Dishwasher safe lid, inner pot, and accessories"
      ],
      category: "home",
      url: "https://amazon.com/dp/B07PXGQC1Q"
    },
    {
      asin: "B08R68T5RG",
      title: "Dyson V15 Detect Cordless Vacuum Cleaner",
      price: "$599.99",
      originalPrice: "$749.99",
      discount: 20,
      rating: 4.6,
      reviews: 23456,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500",
      features: [
        "Laser reveals microscopic dust on hard floors",
        "Piezo sensor counts and sizes dust particles",
        "Up to 60 minutes of fade-free power",
        "LCD screen shows real-time performance data"
      ],
      category: "home",
      url: "https://amazon.com/dp/B08R68T5RG"
    },
    {
      asin: "B09JQMJHXY",
      title: "Ninja AF101 Air Fryer 4 Quart Ceramic Coated Basket",
      price: "$89.99",
      originalPrice: "$129.99",
      discount: 31,
      rating: 4.8,
      reviews: 89234,
      image: "https://images.unsplash.com/photo-1626509653291-18d9a934b9db?w=500",
      features: [
        "Wide temperature range from 105°F to 400°F",
        "4-quart ceramic coated nonstick basket",
        "Cooks food up to 75% less fat than frying",
        "Dishwasher safe parts for easy cleanup"
      ],
      category: "home",
      url: "https://amazon.com/dp/B09JQMJHXY"
    }
  ],
  beauty: [
    {
      asin: "B07FJ5YL8Q",
      title: "Revlon One-Step Volumizer Plus 2.0 Hair Dryer and Styler",
      price: "$34.88",
      originalPrice: "$69.99",
      discount: 50,
      rating: 4.5,
      reviews: 178234,
      image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500",
      features: [
        "Unique oval brush design for smoothing hair",
        "3 heat/speed settings for styling flexibility",
        "Nylon pin & tufted bristles for detangling",
        "Cool tip for easy maneuvering"
      ],
      category: "beauty",
      url: "https://amazon.com/dp/B07FJ5YL8Q"
    },
    {
      asin: "B0845XSLTV",
      title: "CeraVe Moisturizing Cream Daily Face & Body Moisturizer 19 oz",
      price: "$16.99",
      originalPrice: "$21.99",
      discount: 23,
      rating: 4.8,
      reviews: 156789,
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500",
      features: [
        "3 essential ceramides to restore skin barrier",
        "Hyaluronic acid for intense hydration",
        "MVE technology for 24-hour moisturization",
        "Fragrance-free and non-comedogenic"
      ],
      category: "beauty",
      url: "https://amazon.com/dp/B0845XSLTV"
    },
    {
      asin: "B08GKNL4TR",
      title: "Oral-B iO Series 9 Electric Toothbrush with 4 Brush Heads",
      price: "$199.99",
      originalPrice: "$299.99",
      discount: 33,
      rating: 4.6,
      reviews: 34567,
      image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500",
      features: [
        "Revolutionary iO technology for professional-level clean",
        "AI-powered smart pressure sensor",
        "Interactive color display with personalized brushing modes",
        "3D teeth tracking for complete coverage"
      ],
      category: "beauty",
      url: "https://amazon.com/dp/B08GKNL4TR"
    }
  ],
  fitness: [
    {
      asin: "B0B7QWFBVH",
      title: "Fitbit Charge 6 Advanced Fitness & Health Tracker",
      price: "$139.95",
      originalPrice: "$159.95",
      discount: 13,
      rating: 4.4,
      reviews: 23456,
      image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500",
      features: [
        "24/7 heart rate tracking with stress management",
        "Built-in GPS for outdoor workouts",
        "40+ exercise modes with auto-recognition",
        "7-day battery life with fast charging"
      ],
      category: "fitness",
      url: "https://amazon.com/dp/B0B7QWFBVH"
    },
    {
      asin: "B08DFPV5Y2",
      title: "Theragun Elite Quiet Deep Tissue Massage Gun",
      price: "$299.00",
      originalPrice: "$399.00",
      discount: 25,
      rating: 4.7,
      reviews: 12890,
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500",
      features: [
        "QuietForce Technology for ultra-quiet operation",
        "Smart app integration with guided routines",
        "120-minute battery life per charge",
        "Ergonomic multi-grip design"
      ],
      category: "fitness",
      url: "https://amazon.com/dp/B08DFPV5Y2"
    },
    {
      asin: "B07D7P4SY4",
      title: "Bowflex SelectTech 552 Adjustable Dumbbells (Pair)",
      price: "$349.00",
      originalPrice: "$549.00",
      discount: 36,
      rating: 4.8,
      reviews: 45678,
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
      features: [
        "Adjusts from 5 to 52.5 lbs per dumbbell",
        "Replaces 15 sets of weights in your home",
        "Easy dial system for quick weight selection",
        "Compact design saves space"
      ],
      category: "fitness",
      url: "https://amazon.com/dp/B07D7P4SY4"
    }
  ],
  gaming: [
    {
      asin: "B0BCNKKZ91",
      title: "PlayStation 5 Console DualSense Wireless Controller Bundle",
      price: "$449.99",
      originalPrice: "$559.99",
      discount: 20,
      rating: 4.8,
      reviews: 67890,
      image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500",
      features: [
        "Lightning-fast loading with ultra-high speed SSD",
        "Ray tracing for stunning visual effects",
        "4K-TV gaming at up to 120fps",
        "Haptic feedback for immersive gameplay"
      ],
      category: "gaming",
      url: "https://amazon.com/dp/B0BCNKKZ91"
    },
    {
      asin: "B09DKC8TYS",
      title: "Razer BlackShark V2 Pro Wireless Gaming Headset",
      price: "$129.99",
      originalPrice: "$179.99",
      discount: 28,
      rating: 4.6,
      reviews: 23456,
      image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500",
      features: [
        "TriForce Titanium 50mm drivers for immersive audio",
        "THX Spatial Audio for 360-degree soundscape",
        "Detachable HyperClear Supercardioid Mic",
        "70-hour battery life"
      ],
      category: "gaming",
      url: "https://amazon.com/dp/B09DKC8TYS"
    },
    {
      asin: "B0BT2BQQKJ",
      title: "Logitech G Pro X Superlight 2 Wireless Gaming Mouse",
      price: "$149.99",
      originalPrice: "$159.99",
      discount: 6,
      rating: 4.7,
      reviews: 12345,
      image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500",
      features: [
        "Less than 60g ultra-lightweight design",
        "HERO 25K sensor with sub-micron precision",
        "LIGHTSPEED wireless technology",
        "95 hours of battery life"
      ],
      category: "gaming",
      url: "https://amazon.com/dp/B0BT2BQQKJ"
    }
  ]
};

export const categories = [
  { id: "electronics", name: "Electronics & Gadgets", icon: "📱", count: trendingProducts.electronics.length },
  { id: "home", name: "Home & Kitchen", icon: "🏠", count: trendingProducts.home.length },
  { id: "beauty", name: "Beauty & Personal Care", icon: "💄", count: trendingProducts.beauty.length },
  { id: "fitness", name: "Fitness & Sports", icon: "💪", count: trendingProducts.fitness.length },
  { id: "gaming", name: "Gaming", icon: "🎮", count: trendingProducts.gaming.length },
];

export function discoverProducts(category: string, limit: number = 5): DiscoveredProduct[] {
  const products = trendingProducts[category] || [];
  return products.slice(0, limit);
}

export function discoverAllCategories(limit: number = 5): DiscoveredProduct[] {
  const allProducts: DiscoveredProduct[] = [];
  
  for (const category of Object.keys(trendingProducts)) {
    allProducts.push(...trendingProducts[category]);
  }
  
  return allProducts
    .sort((a, b) => b.discount - a.discount)
    .slice(0, limit);
}

export function getRandomHotDeals(count: number = 5): DiscoveredProduct[] {
  const allProducts: DiscoveredProduct[] = [];
  
  for (const category of Object.keys(trendingProducts)) {
    allProducts.push(...trendingProducts[category]);
  }
  
  const shuffled = allProducts.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
