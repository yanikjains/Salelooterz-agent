import { Link } from "wouter";
import { Mail, ArrowLeft } from "lucide-react";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

const faqs = [
  {
    q: "How many products can be scraped per day?",
    a: "The bot scrapes ~1,080 products per day (15 products every 20 minutes, 45 per hour). The admin controls the scheduler directly from the dashboard.",
  },
  {
    q: "Does it work for Amazon Global?",
    a: "SaleLooterz is optimised specifically for Amazon India (.in) affiliate marketers and uses INR pricing in all generated messages.",
  },
  {
    q: "How do I connect my Telegram channel?",
    a: "Go to Dashboard → Settings. Create a bot with @BotFather, make it admin of your channel, paste the token and channel ID, then click Test Telegram.",
  },
  {
    q: "What is the Admin PIN?",
    a: "The PIN protects your dashboard. The default is set via the ADMIN_PIN environment variable. Contact Yanik if you've forgotten it.",
  },
  {
    q: "Can I track which products were posted?",
    a: "Yes — enter your Google Sheet ID in Settings and every batch will automatically log products with price, rating, message, and affiliate link.",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <img src={logo} alt="SaleLooterz" className="w-9 h-9 rounded-xl object-cover" />
              <span className="text-[15px] font-bold tracking-tight">SaleLooterz</span>
            </div>
          </Link>
          <Link href="/">
            <button className="btn-ghost rounded-lg px-4 h-9 text-sm inline-flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 pt-32 pb-24">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500/70 mb-3">Help & Support</p>
          <h1 className="text-4xl font-black tracking-tight mb-3">Customer Support</h1>
          <p className="text-sm text-white/35">We're here to help you automate your affiliate success.</p>
        </div>

        {/* Email card */}
        <div className="card-border rounded-xl p-6 bg-white/[0.015] mb-6">
          <div className="w-10 h-10 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-4 text-white/30">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white mb-1.5">Email Support</h3>
          <p className="text-xs text-white/35 mb-4">For general enquiries and technical issues.</p>
          <a href="mailto:salelooterz@gmail.com" className="text-green-400 text-sm font-semibold hover:text-green-300 transition-colors">
            salelooterz@gmail.com
          </a>
        </div>

        {/* FAQ */}
        <div className="card-border rounded-xl p-6 bg-white/[0.015]">
          <h2 className="font-bold text-white mb-6 text-sm">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <div key={i} className={i < faqs.length - 1 ? "pb-5 border-b border-white/[0.05]" : ""}>
                <h4 className="text-sm font-semibold text-white mb-1.5">{faq.q}</h4>
                <p className="text-xs text-white/35 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] px-5 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SaleLooterz" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-sm font-semibold text-white/60">SaleLooterz AI</span>
          </div>
          <p className="text-xs text-white/20">Built by <a href="mailto:salelooterz@gmail.com" className="text-white/40 hover:text-white transition-colors">Yanik Jain</a></p>
        </div>
      </footer>
    </div>
  );
}
