import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowLeft, Lock, Key, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetCode, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        toast({ title: "Password reset successfully!" });
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      setError("Failed to reset password");
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
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">New Password</h1>
          <p className="text-gray-400">Secure your account with a new password.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full p-8 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />
          
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300 ml-1">Recovery Code</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                        <Key className="w-5 h-5" />
                      </div>
                      <Input
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Paste code here"
                        className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-2xl transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300 ml-1">New Password</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-2xl transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-2xl transition-all"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] mt-4">
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center relative z-10">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Success!</h2>
                <p className="text-gray-400 text-sm">Your password has been reset successfully.</p>
                <Button onClick={() => setLocation("/login")} className="w-full h-14 bg-white text-black hover:bg-gray-100 font-bold rounded-2xl mt-4">
                  Go to Login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <button onClick={() => setLocation("/forgot-password")} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </motion.div>
      </main>
    </div>
  );
}
