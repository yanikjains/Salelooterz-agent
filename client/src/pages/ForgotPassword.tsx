import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowLeft, Mail, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.resetCode) setResetCode(data.resetCode);
        setSubmitted(true);
        toast({ title: "Recovery code sent!" });
      } else {
        setError(data.error || "Failed to process request");
      }
    } catch (error) {
      setError("Failed to process request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030303] flex flex-col items-center selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden">
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
        <Link href="/">
          <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Back to Home</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 pb-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Reset Password</h1>
          <p className="text-gray-400">Regain access to your earnings dashboard.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full p-8 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />
          
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Email address</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="h-14 pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-2xl transition-all"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]">
                    {isLoading ? "Sending..." : "Send Recovery Code"}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center relative z-10">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Check your email</h2>
                <p className="text-gray-400 text-sm">We've sent a recovery code to {email}.</p>
                {resetCode && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Backup Code</p>
                    <code className="text-purple-400 font-mono text-lg">{resetCode}</code>
                  </div>
                )}
                <Button onClick={() => setLocation("/reset-password")} className="w-full h-14 bg-white text-black hover:bg-gray-100 font-bold rounded-2xl">
                  Go to Reset Password
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <button onClick={() => setLocation("/login")} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </motion.div>
      </main>
    </div>
  );
}
