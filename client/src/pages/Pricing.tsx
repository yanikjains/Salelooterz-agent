import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setLocation("/login");
    toast({ title: "Logged out successfully" });
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setLocation("/login");
        return;
      }

      // Simulate payment completion (in real app, integrate Razorpay here)
      const response = await fetch("/api/payment/complete", {
        method: "POST",
        headers: {
          "x-user-id": userId
        }
      });

      if (response.ok) {
        toast({
          title: "Payment Successful!",
          description: "You now have lifetime access. Enjoy scraping 50 products per day!",
        });
        setLocation("/");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Unlock Premium Access</h1>
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
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-4xl text-center">₹3,999</CardTitle>
            <CardDescription className="text-center text-lg mt-2">Lifetime Access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Badge>Premium Features</Badge>
              </h3>
              <ul className="space-y-3">
                {[
                  "Scrape up to 50 products per day",
                  "Unlimited lifetime access",
                  "Generate viral WhatsApp & Telegram messages",
                  "Auto-export to personal Google Sheets",
                  "Professional affiliate link injection",
                  "Hindi-English hybrid messaging",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-amber-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl"
              data-testid="button-pay"
            >
              {isLoading ? "Processing..." : "Pay ₹3,999 Now"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              One-time payment. Never pay again. Lifetime access guaranteed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
