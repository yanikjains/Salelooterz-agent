import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShoppingBag, Zap, Send, BarChart3, MessageCircle, TrendingUp, ArrowRight, Bot, Smartphone, Sparkles, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: <ShoppingBag className="w-5 h-5" />, color: "from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400", glow: "group-hover:shadow-amber-500/20", title: "Real Amazon Products", desc: "Scrapes live deals from Amazon India — real prices, ratings, and discount data every batch." },
  { icon: <MessageCircle className="w-5 h-5" />, color: "from-green-500/20 to-emerald-500/10 border-green-500/20 text-green-400", glow: "group-hover:shadow-green-500/20", title: "WhatsApp Auto-Post", desc: "Connects via Baileys and posts messages to your channel automatically, hands-free." },
  { icon: <Send className="w-5 h-5" />, color: "from-sky-500/20 to-blue-500/10 border-sky-500/20 text-sky-400", glow: "group-hover:shadow-sky-500/20", title: "Telegram Auto-Post", desc: "Instant auto-send to your Telegram channel using a bot token — zero manual effort." },
  { icon: <TrendingUp className="w-5 h-5" />, color: "from-purple-500/20 to-violet-500/10 border-purple-500/20 text-purple-400", glow: "group-hover:shadow-purple-500/20", title: "Hindi-English Messages", desc: "Viral hooks in the hybrid format that converts best for Indian audiences." },
  { icon: <BarChart3 className="w-5 h-5" />, color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400", glow: "group-hover:shadow-emerald-500/20", title: "Google Sheets Export", desc: "Every product logged automatically to your Google Sheet for tracking and analytics." },
  { icon: <Bot className="w-5 h-5" />, color: "from-rose-500/20 to-pink-500/10 border-rose-500/20 text-rose-400", glow: "group-hover:shadow-rose-500/20", title: "AI Assistant", desc: "Built-in AI to help you optimize categories, message strategy, and affiliate revenue." },
];

const stats = [
  { value: "~1,080", label: "Messages/day", color: "text-amber-400 stat-glow-amber" },
  { value: "45", label: "Per hour", color: "text-purple-400 stat-glow-purple" },
  { value: "7", label: "Categories", color: "text-emerald-400 stat-glow-green" },
];

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden">

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="orb absolute top-[-15%] left-[20%] w-[500px] h-[500px] bg-amber-500/8" style={{ animationDelay: '0s' }} />
        <div className="orb absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-purple-600/8" style={{ animationDelay: '2s' }} />
        <div className="orb absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] bg-emerald-500/6" style={{ animationDelay: '4s' }} />
      </div>

      {/* ── Nav ── */}
      <nav className="relative flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg glow-amber">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">SaleLooterz AI</span>
            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">Amazon India Affiliate Bot</span>
          </div>
        </div>
        <Link href="/dashboard">
          <Button className="btn-shine bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold shadow-lg shadow-amber-500/25 border-0 rounded-xl px-5">
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>

          {/* Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium mb-10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              Fully Automated · Amazon India · Real Products
            </div>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[0.92] mb-8">
            Auto-Send{" "}
            <span className="gradient-text">1,000+</span>
            <br />
            Affiliate Messages
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Every Day</span>
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            SaleLooterz AI scrapes real Amazon India deals, generates viral Hindi-English
            marketing messages, and automatically posts them to your WhatsApp &amp; Telegram —
            <span className="text-white font-semibold"> 45 messages per hour</span>, hands-free.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="btn-shine h-14 px-10 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-2xl shadow-amber-500/30 border-0 rounded-2xl glow-amber">
                <Zap className="w-5 h-5 mr-2" />
                Open Dashboard
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-2xl border-white/10 hover:border-white/20 hover:bg-white/5 text-white/80 hover:text-white backdrop-blur-sm">
                See How It Works <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20 w-full max-w-lg mx-auto"
        >
          <div className="glass-card rounded-3xl p-6">
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              {stats.map((s, i) => (
                <div key={i} className="text-center px-4">
                  <p className={`text-3xl sm:text-4xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Trust badges ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-6 pb-4 px-6 flex-wrap"
      >
        {[
          { icon: <Shield className="w-3.5 h-3.5" />, text: "No data stored" },
          { icon: <Clock className="w-3.5 h-3.5" />, text: "Runs 24/7" },
          { icon: <Zap className="w-3.5 h-3.5" />, text: "15 products/batch" },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-amber-400/60">{b.icon}</span>
            {b.text}
          </div>
        ))}
      </motion.div>

      {/* ── Features ── */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative px-6 py-20 max-w-6xl mx-auto w-full"
      >
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-3">Everything Built In</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Fully automated for you</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Every piece of the affiliate pipeline, handled automatically from scraping to posting.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.08 }}
              className={`group relative p-6 rounded-2xl border bg-gradient-to-br ${f.color} card-hover cursor-default`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white/10 ${f.color.split(' ').find(c => c.startsWith('text-'))}`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/dashboard">
            <Button size="lg" className="btn-shine h-14 px-12 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-2xl shadow-emerald-500/20 border-0 rounded-2xl glow-green">
              <Zap className="w-5 h-5 mr-2" />
              Start Automating Now
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-4">No setup fees · Lifetime access · Cancel anytime</p>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-6 py-6 text-center text-xs text-muted-foreground">
        <p>SaleLooterz AI · Built with ❤️ by <span className="text-amber-400">Yanik Jain</span> · <a href="mailto:salelooterz@gmail.com" className="text-amber-400 hover:text-amber-300 transition-colors">salelooterz@gmail.com</a></p>
      </footer>
    </div>
  );
}
