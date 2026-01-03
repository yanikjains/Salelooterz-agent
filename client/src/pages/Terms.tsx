import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShoppingBag, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen w-full bg-[#030303] flex flex-col items-center selection:bg-purple-500/30 selection:text-purple-200">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.08)_0%,transparent_50%)] pointer-events-none" />
      
      <header className="w-full max-w-7xl px-6 py-8 flex justify-between items-center relative z-10">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SmartBot</span>
          </div>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </header>

      <main className="container max-w-4xl px-6 pt-12 pb-32 relative z-10 text-gray-400 leading-relaxed">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <FileText className="w-16 h-16 text-indigo-500 mb-6" />
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4">Terms of Service</h1>
          <p className="text-lg">Effective Date: January 01, 2026</p>
        </motion.div>

        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By using SmartBot, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">2. Usage Limits</h2>
            <p>Users are provided with a 3-day free trial. Lifetime access requires a one-time payment. Scraping limits are set at 50 products per day for all standard paid accounts.</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">3. Prohibited Activities</h2>
            <p>You may not use SmartBot for any illegal purposes or to violate Amazon's Operating Agreement. Automated scraping must comply with the rate limits enforced by our system.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
