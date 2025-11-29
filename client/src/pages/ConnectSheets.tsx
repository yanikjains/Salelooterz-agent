import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileSpreadsheet, ArrowRight, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ConnectSheets() {
  const [, setLocation] = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: localStorage.getItem("userId"),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsConnected(true);
        toast({ title: "Google Sheets connected successfully!" });
        setTimeout(() => setLocation("/"), 1500);
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Connect Google Sheets</h1>
          <p className="text-muted-foreground">Store your scraped products automatically</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardContent className="p-8">
              {!isConnected ? (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-white">Automatic Spreadsheet Creation</p>
                        <p className="text-sm text-muted-foreground">We'll create a dedicated sheet for your products</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-white">Real-time Updates</p>
                        <p className="text-sm text-muted-foreground">Every scraped product syncs instantly</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-white">Easy Sharing</p>
                        <p className="text-sm text-muted-foreground">Share your sheet link with your team</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold shadow-lg mb-3"
                    data-testid="button-connect-sheets"
                  >
                    {isConnecting ? "Connecting..." : "Connect Google Sheets"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-white"
                    data-testid="button-skip"
                  >
                    Skip for now
                  </Button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <p className="text-xl font-bold text-white mb-2">Connected!</p>
                  <p className="text-muted-foreground">Redirecting you to the scraper...</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
