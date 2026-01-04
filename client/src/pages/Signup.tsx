import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight, AlertCircle, Mail, Lock, User, Sparkles } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "@/hooks/use-toast";
import { jwtDecode } from "jwt-decode";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email);
        setLocation("/");
        toast({ title: "Account created successfully! Welcome!" });
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (error) {
      setError("Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: decoded.email, name: decoded.name }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email);
        setLocation("/");
        toast({ title: "Account created with Google! Welcome!" });
      } else {
        setError(data.error || "Google signup failed");
      }
    } catch (error) {
      setError("Failed to sign up with Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#030303] flex flex-col items-center justify-center selection:bg-purple-500/30 selection:text-purple-200 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.08)_0%,transparent_50%)] pointer-events-none" />
      
      <header className="w-full max-w-7xl px-6 py-4 flex justify-between items-center absolute top-0 left-0 right-0 z-20">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Affiliate Bot</span>
          </div>
        </Link>
        <Link href="/">
          <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Back to Home</span>
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center w-full max-w-lg px-6 relative z-10 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Join SmartBot</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm">Start your affiliate journey in seconds.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full p-6 rounded-[1.5rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignup} className="space-y-3 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300 ml-1">Username</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="h-11 pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300 ml-1">Email</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-11 pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 ml-1">Password</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 ml-1">Confirm</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-purple-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl transition-all text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] mt-2 text-sm"
            >
              {isLoading ? "Creating..." : "Create Free Account"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.2em]"><span className="px-3 bg-[#0a0a0a] text-gray-600">Or sign up with</span></div>
            </div>

            <div className="flex justify-center" data-testid="button-google-signup">
              <div className="scale-90 hover:opacity-90 transition-opacity">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google login failed")} theme="filled_black" shape="pill" />
              </div>
            </div>
          </form>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-gray-500 text-xs">
          Already have an account?{" "}
          <button onClick={() => setLocation("/login")} className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            Login
          </button>
        </motion.p>
      </main>

      <footer className="w-full max-w-7xl px-6 py-4 absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex justify-center text-center text-[10px] text-gray-600">
        <span>© 2026 Affiliate Bot India • Secure Registration</span>
      </footer>
    </div>

  );
}
