import { Link } from "wouter";
import {
  ShoppingBag, Zap, MessageCircle, Send, FileSpreadsheet,
  ShieldCheck, Target, BarChart3, Bot, Clock, ArrowRight, CheckCircle2
} from "lucide-react";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

const features = [
  {
    title: "Real-time Scraping",
    desc: "Instant data extraction from Amazon India — prices, ratings, discounts, and ASINs every batch.",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    title: "Viral Message Generation",
    desc: "AI-crafted Hindi-English hybrid marketing copy optimised for high click-through rates.",
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    title: "Telegram Auto-Post",
    desc: "Sends affiliate messages to your channel via bot token automatically — no manual effort.",
    icon: <Send className="w-5 h-5" />,
  },
  {
    title: "Google Sheets Sync",
    desc: "Every product automatically logged with message, price, rating, and affiliate link.",
    icon: <FileSpreadsheet className="w-5 h-5" />,
  },
  {
    title: "Smart Targeting",
    desc: "Category-based discovery across 7 verticals — electronics, fashion, beauty, fitness and more.",
    icon: <Target className="w-5 h-5" />,
  },
  {
    title: "AI Chat Assistant",
    desc: "Built-in AI to help you pick categories, refine copy strategy, and maximise affiliate revenue.",
    icon: <Bot className="w-5 h-5" />,
  },
  {
    title: "24 / 7 Uptime",
    desc: "The scheduler keeps running in the cloud — 15 products every 20 minutes, around the clock.",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    title: "Admin Analytics",
    desc: "Live stats dashboard — today's count, hourly rate, Telegram sent, and ASIN memory.",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    title: "Owner Exemption",
    desc: "Unlimited access for designated admin accounts — no daily caps, no payment needed.",
    icon: <ShieldCheck className="w-5 h-5" />,
  },
];

function PageNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img src={logo} alt="SaleLooterz" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-[15px] font-bold tracking-tight">SaleLooterz</span>
          </div>
        </Link>
        <Link href="/dashboard">
          <button className="btn-primary rounded-lg px-5 h-9 text-sm flex items-center gap-2">
            Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </nav>
  );
}

function PageFooter() {
  return (
    <footer className="border-t border-white/[0.05] px-5 py-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="SaleLooterz" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-sm font-semibold text-white/60">SaleLooterz AI</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-white/20">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          <Link href="/support" className="hover:text-white/50 transition-colors">Support</Link>
        </div>
        <p className="text-xs text-white/20">
          Built by <a href="mailto:salelooterz@gmail.com" className="text-white/40 hover:text-white transition-colors">Yanik Jain</a>
        </p>
      </div>
    </footer>
  );
}

export { PageNav, PageFooter };

export default function Features() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <PageNav />

      <main className="max-w-5xl mx-auto px-5 pt-32 pb-24">
        {/* Header */}
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500/70 mb-3">All Features</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            The complete affiliate<br />
            <span className="text-white/25">automation stack.</span>
          </h1>
          <p className="text-sm text-white/35 max-w-lg leading-relaxed">
            Everything you need to run a hands-free Amazon India affiliate channel —
            from scraping to posting to analytics.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16">
          {features.map((f, i) => (
            <div key={i} className="card-border rounded-xl p-5 bg-white/[0.015] group">
              <div className="w-9 h-9 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-4 text-white/30 group-hover:text-green-400 group-hover:border-green-500/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-white/35 leading-relaxed mb-4">{f.desc}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-green-500/60">
                <CheckCircle2 className="w-3 h-3" /> Built in
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="relative border border-white/[0.06] rounded-2xl p-10 text-center overflow-hidden">
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(34,197,94,0.05), transparent)' }} />
          <p className="text-xs font-bold uppercase tracking-widest text-green-500/60 mb-3 relative z-10">Get Started Today</p>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 relative z-10">
            Your bot is waiting.
          </h2>
          <p className="text-sm text-white/30 max-w-sm mx-auto mb-7 relative z-10">
            Set your affiliate tag, connect Telegram, and SaleLooterz handles the rest.
          </p>
          <Link href="/dashboard">
            <button className="btn-primary rounded-xl px-8 h-11 text-sm font-bold inline-flex items-center gap-2 relative z-10 shadow-lg shadow-green-900/30">
              <Zap className="w-4 h-4" /> Open Dashboard
            </button>
          </Link>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}
