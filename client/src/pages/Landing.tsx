import { Link } from "wouter";
import { ShoppingBag, Zap, Send, BarChart3, TrendingUp, ArrowRight, Bot, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: <ShoppingBag className="w-4 h-4" />, title: "Real Amazon Products", desc: "Scrapes live deals from Amazon India — real prices, ratings, and discount data every batch." },
  { icon: <Send className="w-4 h-4" />, title: "Telegram Auto-Post", desc: "Instant auto-send to your Telegram channel using a bot token — zero manual effort." },
  { icon: <TrendingUp className="w-4 h-4" />, title: "Hindi-English Messages", desc: "Viral hooks in the hybrid format that converts best for Indian audiences." },
  { icon: <BarChart3 className="w-4 h-4" />, title: "Google Sheets Export", desc: "Every product logged automatically to your Google Sheet for tracking and analytics." },
  { icon: <Bot className="w-4 h-4" />, title: "AI Assistant", desc: "Built-in AI to help you optimize categories, message strategy, and affiliate revenue." },
  { icon: <Clock className="w-4 h-4" />, title: "Runs 24/7", desc: "Fully automated — keeps posting even when you close the browser. Set it and forget it." },
];

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-black" />
          </div>
          <span className="font-semibold text-white">SaleLooterz AI</span>
        </div>
        <Link href="/dashboard">
          <Button className="bg-white text-black hover:bg-white/90 font-semibold rounded-lg px-4 h-9 text-sm border-0">
            Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 text-white/60 text-xs font-medium mb-8">
          Fully Automated · Amazon India · Real Products
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight mb-6">
          Auto-Send 1,000+<br />Affiliate Messages<br />Every Day
        </h1>

        <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
          SaleLooterz AI scrapes real Amazon India deals, generates viral Hindi-English
          marketing messages, and automatically posts them to your Telegram —
          45 messages per hour, hands-free.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/dashboard">
            <Button size="lg" className="h-12 px-8 text-sm font-semibold bg-white text-black hover:bg-white/90 border-0 rounded-lg">
              <Zap className="w-4 h-4 mr-2" />
              Open Dashboard
            </Button>
          </Link>
          <Link href="/features">
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm rounded-lg border-white/15 text-white/70 hover:text-white hover:border-white/30 bg-transparent">
              See How It Works <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 divide-x divide-white/10 border border-white/10 rounded-xl overflow-hidden max-w-md w-full">
          {[
            { value: "~1,080", label: "Messages/day" },
            { value: "45", label: "Per hour" },
            { value: "7", label: "Categories" },
          ].map((s, i) => (
            <div key={i} className="text-center px-4 py-5 bg-white/[0.02]">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 pb-6 px-6 flex-wrap">
        {[
          { icon: <Shield className="w-3 h-3" />, text: "No data stored" },
          { icon: <Clock className="w-3 h-3" />, text: "Runs 24/7" },
          { icon: <Zap className="w-3 h-3" />, text: "15 products/batch" },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-white/30">
            {b.icon}
            {b.text}
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full border-t border-white/10">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Everything Built In</p>
          <h2 className="text-3xl font-black text-white">Fully automated for you</h2>
          <p className="text-white/40 mt-3 max-w-lg mx-auto text-sm">Every piece of the affiliate pipeline, handled automatically from scraping to posting.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div key={i} className="p-5 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <div className="w-8 h-8 rounded-md border border-white/10 flex items-center justify-center mb-4 text-white/60">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/dashboard">
            <Button size="lg" className="h-12 px-10 text-sm font-semibold bg-white text-black hover:bg-white/90 border-0 rounded-lg">
              <Zap className="w-4 h-4 mr-2" />
              Start Automating Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-5 text-center text-xs text-white/30">
        SaleLooterz AI · Built by <a href="mailto:salelooterz@gmail.com" className="text-white/50 hover:text-white transition-colors">Yanik Jain</a>
      </footer>
    </div>
  );
}
