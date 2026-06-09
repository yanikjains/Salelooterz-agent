import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using SaleLooterz, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, do not use the service.",
  },
  {
    title: "2. Permitted Use",
    body: "SaleLooterz is intended for use by Amazon India affiliate marketers to automate product discovery and message distribution. You must hold a valid Amazon Associates account.",
  },
  {
    title: "3. Prohibited Activities",
    body: "You may not use SaleLooterz for any illegal purpose or to violate Amazon's Affiliate Program Operating Agreement. Scraping must operate within the rate limits enforced by our scheduler.",
  },
  {
    title: "4. Disclaimer",
    body: "SaleLooterz is provided 'as is' without warranty of any kind. Affiliate earnings depend on your audience and content quality — we make no income guarantees.",
  },
  {
    title: "5. Contact",
    body: "Questions about these terms? Reach us at salelooterz@gmail.com.",
  },
];

export default function Terms() {
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
        <div className="mb-10">
          <div className="w-10 h-10 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-5 text-green-400">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500/70 mb-2">Legal</p>
          <h1 className="text-4xl font-black tracking-tight mb-2">Terms of Service</h1>
          <p className="text-xs text-white/25">Effective Date: January 01, 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i} className={i < sections.length - 1 ? "pb-8 border-b border-white/[0.05]" : ""}>
              <h2 className="text-sm font-bold text-white mb-2.5">{s.title}</h2>
              <p className="text-sm text-white/35 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/[0.05] px-5 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SaleLooterz" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-sm font-semibold text-white/60">SaleLooterz AI</span>
          </div>
          <p className="text-xs text-white/20">Fair usage and transparent policies.</p>
        </div>
      </footer>
    </div>
  );
}
