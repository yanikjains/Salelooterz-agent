import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
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
      if (!email) {
        setError("Please enter your email");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // If recovery code is returned, email service might not be configured
        if (data.resetCode) {
          setResetCode(data.resetCode);
        }
        setSubmitted(true);
        toast({ title: "Recovery code sent!", description: data.message });
      } else {
        setError(data.error || "Failed to process request");
        toast({
          title: "Error",
          description: data.error || "Email not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("Failed to process request");
      toast({
        title: "Error",
        description: "Failed to process request",
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
              <button
                onClick={() => setLocation("/login")}
                className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 mb-8 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>

              <h1 className="text-4xl font-bold mb-3">Reset Your Password</h1>
              <p className="text-gray-400 mb-8">
                Enter your email address and we'll send you a recovery code.
              </p>

              {!submitted ? (
                <>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 mb-6">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400"
                        required
                        data-testid="input-forgot-email"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-lg rounded-lg"
                      data-testid="button-send-code"
                    >
                      {isLoading ? "Sending..." : "Send Recovery Code"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-400 font-semibold">Recovery code sent to your email!</p>
                      <p className="text-xs text-green-400/70 mt-1">Check your inbox for the reset code</p>
                    </div>
                  </div>

                  {resetCode && (
                    <>
                      <p className="text-sm text-gray-400">
                        If you don't see the email, here's your backup code:
                      </p>
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <code className="text-lg font-mono text-yellow-400 break-all select-all">
                          {resetCode}
                        </code>
                      </div>
                    </>
                  )}

                  <p className="text-sm text-gray-400">
                    Click the button below to reset your password using the code from your email.
                  </p>

                  <Button
                    onClick={() => setLocation("/reset-password")}
                    className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-lg rounded-lg"
                    data-testid="button-go-to-reset"
                  >
                    Go to Reset Password
                  </Button>

                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setEmail("");
                      setError("");
                      setResetCode("");
                    }}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-300"
                  >
                    Try another email
                  </button>
                </div>
              )}
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
              <div className="text-6xl mb-6">🔐</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">Account Recovery</h2>
              <p className="text-gray-400">
                We'll help you regain access to your account safely. Enter your email to get started.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
