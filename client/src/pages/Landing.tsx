import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShoppingBag, Zap, Send, BarChart3, MessageCircle, TrendingUp, ArrowRight, Star, Bot, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">SaleLooterz AI</span>
            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">Amazon India Affiliate Bot</span>
          </div>
        </div>
        <Link href="/dashboard">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-amber-500/20">
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Fully Automated · Amazon India · Real Products
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight mb-6">
            Auto-Send <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">1,000+</span><br />
            Affiliate Messages<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">Every Day</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            SaleLooterz AI scrapes real Amazon India deals, generates viral Hindi-English marketing messages,
            and automatically posts them to your WhatsApp channel and Telegram — 45 messages per hour, hands-free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-10 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-2xl shadow-amber-500/30">
                <Zap className="w-5 h-5 mr-2" />
                Open Dashboard
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
          {[
            { value: "~1,080", label: "Messages/day" },
            { value: "45", label: "Per hour" },
            { value: "7", label: "Categories" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-black text-amber-400">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Features ── */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Everything automated for you</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: <ShoppingBag className="w-6 h-6" />, color: "text-amber-400 bg-amber-500/10", title: "Real Amazon Products", desc: "Scrapes live deals from Amazon India — real prices, ratings, and discount data every batch." },
            { icon: <MessageCircle className="w-6 h-6" />, color: "text-green-400 bg-green-500/10", title: "WhatsApp Auto-Post", desc: "Connects via a dedicated bot number and posts messages to your channel automatically." },
            { icon: <Send className="w-6 h-6" />, color: "text-sky-400 bg-sky-500/10", title: "Telegram Auto-Post", desc: "Instant auto-send to your Telegram channel using a bot token — zero manual effort." },
            { icon: <TrendingUp className="w-6 h-6" />, color: "text-purple-400 bg-purple-500/10", title: "Hindi-English Messages", desc: "Viral hooks in the hybrid format that converts best for Indian audiences." },
            { icon: <BarChart3 className="w-6 h-6" />, color: "text-emerald-400 bg-emerald-500/10", title: "Google Sheets Export", desc: "Every product logged automatically to your Google Sheet for tracking and analytics." },
            { icon: <Bot className="w-6 h-6" />, color: "text-rose-400 bg-rose-500/10", title: "AI Assistant", desc: "Built-in AI to help you optimize categories, message strategy, and affiliate revenue." },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.07 }} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-colors">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-12 text-base font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-2xl shadow-emerald-500/20">
              <Zap className="w-5 h-5 mr-2" />
              Start Automating Now
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-6 py-5 text-center text-xs text-muted-foreground">
        SaleLooterz AI · Built by Yanik Jain ·{" "}
        <a href="mailto:salelooterz@gmail.com" className="text-amber-400 hover:text-amber-300">salelooterz@gmail.com</a>
      </footer>
    </div>
  );
}
