import { Link } from "wouter";
import { ArrowRight, Zap, Send, BarChart3, TrendingUp, Bot, Shield, Clock, ShoppingBag } from "lucide-react";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

const features = [
  {
    icon: <ShoppingBag className="w-5 h-5" />,
    title: "Live Product Scraping",
    desc: "Pulls real Amazon India deals every batch — live prices, ratings, and discount percentages.",
  },
  {
    icon: <Send className="w-5 h-5" />,
    title: "Telegram Auto-Post",
    desc: "Sends affiliate messages to your channel automatically via bot token. Zero manual effort.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Viral Hindi-English Copy",
    desc: "AI-crafted hooks in the hybrid format proven to convert for Indian audiences.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Google Sheets Logging",
    desc: "Every product automatically logged with message, price, and affiliate link.",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: "AI Strategy Assistant",
    desc: "Built-in AI chat to help optimise categories, copy, and affiliate revenue.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Runs 24 / 7",
    desc: "Set once and walk away. The bot keeps posting even when the browser is closed.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ─── Sticky Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="SaleLooterz" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-[15px] font-bold tracking-tight">SaleLooterz</span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7 text-sm text-white/40">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#stats" className="hover:text-white transition-colors">Stats</a>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>

          {/* CTA */}
          <Link href="/dashboard">
            <button className="btn-primary rounded-lg px-5 h-9 text-sm flex items-center gap-2">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-28 px-5">
        {/* Background glow */}
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        {/* Subtle horizontal accent line */}
        <div className="accent-line absolute top-32 left-0 right-0 h-px opacity-30 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex mb-7">
            <span className="tag">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Fully Automated · Amazon India
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.8rem,8vw,6rem)] font-black leading-[0.93] tracking-tight mb-7">
            AUTO-POST{" "}
            <span className="gradient-text">1,000+</span>
            <br />
            AFFILIATE DEALS
            <br />
            EVERY DAY
          </h1>

          {/* Sub */}
          <p className="text-[1.05rem] text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
            SaleLooterz scrapes real Amazon India products, writes viral Hindi-English
            marketing copy, and auto-sends it to your Telegram channel —
            <span className="text-white/70"> 45 messages per hour</span>, hands-free.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/dashboard">
              <button className="btn-primary rounded-xl px-8 h-12 text-sm font-bold flex items-center gap-2.5 shadow-lg shadow-green-900/30">
                <Zap className="w-4 h-4" />
                Open Dashboard
              </button>
            </Link>
            <a href="#features">
              <button className="btn-ghost rounded-xl px-7 h-12 text-sm flex items-center gap-2">
                See Features <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────────── */}
      <section id="stats" className="py-16 px-5 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "~1,080", label: "Messages per day", note: "at 45/hour" },
              { value: "7", label: "Product categories", note: "hot deals included" },
              { value: "20 min", label: "Batch interval", note: "15 products/batch" },
            ].map((s, i) => (
              <div key={i} className="stat-card text-center">
                <p className="text-3xl sm:text-4xl font-black gradient-text number-highlight mb-1">{s.value}</p>
                <p className="text-xs font-semibold text-white/70 mb-0.5">{s.label}</p>
                <p className="text-[11px] text-white/25">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Dashboard Mockup ───────────────────────────────────── */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="mockup-card p-px overflow-hidden">
            {/* Fake browser chrome */}
            <div className="bg-white/[0.04] px-4 py-3 flex items-center gap-2 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-5 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center px-3">
                  <span className="text-[11px] text-white/20">salelooterz.repl.co/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="p-6 bg-black">
              {/* Header row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <img src={logo} alt="SaleLooterz" className="w-7 h-7 rounded-lg object-cover" />
                  <span className="text-sm font-bold">SaleLooterz AI</span>
                  <span className="text-[10px] text-white/30">Admin · Amazon India</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-md border border-green-500/30 bg-green-500/10 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Running
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  { label: "Today", val: "1,080" },
                  { label: "This Hour", val: "45" },
                  { label: "Telegram", val: "2,340" },
                  { label: "Memory", val: "42" },
                ].map((s, i) => (
                  <div key={i} className="border border-white/[0.06] rounded-lg p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Live feed cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "boAt Airdopes 141 TWS", price: "₹899", tag: "-78%", rating: "4.1" },
                  { name: "Xiaomi Smart Band 8 Active", price: "₹2,499", tag: "-42%", rating: "4.4" },
                ].map((p, i) => (
                  <div key={i} className="border border-white/[0.05] rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <p className="text-[11px] font-medium text-white line-clamp-1 flex-1 mr-2">{p.name}</p>
                      <span className="text-[10px] text-green-400 border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 rounded shrink-0">{p.tag}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{p.price}</span>
                      <span className="text-[10px] text-white/30">★ {p.rating}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
                      <div className="h-full rounded-full bg-green-500/40" style={{ width: `${60 + i * 15}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 px-5 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500/70 mb-3">Everything Built In</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              The complete affiliate<br />
              <span className="text-white/30">automation stack.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f, i) => (
              <div key={i} className="card-border rounded-xl p-5 bg-white/[0.015] group">
                <div className="w-9 h-9 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-4 text-white/40 group-hover:text-green-400 group-hover:border-green-500/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,197,94,0.06), transparent)' }} />
            <div className="relative border border-white/[0.06] rounded-2xl p-12">
              <p className="text-xs font-bold uppercase tracking-widest text-green-500/60 mb-4">Start Today</p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5">
                Your affiliate bot<br />
                <span className="gradient-text">awaits.</span>
              </h2>
              <p className="text-sm text-white/35 max-w-sm mx-auto mb-8 leading-relaxed">
                Set your affiliate tag, connect Telegram, and let SaleLooterz handle the rest — 24 hours a day.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/dashboard">
                  <button className="btn-primary rounded-xl px-8 h-12 text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/30">
                    <Zap className="w-4 h-4" />
                    Open Dashboard
                  </button>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
                {[
                  { icon: <Shield className="w-3 h-3" />, text: "No credit card" },
                  { icon: <Clock className="w-3 h-3" />, text: "Runs 24/7" },
                  { icon: <Zap className="w-3 h-3" />, text: "Instant setup" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-white/25">
                    <span className="text-green-500/40">{b.icon}</span>
                    {b.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] px-5 py-7">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SaleLooterz" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-sm font-semibold text-white/60">SaleLooterz AI</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/20">
            <Link href="/features" className="hover:text-white/50 transition-colors">Features</Link>
            <Link href="/support" className="hover:text-white/50 transition-colors">Support</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          </div>
          <p className="text-xs text-white/20">
            Built by{" "}
            <a href="mailto:salelooterz@gmail.com" className="text-white/40 hover:text-white transition-colors">
              Yanik Jain
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
