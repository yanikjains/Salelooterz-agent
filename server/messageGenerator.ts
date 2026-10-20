import type { ProductData } from "./scraper";
import type { DiscoveredProduct } from "./productDiscovery";

type TelegramProduct = ProductData | DiscoveredProduct;

function amount(value: string): number {
  const normalized = String(value || "").replace(/,/g, "").replace(/[^\d.]/g, "");
  const match = normalized.match(/\d+(?:\.\d{1,2})?/);
  return match ? Number(match[0]) : 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function withAffiliateTag(productUrl: string, affiliateTag: string): string {
  const url = new URL(productUrl);
  url.searchParams.set("tag", affiliateTag);
  return url.toString();
}

/**
 * Only publish listings with enough live, parseable values to support every
 * claim in the Telegram message. Discount is always calculated from prices.
 */
export function isVerifiedTelegramProduct(product: TelegramProduct): boolean {
  const deal = amount(product.price);
  const mrp = amount(product.originalPrice);
  const urlIsAmazon = /^https?:\/\/(?:www\.)?amazon\.in\//i.test(product.url);
  return Boolean(
    product.title?.trim().length >= 10 &&
    deal > 0 &&
    mrp > deal &&
    Number.isFinite(product.rating) &&
    product.rating > 0 &&
    Number.isFinite(product.reviews) &&
    product.reviews > 0 &&
    product.asin?.trim() &&
    urlIsAmazon
  );
}

export function generateTelegramMessage(
  product: TelegramProduct,
  affiliateTag: string,
  referenceDate = new Date(),
): string {
  if (!isVerifiedTelegramProduct(product)) {
    throw new Error("Cannot create a Telegram post from a listing with missing or invalid deal details.");
  }

  const deal = amount(product.price);
  const mrp = amount(product.originalPrice);
  const savings = mrp - deal;
  const discountPercent = Math.round((savings / mrp) * 100);
  const title = product.title.trim().slice(0, 180);
  const affiliateUrl = withAffiliateTag(product.url, affiliateTag);
  const features = (product.features || [])
    .map(feature => feature.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(feature => `• ${escapeHtml(feature.slice(0, 120))}`);
  const checkedAt = referenceDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const category = "category" in product ? product.category : "";
  const categoryTag = category
    ? `#${category.replace(/[^a-zA-Z0-9]/g, "")}`
    : "#AmazonDeals";

  const lines = [
    `🔥 <b>${escapeHtml(title)}</b>`,
    "",
    `MRP: <s>${formatPrice(mrp)}</s>`,
    `Deal price: <b>${formatPrice(deal)}</b>`,
    `You save: <b>${formatPrice(savings)} (${discountPercent}% off)</b>`,
    `⭐ ${product.rating.toFixed(1)}/5 · ${product.reviews.toLocaleString("en-IN")} ratings`,
  ];

  if (features.length) lines.push("", "<b>Product details</b>", ...features);
  lines.push(
    "",
    `🛒 <a href="${escapeHtml(affiliateUrl)}">View deal on Amazon</a>`,
    `Checked: ${escapeHtml(checkedAt)} IST`,
    "",
    `#AmazonIndia ${categoryTag} #Deals`,
  );
  return lines.join("\n");
}

export function generateTelegramMessageFromDiscovered(
  product: DiscoveredProduct,
  affiliateTag: string,
): string {
  const scrapedAt = new Date(product.scrapedAt);
  return generateTelegramMessage(
    product,
    affiliateTag,
    Number.isNaN(scrapedAt.getTime()) ? new Date() : scrapedAt,
  );
}
