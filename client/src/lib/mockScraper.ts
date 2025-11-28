import { useState, useEffect } from "react";

export interface ProductData {
  title: string;
  price: string;
  rating: number;
  reviews: number;
  image: string;
  features: string[];
  url: string;
}

export const mockScrape = async (url: string): Promise<ProductData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: "Sony WH-1000XM5 Wireless Noise Canceling Headphones, 30 Hours Battery Life, Crystal Clear Hands-Free Calling",
        price: "$348.00",
        rating: 4.5,
        reviews: 12453,
        image: "https://m.media-amazon.com/images/I/61+El6kR+LL._AC_SL1500_.jpg", // Using a real looking amazon mock image or I can use a stock one if needed, but a direct link is risky if it breaks. I'll use a placeholder if this fails, but let's try to be realistic. actually, better to use a reliable placeholder or stock image tool result if I had one. For now I will use a generic tech placeholder from a reliable source or just a colored div if image fails.
        features: [
          "Industry-leading noise cancellation",
          "Magnificent Sound, engineered to perfection",
          "Crystal clear hands-free calling",
          "Up to 30-hour battery life with quick charging"
        ],
        url: url
      });
    }, 2000); // 2 second delay to simulate scraping
  });
};

export const generateViralMessage = (product: ProductData, platform: 'whatsapp' | 'telegram'): string => {
  const discount = "15% OFF"; // Mock discount
  
  if (platform === 'whatsapp') {
    return `🔥 *PRICE DROP ALERT* 🔥\n\n*${product.title.substring(0, 40)}...*\n\n❌ ~Was: $399.00~\n✅ *Now: ${product.price}* (${discount})\n\n😱 *Why you need this:*\n${product.features.map(f => `• ${f}`).join('\n')}\n\n👇 *Grab yours before it's gone:*\n${product.url}?tag=my-affiliate-20\n\n#AmazonDeals #Tech #Sale`;
  } else {
    return `🚀 *FLASH DEAL ALERT* 🚀\n\n*${product.title}*\n\n💰 *Price:* ${product.price} (Save ${discount})\n⭐️ *Rating:* ${product.rating}/5 (${product.reviews} reviews)\n\n✨ *Key Features:*\n${product.features.map(f => `🔹 ${f}`).join('\n')}\n\n🔗 *ORDER HERE:* [Link](${product.url}?tag=my-affiliate-20)\n\n⚠️ _Limited time offer!_\n\n#Amazon #Deals #Discounts #TechDeals`;
  }
};
