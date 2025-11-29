import { ProductData } from './scraper';
import { DiscoveredProduct } from './productDiscovery';

const viralHooksHindi = [
  "🔥 LOOT DEAL ALERT",
  "😱 PRICE CRASH",
  "⚡ FLASH SALE LIVE",
  "🎯 TRENDING NOW",
  "💎 BESTSELLER ALERT",
  "🚨 LAST FEW LEFT",
  "🔥 MEGA DISCOUNT",
  "💰 UNBELIEVABLE PRICE",
  "⏰ LIMITED TIME OFFER",
  "🛒 MUST GRAB DEAL"
];

const closingLinesHindi = [
  "⚠️ Limited stock - Jaldi grab karo!",
  "⏰ Offer jaldi khatam ho jayega!",
  "🏃‍♂️ Miss mat karo ye deal!",
  "💨 Fast selling - Hurry up!",
  "⚡ Don't miss this deal!",
  "🔥 Selling out fast!",
  "⭐ Top rated product!"
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function formatIndianPrice(price: string): string {
  return price.includes('₹') ? price : `₹${price}`;
}

export function generateWhatsAppMessage(product: ProductData | DiscoveredProduct, affiliateTag: string): string {
  const hook = getRandomElement(viralHooksHindi);
  const closing = getRandomElement(closingLinesHindi);
  
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;
  
  const title = product.title.length > 80 ? product.title.substring(0, 80) + '...' : product.title;
  
  let message = `${hook} 🔥

*${title}*

`;

  if (product.originalPrice && product.originalPrice !== product.price) {
    message += `❌ ~MRP: ${formatIndianPrice(product.originalPrice)}~
`;
  }
  
  message += `✅ *Deal Price: ${formatIndianPrice(product.price)}*`;
  
  if (product.discount) {
    message += ` (${product.discount})`;
  }
  
  message += `

`;

  if (product.rating > 0) {
    message += `⭐ *Rating:* ${product.rating}/5`;
    if (product.reviews > 0) {
      message += ` (${product.reviews.toLocaleString('en-IN')} reviews)`;
    }
    message += `

`;
  }

  if (product.features && product.features.length > 0) {
    message += `✨ *Features:*
${product.features.slice(0, 3).map(f => `• ${f.substring(0, 60)}${f.length > 60 ? '...' : ''}`).join('\n')}

`;
  }

  message += `🛒 *BUY NOW:*
${affiliateUrl}

${closing}

#AmazonIndia #Deals #Shopping #Loot`;

  return message;
}

export function generateTelegramMessage(product: ProductData | DiscoveredProduct, affiliateTag: string): string {
  const hook = getRandomElement(viralHooksHindi);
  const closing = getRandomElement(closingLinesHindi);
  
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;
  
  let message = `${hook} 🚀

**${product.title}**

`;

  if (product.originalPrice && product.originalPrice !== product.price) {
    message += `💸 ~~MRP: ${formatIndianPrice(product.originalPrice)}~~
`;
  }
  
  message += `💰 **Deal Price:** ${formatIndianPrice(product.price)}`;
  
  if (product.discount) {
    message += ` 🏷️ ${product.discount}`;
  }
  
  message += `

`;

  if (product.rating > 0) {
    message += `⭐ **Rating:** ${product.rating}/5`;
    if (product.reviews > 0) {
      message += ` (${product.reviews.toLocaleString('en-IN')} reviews)`;
    }
    message += `

`;
  }

  if (product.features && product.features.length > 0) {
    message += `✨ **Key Features:**
${product.features.slice(0, 4).map(f => `🔹 ${f.substring(0, 70)}${f.length > 70 ? '...' : ''}`).join('\n')}

`;
  }

  message += `🛒 **ORDER NOW:** [Click Here](${affiliateUrl})

${closing}

#Amazon #India #Deals #Shopping #OnlineShopping`;

  return message;
}

export function generateWhatsAppMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  return generateWhatsAppMessage(product, affiliateTag);
}

export function generateTelegramMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  return generateTelegramMessage(product, affiliateTag);
}
