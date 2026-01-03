import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShoppingBag, Mail, MessageCircle, Clock, Globe, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Support() {
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

      <main className="container max-w-4xl px-6 pt-12 pb-32 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4">Customer Support</h1>
          <p className="text-gray-400 text-lg">We're here to help you automate your success.</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <Mail className="w-10 h-10 text-purple-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">Email Us</h3>
            <p className="text-gray-400 mb-6">General inquiries and technical support.</p>
            <a href="mailto:salelooterz@gmail.com" className="text-purple-400 font-bold hover:underline">salelooterz@gmail.com</a>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-white font-bold mb-2">How many products can I scrape?</h4>
              <p className="text-gray-400">All paid users have a limit of 50 products per day to ensure stable performance for everyone.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">Does it work for Amazon Global?</h4>
              <p className="text-gray-400">Currently, SmartBot is optimized specifically for Amazon India (.in) affiliate marketers.</p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="w-full max-w-7xl px-6 py-12 border-t border-white/5 relative z-10 flex flex-col items-center gap-6 text-sm text-gray-500">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center">
          <span>© 2026 Affiliate Bot India</span>
          <div className="hidden md:block w-1 h-1 rounded-full bg-gray-800" />
          <span>Need help? Contact our support team.</span>
        </div>
      </footer>
    </div>
  );
}
