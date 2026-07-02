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

const categoryLabels: Record<string, string> = {
  electronics: "📱 Electronics Pick of the Day",
  mobile:      "📲 Mobile Deal of the Day",
  home:        "🏠 Home Essentials Deal",
  fashion:     "👗 Fashion Deal of the Day",
  beauty:      "💄 Beauty & Skincare Pick",
  fitness:     "💪 Fitness Deal of the Day",
  kitchen:     "🍳 Kitchen Deal of the Day",
  deals:       "🔥 Hot Deal of the Day",
};

const personalClosings = [
  "⚡ Sirf limited stock — jaldi lelo!",
  "⏰ Ye deal zyada time nahi chalegi!",
  "🏃‍♂️ Bahut log dekh rahe hain isko!",
  "💨 Superfast delivery bhi milegi!",
  "🎯 Personally recommend kar raha hoon!",
  "🔥 Maine khud check kiya — genuine deal hai!",
  "⭐ Top rated — apne ghar le aao aaj!",
];

function getTodayDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function generateWhatsAppMessage(product: ProductData | DiscoveredProduct, affiliateTag: string): string {
  const hook = getRandomElement(viralHooksHindi);
  const closing = getRandomElement(closingLinesHindi);
  
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;
  
  const title = product.title.length > 80 ? product.title.substring(0, 80) + '...' : product.title;
  
  let message = `${hook} 🔥

*${title}*

`;

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

${closing}`;

  return message;
}

export function generatePersonalizedWhatsAppMessage(
  product: ProductData | DiscoveredProduct,
  affiliateTag: string,
  category?: string
): string {
  const closing = getRandomElement(personalClosings);
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;
  const cat = category || ('category' in product ? (product as DiscoveredProduct).category : '');
  const categoryLabel = categoryLabels[cat] || "🛍️ Deal of the Day";
  const today = getTodayDate();
  const title = product.title.length > 85 ? product.title.substring(0, 85) + '...' : product.title;

  let msg = `🗓️ *${today}*\n${categoryLabel}\n\n`;
  msg += `*${title}*\n\n`;
  msg += `💸 *${formatIndianPrice(product.price)}*`;
  if (product.discount) msg += `  _(${product.discount})_`;
  msg += `\n`;

  if (product.rating > 0) {
    msg += `⭐ ${product.rating}/5`;
    if (product.reviews > 0) msg += ` · ${product.reviews.toLocaleString('en-IN')} reviews`;
    msg += `\n`;
  }

  if (product.features && product.features.length > 0) {
    msg += `\n✨ *Why it's worth it:*\n`;
    msg += product.features.slice(0, 3)
      .map(f => `• ${f.substring(0, 65)}${f.length > 65 ? '…' : ''}`)
      .join('\n');
    msg += `\n`;
  }

  msg += `\n🛒 *Order karo:*\n${affiliateUrl}\n\n${closing}`;
  return msg;
}

function getDealTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

export function generateTelegramMessage(product: ProductData | DiscoveredProduct, affiliateTag: string): string {
  const hook = getRandomElement(viralHooksHindi);
  const closing = getRandomElement(closingLinesHindi);
  
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;
  
  let message = `${hook} 🚀

**${product.title}**

`;

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

#Amazon #India #Deals #Shopping #OnlineShopping

Deal time ${getDealTime()} 🤘`;

  return message;
}

export function generateWhatsAppMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  return generateWhatsAppMessage(product, affiliateTag);
}

export function generateTelegramMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  return generateTelegramMessage(product, affiliateTag);
}
