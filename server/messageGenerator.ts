import { ProductData } from './scraper';
import { DiscoveredProduct } from './productDiscovery';

const viralHooks = [
  "🔥 PRICE DROP ALERT",
  "😱 LIMITED TIME DEAL",
  "⚡ FLASH SALE",
  "🎯 TRENDING NOW",
  "💎 BESTSELLER ALERT",
  "🚨 ALMOST SOLD OUT",
  "🔥 HOT DEAL ALERT",
  "💰 MASSIVE SAVINGS",
  "⏰ TODAY ONLY",
  "🛒 MUST-HAVE ITEM"
];

const closingLines = [
  "⚠️ Limited stock - grab yours now!",
  "⏰ Deal ends soon!",
  "🏃‍♂️ Hurry before it's gone!",
  "💨 Flying off the shelves!",
  "⚡ Don't miss out!",
  "🔥 Selling fast!",
  "⭐ Top rated product!"
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateWhatsAppMessage(product: ProductData, affiliateTag: string): string {
  const hook = getRandomElement(viralHooks);
  const closing = getRandomElement(closingLines);
  
  const originalPrice = (parseFloat(product.price.replace('$', '')) * 1.2).toFixed(2);
  const discount = Math.round(((parseFloat(originalPrice) - parseFloat(product.price.replace('$', ''))) / parseFloat(originalPrice)) * 100);
  
  return `${hook} 🔥

*${product.title.substring(0, 60)}${product.title.length > 60 ? '...' : ''}*

❌ ~Was: $${originalPrice}~
✅ *Now: ${product.price}* (${discount}% OFF)

⭐ *${product.rating}/5* (${product.reviews.toLocaleString()} reviews)

😱 *Why you need this:*
${product.features.slice(0, 4).map(f => `• ${f}`).join('\n')}

👇 *GET IT HERE:*
${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}

${closing}

#AmazonDeals #Sale #Shopping #Deals`;
}

export function generateTelegramMessage(product: ProductData, affiliateTag: string): string {
  const hook = getRandomElement(viralHooks);
  const closing = getRandomElement(closingLines);
  
  const originalPrice = (parseFloat(product.price.replace('$', '')) * 1.2).toFixed(2);
  const discount = Math.round(((parseFloat(originalPrice) - parseFloat(product.price.replace('$', ''))) / parseFloat(originalPrice)) * 100);
  
  return `${hook} 🚀

*${product.title}*

💰 *Price:* ${product.price} (Save ${discount}%)
⭐️ *Rating:* ${product.rating}/5 ⭐ (${product.reviews.toLocaleString()} reviews)

✨ *Top Features:*
${product.features.slice(0, 4).map(f => `🔹 ${f}`).join('\n')}

🛒 *ORDER NOW:* ${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}

${closing}

#Amazon #Deals #Shopping #Discounts #OnlineShopping`;
}

export function generateWhatsAppMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  const hook = getRandomElement(viralHooks);
  const closing = getRandomElement(closingLines);
  
  return `${hook} 🔥

*${product.title.substring(0, 60)}${product.title.length > 60 ? '...' : ''}*

❌ ~Was: ${product.originalPrice}~
✅ *Now: ${product.price}* (${product.discount}% OFF)

⭐ *${product.rating}/5* (${product.reviews.toLocaleString()} reviews)

😱 *Why you need this:*
${product.features.slice(0, 4).map(f => `• ${f}`).join('\n')}

👇 *GET IT HERE:*
${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}

${closing}

#AmazonDeals #Sale #Shopping #${product.category.charAt(0).toUpperCase() + product.category.slice(1)}`;
}

export function generateTelegramMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  const hook = getRandomElement(viralHooks);
  const closing = getRandomElement(closingLines);
  
  return `${hook} 🚀

*${product.title}*

💰 *Price:* ${product.price} (Save ${product.discount}%)
⭐️ *Rating:* ${product.rating}/5 ⭐ (${product.reviews.toLocaleString()} reviews)

✨ *Top Features:*
${product.features.slice(0, 4).map(f => `🔹 ${f}`).join('\n')}

🛒 *ORDER NOW:* ${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}

${closing}

#Amazon #Deals #${product.category.charAt(0).toUpperCase() + product.category.slice(1)} #OnlineShopping`;
}
