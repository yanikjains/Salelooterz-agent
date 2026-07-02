/**
 * Quick scrape of 15 products — reports average discount.
 * Run: npx tsx scripts/scrape-preview.ts
 */
import { discoverProducts, discoverHotDeals, categories } from "../server/productDiscovery";

function parseDiscount(d: string): number {
  const m = d.match(/(\d+(\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

async function main() {
  console.log("\n🔍 Scraping 15 products across categories…\n");

  const products: Array<{ title: string; price: string; discount: string; discountPct: number; rating: number; category: string }> = [];

  const catIds = categories.map(c => c.id);
  let catIdx = 0;

  while (products.length < 15) {
    const cat = catIdx < catIds.length ? catIds[catIdx] : "hot";
    catIdx++;
    try {
      const batch = cat === "hot"
        ? await discoverHotDeals(3)
        : await discoverProducts(cat, 3);
      for (const p of batch) {
        if (products.length >= 15) break;
        const discountPct = parseDiscount((p as any).discount || "");
        products.push({
          title: p.title.slice(0, 55) + (p.title.length > 55 ? "…" : ""),
          price: p.price,
          discount: (p as any).discount || "—",
          discountPct,
          rating: p.rating,
          category: cat,
        });
      }
    } catch (e) {
      console.error(`  ⚠ Skipped ${cat}: ${e}`);
    }
    if (catIdx > catIds.length + 1) break;
    await new Promise(r => setTimeout(r, 800));
  }

  // ── Print table ──────────────────────────────────────────────
  console.log("─".repeat(90));
  console.log(`${"#".padEnd(3)} ${"Category".padEnd(12)} ${"Discount".padEnd(10)} ${"Price".padEnd(12)} ${"Rating".padEnd(8)} Title`);
  console.log("─".repeat(90));
  products.forEach((p, i) => {
    console.log(
      `${String(i + 1).padEnd(3)} ${p.category.padEnd(12)} ${p.discount.padEnd(10)} ${p.price.padEnd(12)} ${String(p.rating > 0 ? p.rating + "/5" : "—").padEnd(8)} ${p.title}`
    );
  });
  console.log("─".repeat(90));

  // ── Stats ────────────────────────────────────────────────────
  const withDiscount = products.filter(p => p.discountPct > 0);
  const avg    = withDiscount.length ? Math.round(withDiscount.reduce((s, p) => s + p.discountPct, 0) / withDiscount.length) : 0;
  const max    = withDiscount.length ? Math.max(...withDiscount.map(p => p.discountPct)) : 0;
  const min    = withDiscount.length ? Math.min(...withDiscount.map(p => p.discountPct)) : 0;
  const avgRat = products.filter(p => p.rating > 0).length
    ? (products.filter(p => p.rating > 0).reduce((s, p) => s + p.rating, 0) / products.filter(p => p.rating > 0).length).toFixed(1)
    : "—";

  console.log(`\n📊 STATS (${products.length} products, ${withDiscount.length} with discount info)`);
  console.log(`   Average discount : ${avg}%`);
  console.log(`   Highest discount : ${max}%`);
  console.log(`   Lowest  discount : ${min}%`);
  console.log(`   Average rating   : ${avgRat}/5`);
  console.log("");
}

main().catch(console.error);
