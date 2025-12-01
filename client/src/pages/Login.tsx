import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError("Email and password are required");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email || email);
        setLocation("/");
        toast({ title: "Login successful!" });
      } else {
        setError(data.error || "Invalid credentials. Please try again.");
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("Failed to login. Please try again.");
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="grid lg:grid-cols-2 h-screen">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-between p-8 md:p-12 bg-black"
        >
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingBag className="w-6 h-6 text-black" />
              </div>
              <span className="font-bold text-xl">Amazon Affiliate Bot</span>
            </div>

            <div className="max-w-sm">
              <h1 className="text-4xl font-bold mb-3">Login to your account</h1>
              <p className="text-gray-400 mb-8">Scrape 50 Amazon products daily. Generate viral messages. Earn commissions.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400"
                    required
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400"
                    required
                    data-testid="input-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-lg rounded-lg"
                  data-testid="button-login"
                >
                  {isLoading ? "Logging in..." : "Login to Dashboard"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setLocation("/forgot-password")}
                  className="text-yellow-400 hover:text-yellow-300 font-semibold text-sm"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </button>
              </div>

              <p className="text-gray-400 text-sm mt-8">
                New here?{" "}
                <button
                  onClick={() => setLocation("/signup")}
                  className="text-yellow-400 hover:text-yellow-300 font-semibold"
                  data-testid="link-signup"
                >
                  Create account
                </button>
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-500">
            <p>© 2024 India's First Smart Amazon Affiliate Bot</p>
            <p>Earn real commissions from Amazon India</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-transparent mix-blend-screen"></div>
          </div>
          
          <div className="relative z-10 max-w-md text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-8 inline-block"
            >
              <div className="text-6xl mb-6">🎯</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">Unlimited Earnings</h2>
              <div className="space-y-4 text-left">
                <div className="flex gap-4 items-start">
                  <span className="text-yellow-400 text-xl mt-1">✓</span>
                  <div>
                    <p className="font-semibold">50 Products Daily</p>
                    <p className="text-gray-400 text-sm">Scrape Amazon India data automatically</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-yellow-400 text-xl mt-1">✓</span>
                  <div>
                    <p className="font-semibold">Viral Messages</p>
                    <p className="text-gray-400 text-sm">Hindi-English messages for WhatsApp & Telegram</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-yellow-400 text-xl mt-1">✓</span>
                  <div>
                    <p className="font-semibold">Auto Export</p>
                    <p className="text-gray-400 text-sm">Get products in Google Sheets instantly</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-yellow-400 text-xl mt-1">✓</span>
                  <div>
                    <p className="font-semibold">₹1,299 Lifetime</p>
                    <p className="text-gray-400 text-sm">One-time payment, 10 days free trial</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
