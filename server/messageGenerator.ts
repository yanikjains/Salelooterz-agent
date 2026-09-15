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
  electronics: "📱 Premium Electronics Deal",
  mobile:      "📲 Smartphone Exclusive Deal",
  home:        "🏠 Premium Home Appliance Deal",
  fashion:     "👗 Premium Fashion Deal",
  beauty:      "💄 Luxury Beauty Deal",
  fitness:     "💪 Premium Fitness Deal",
  kitchen:     "🍳 Premium Kitchen Deal",
  deals:       "🔥 Exclusive Hot Deal",
  boys:        "🎮 Boys' Exclusive Deal",
  girls:       "💅 Girls' Exclusive Deal",
  men:         "👔 Men's Premium Deal",
  women:       "👗 Women's Exclusive Deal",
  audio:       "🎧 Audio & Headphones Deal",
  computers:   "💻 Computers & Accessories Deal",
  gaming:      "🎮 Gaming Deal",
  cameras:     "📷 Camera & Photography Deal",
  televisions: "📺 Television Deal",
  tablets:     "📱 Tablet Deal",
  smartHome:   "🏡 Smart Home Deal",
  power:       "🔋 Power Backup Deal",
  personalCare:"🧴 Personal Care Deal",
  hairCare:    "💇 Hair Care Deal",
  perfumes:    "🌸 Perfume & Fragrance Deal",
  footwear:    "👟 Branded Footwear Deal",
  luggage:     "🧳 Luggage & Travel Bag Deal",
  watches:     "⌚ Branded Watch Deal",
  baby:        "👶 Baby Products Deal",
  toys:        "🧸 Toys & Learning Deal",
  office:      "🪑 Office Products Deal",
  automotive:  "🚗 Automotive Deal",
  travel:      "🏕️ Travel & Camping Deal",
};

const premiumClosings = [
  "💎 Ye deal bar bar nahi aata — aaj hi grab karo!",
  "🏆 Premium product, genuine discount — miss mat karo!",
  "⚡ Limited stock hai — stock khatam hone se pehle order karo!",
  "✅ Live Amazon listing checked — price details verified!",
  "🔥 Bahut log already order kar chuke hain — jaldi karo!",
  "💰 Is price mein ye quality rarely milti hai — loot lo!",
  "⭐ Best-in-class product, now at a price you can't ignore!",
  "🚀 Amazon ke top sellers mein se ek — galti mat karo!",
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

function parsePriceNum(price: string): number {
  return parseInt(price.replace(/[₹,\s]/g, '').replace(/[^0-9]/g, '')) || 0;
}

/** Returns true if product MRP (original price) is ≥ ₹3,000 — no cheap products on WhatsApp */
export function isPremiumDeal(price: string, discount: string, originalPrice?: string): boolean {
  const mrp = originalPrice ? parsePriceNum(originalPrice) : parsePriceNum(price);
  return mrp > 2000;
}

/**
 * WhatsApp quality gate:
 * - MRP must be strictly above ₹2,000
 * - savings must be at least 60%, calculated from the verified prices
 * - rating and review volume must indicate a proven/popular product
 */
export function isAmazingWhatsAppDeal(product: ProductData | DiscoveredProduct): boolean {
  const dealPrice = parsePriceNum(product.price);
  const mrp = parsePriceNum((product as any).originalPrice || "");
  const savingsPct = mrp > 0 ? ((mrp - dealPrice) / mrp) * 100 : 0;
  return (
    dealPrice > 0 &&
    mrp > 2000 &&
    savingsPct >= 60 &&
    product.rating >= 4 &&
    product.reviews >= 100
  );
}

export function generatePersonalizedWhatsAppMessage(
  product: ProductData | DiscoveredProduct,
  affiliateTag: string,
  category?: string,
  referenceDate = new Date()
): string {
  const closing = getRandomElement(premiumClosings);
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;
  const cat = category || ('category' in product ? (product as DiscoveredProduct).category : '');
  const categoryLabel = categoryLabels[cat] || "🛍️ Exclusive Deal";
  const today = referenceDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const title = product.title.length > 90 ? product.title.substring(0, 90) + '…' : product.title;

  const dealPrice    = parsePriceNum(product.price);
  const origPrice    = parsePriceNum((product as any).originalPrice || '');
  const savingsAmt   = origPrice > dealPrice ? origPrice - dealPrice : 0;

  let msg = `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🗓️ *${today}*\n`;
  msg += `${categoryLabel}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*${title}*\n\n`;

  // Price block
  if (origPrice > dealPrice && origPrice > 0) {
    msg += `💰 *Deal Price: ${formatIndianPrice(product.price)}*\n`;
    msg += `~~MRP: ${formatIndianPrice((product as any).originalPrice)}~~\n`;
    if (savingsAmt > 0) msg += `✅ *Aap bachate ho: ₹${savingsAmt.toLocaleString('en-IN')}`;
    if (product.discount) msg += ` (${product.discount})`;
    msg += `*\n`;
  } else {
    msg += `💰 *${formatIndianPrice(product.price)}*`;
    if (product.discount) msg += `  ✅ *(${product.discount})*`;
    msg += `\n`;
  }

  if (product.rating > 0) {
    msg += `⭐ ${product.rating}/5`;
    if (product.reviews > 0) msg += ` · ${product.reviews.toLocaleString('en-IN')} reviews`;
    msg += `\n`;
  }

  if (product.features && product.features.length > 0) {
    msg += `\n🔑 *Why this product:*\n`;
    msg += product.features.slice(0, 3)
      .map(f => `  › ${f.substring(0, 70)}${f.length > 70 ? '…' : ''}`)
      .join('\n');
    msg += `\n`;
  }

  msg += `\n🛒 *Abhi order karo:*\n${affiliateUrl}\n\n`;
  msg += `${closing}\n\n`;
  msg += `🕐 *Deal Time: ${referenceDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).toUpperCase()} IST*`;
  return msg;
}

export function generateTelegramMessage(product: ProductData | DiscoveredProduct, affiliateTag: string): string {
  const affiliateUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}tag=${affiliateTag}`;

  const title = product.title.length > 80 ? product.title.substring(0, 80) + '...' : product.title;

  let message = `${title}\n\n`;

  const origPrice = (product as any).originalPrice || '';
  if (origPrice) {
    message += `❌ MRP: ${formatIndianPrice(origPrice)}\n`;
  }

  message += `✅ Deal Price: ${formatIndianPrice(product.price)}`;
  if (product.discount) {
    message += ` (${product.discount})`;
  }
  message += `\n`;

  if (product.rating > 0) {
    message += `\n⭐ Rating: ${product.rating}/5`;
    if (product.reviews > 0) {
      message += ` (${product.reviews.toLocaleString('en-IN')} reviews)`;
    }
    message += `\n`;
  }

  message += `\n🛒 BUY NOW:\n${affiliateUrl}\n\n`;
  message += `⚡ Don't miss this deal!\n\n`;
  message += `#AmazonIndia #Deals #Shopping #Loot`;

  return message;
}

export function generateWhatsAppMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  return generateWhatsAppMessage(product, affiliateTag);
}

export function generateTelegramMessageFromDiscovered(product: DiscoveredProduct, affiliateTag: string): string {
  return generateTelegramMessage(product, affiliateTag);
}
