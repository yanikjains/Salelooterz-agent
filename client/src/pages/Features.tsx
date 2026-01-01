import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  ShoppingBag, Zap, MessageCircle, Send, FileSpreadsheet, 
  Sparkles, ShieldCheck, Target, BarChart3, Globe, 
  ArrowRight, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Real-time Scraping",
    description: "Instant data extraction from Amazon India with 99.9% success rate.",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/10"
  },
  {
    title: "Viral Message Generation",
    description: "AI-powered Hindi-English hybrid messages optimized for high conversion.",
    icon: MessageCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  {
    title: "One-Click Multi-Posting",
    description: "Send all scraped products to WhatsApp & Telegram simultaneously.",
    icon: Send,
    color: "text-blue-400",
    bg: "bg-blue-400/10"
  },
  {
    title: "Google Sheets Sync",
    description: "Automatically log all campaigns and product details for tracking.",
    icon: FileSpreadsheet,
    color: "text-green-400",
    bg: "bg-green-400/10"
  },
  {
    title: "Smart Targeting",
    description: "Category-based discovery focusing on high-demand Indian products.",
    icon: Target,
    color: "text-purple-400",
    bg: "bg-purple-400/10"
  },
  {
    title: "Owner Exemption",
    description: "Special access for administrators with unlimited usage capabilities.",
    icon: ShieldCheck,
    color: "text-red-400",
    bg: "bg-red-400/10"
  }
];

export default function Features() {
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
        <Link href="/login">
          <Button variant="outline" className="rounded-full px-6 bg-white/5 border-white/10 text-white hover:bg-white/10 h-10">
            Get Started
          </Button>
        </Link>
      </header>

      <main className="container max-w-6xl px-6 pt-12 pb-32 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Advanced Capabilities</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-8"
          >
            Everything you need to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Scale your Affiliate Business</span>
          </motion.h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-purple-500/30 transition-colors group"
            >
              <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed mb-6">{feature.description}</p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready to use</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-32 p-12 rounded-[2rem] bg-gradient-to-br from-purple-600 to-indigo-700 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-black/20 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">Start Earning Today</h2>
          <p className="text-purple-100 text-lg mb-10 max-w-xl mx-auto relative z-10">
            Join thousands of smart affiliate marketers automating their workflow in India.
          </p>
          <Link href="/signup">
            <Button size="lg" className="rounded-full px-12 bg-white text-purple-700 hover:bg-purple-50 font-bold h-14 relative z-10">
              Create Free Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </main>

      <footer className="w-full max-w-7xl px-6 py-12 border-t border-white/5 relative z-10 flex justify-center text-sm text-gray-500">
        <span>© 2026 SmartBot India • All features included</span>
      </footer>
    </div>
  );
}
