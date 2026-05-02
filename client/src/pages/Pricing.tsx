import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, LogOut, ShoppingBag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 199900, currency: "INR" })
      });

      const data = await response.json();

      if (data.orderId && (window as any).Razorpay) {
        const options = {
          key: data.razorpayKey,
          amount: 199900,
          currency: "INR",
          order_id: data.orderId,
          name: "SaleLooterz AI",
          description: "₹1,999 Lifetime Access",
          handler: async (response: any) => {
            await verifyPayment(response.razorpay_payment_id, data.orderId);
          }
        };
        new (window as any).Razorpay(options).open();
      } else {
        toast({
          title: "Payment Error",
          description: "Payment gateway not available. Please contact support.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (paymentId: string, orderId: string) => {
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, orderId })
      });

      if (response.ok) {
        toast({
          title: "Payment Successful!",
          description: "Lifetime access activated. Welcome to SaleLooterz AI!",
        });
        setLocation("/");
      } else {
        toast({
          title: "Verification Failed",
          description: "Please contact support with your payment ID.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.08)_0%,transparent_50%)] pointer-events-none" />

      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">SaleLooterz AI</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-white"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-12 relative z-10">
        <div className="text-center mb-10">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4">
            Trial Expired
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Unlock Full Access</h1>
          <p className="text-gray-400">Get unlimited product scraping and viral message generation, forever.</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-1 text-sm">
                3-Day Free Trial Included
              </Badge>
            </div>
            <CardTitle className="text-5xl font-bold text-white">₹1,999</CardTitle>
            <CardDescription className="text-lg text-gray-300 mt-1">One-time payment · Lifetime Access</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            <ul className="space-y-3">
              {[
                "Scrape up to 50 products per day",
                "Generate viral WhatsApp & Telegram messages",
                "Auto-export to your Google Sheets",
                "Professional affiliate link injection",
                "Hindi-English hybrid messaging",
                "Telegram bot auto-posting",
                "Lifetime updates included",
                "Priority support",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-gray-200 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl shadow-amber-500/20"
              data-testid="button-pay"
            >
              {isLoading ? "Processing..." : "Pay ₹1,999 — Get Lifetime Access"}
            </Button>

            <p className="text-center text-xs text-gray-500">
              One-time payment. No subscription. No hidden fees.
            </p>
            <p className="text-center text-xs text-emerald-400 font-medium">
              ✓ UPI, Cards, Net Banking, Wallets accepted via Razorpay
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          Need help?{" "}
          <a href="mailto:salelooterz@gmail.com" className="text-purple-400 hover:underline">
            salelooterz@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
