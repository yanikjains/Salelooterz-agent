import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (newPassword.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(newPassword)) newErrors.password = "Password must contain an uppercase letter";
    if (!/[a-z]/.test(newPassword)) newErrors.password = "Password must contain a lowercase letter";
    if (!/[0-9]/.test(newPassword)) newErrors.password = "Password must contain a number";
    if (!/[^a-zA-Z0-9]/.test(newPassword)) newErrors.password = "Password must contain a special character";
    if (newPassword !== confirmPassword) newErrors.confirm = "Passwords don't match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePassword()) {
      toast({
        title: "Validation Error",
        description: Object.values(errors)[0] || "Please fix the errors above",
        variant: "destructive",
      });
      return;
    }

    if (!resetCode) {
      setError("Please enter the recovery code");
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
        toast({
          title: "Error",
          description: data.error || "Invalid recovery code",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("Failed to reset password");
      toast({
        title: "Error",
        description: "Failed to reset password",
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
                onClick={() => setLocation("/forgot-password")}
                className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 mb-8 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Forgot Password
              </button>

              <h1 className="text-4xl font-bold mb-3">Create New Password</h1>
              <p className="text-gray-400 mb-8">
                Enter your recovery code and set a new password.
              </p>

              {!success ? (
                <>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 mb-6">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Recovery Code
                      </label>
                      <Input
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Paste your recovery code here"
                        className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400 font-mono"
                        required
                        data-testid="input-reset-code"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        New Password
                      </label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className={`h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400 ${
                          errors.password ? "border-red-500" : ""
                        }`}
                        required
                        minLength={8}
                        data-testid="input-new-password"
                      />
                      {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Confirm Password
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className={`h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400 ${
                          errors.confirm ? "border-red-500" : ""
                        }`}
                        required
                        data-testid="input-confirm-password"
                      />
                      {errors.confirm && <p className="text-xs text-red-400 mt-1">{errors.confirm}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-lg rounded-lg mt-6"
                      data-testid="button-reset-password"
                    >
                      {isLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-400 font-semibold">Password reset successfully!</p>
                      <p className="text-xs text-green-400/70 mt-1">You can now login with your new password.</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-lg rounded-lg"
                    data-testid="button-go-to-login"
                  >
                    Go to Login
                  </Button>
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
              <div className="text-6xl mb-6">🔑</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">Set New Password</h2>
              <p className="text-gray-400">
                Make sure your new password is strong and unique to protect your account.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
