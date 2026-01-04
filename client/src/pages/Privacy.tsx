import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShoppingBag, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen w-full bg-[#030303] flex flex-col items-center selection:bg-purple-500/30 selection:text-purple-200">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.08)_0%,transparent_50%)] pointer-events-none" />
      
      <header className="w-full max-w-7xl px-6 py-8 flex justify-between items-center relative z-10">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Affiliate Bot</span>
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
          <Shield className="w-16 h-16 text-purple-500 mb-6" />
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-lg">Last updated: January 2026</p>
        </motion.div>

        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your email address via Google OAuth and your Amazon affiliate tag. We also store the spreadsheet IDs you provide to facilitate the automation of your affiliate links.</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>Your data is used solely to provide the SmartBot services, including product discovery, message generation, and Google Sheets integration. We may use your email to send important service updates or marketing messages related to SmartBot.</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your account information and authentication tokens. We never share your affiliate earnings data or private automation details with third parties.</p>
          </div>
        </section>
      </main>

      <footer className="w-full max-w-7xl px-6 py-12 border-t border-white/5 relative z-10 flex flex-col items-center gap-6 text-sm text-gray-500 mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center w-full">
          <span>© 2026 Affiliate Bot India</span>
          <div className="hidden md:block w-1 h-1 rounded-full bg-gray-800" />
          <span>Your data security is our priority.</span>
        </div>
      </footer>
    </div>
  );
}
