import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ExternalLink, Check, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
// @ts-ignore
import bgImage from "@assets/generated_images/abstract_dark_cyber_grid_background_with_neon_orange_and_green_accents.png";

interface AutomationResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  automation: {
    productTitle: string;
    price: string;
    whatsappMessage: string;
    telegramMessage: string;
  };
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [affiliateTag, setAffiliateTag] = useState("myaffiliate-20");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);

  const handleAutomate = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter an Amazon product URL",
        variant: "destructive",
      });
      return;
    }

    if (!affiliateTag) {
      toast({
        title: "Affiliate Tag Required",
        description: "Please enter your Amazon affiliate tag",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, affiliateTag }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        toast({
          title: "✅ Automation Complete!",
          description: "Product scraped and messages pushed to Google Sheets",
        });
      } else {
        throw new Error(data.error || "Automation failed");
      }
    } catch (error) {
      toast({
        title: "Automation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-x-hidden flex flex-col">
      <div className="fixed inset-0 z-0">
        <img 
          src={bgImage} 
          alt="Background" 
          className="w-full h-full object-cover opacity-30" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex-1 flex flex-col">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center font-bold text-white text-xl">
              A
            </div>
            <span className="text-2xl font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              AmzViral Automation
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Ready
             </span>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-3xl mx-auto w-full space-y-8"
        >
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-white mb-4">
              Amazon → <span className="text-primary neon-glow">Google Sheets</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Paste Amazon URL → Get viral WhatsApp & Telegram messages in your Google Sheet. Zero manual work.
            </p>
          </div>

          <Card className="glass-panel border-white/10">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Amazon Product URL
                  </label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://amazon.com/dp/B09XS..."
                    className="h-12 bg-black/20 border-white/10"
                    disabled={isLoading}
                    data-testid="input-amazon-url"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Your Affiliate Tag
                  </label>
                  <Input
                    value={affiliateTag}
                    onChange={(e) => setAffiliateTag(e.target.value)}
                    placeholder="myaffiliate-20"
                    className="h-12 bg-black/20 border-white/10"
                    disabled={isLoading}
                    data-testid="input-affiliate-tag"
                  />
                </div>
              </div>

              <Button
                onClick={handleAutomate}
                disabled={isLoading || !url || !affiliateTag}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
                data-testid="button-automate"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing... (Scraping → Generating → Pushing)
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Run Full Automation
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="glass-panel border-green-500/30 bg-green-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-white mb-1">Automation Complete!</h3>
                        <p className="text-sm text-muted-foreground">
                          Product: {result.automation.productTitle}
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={() => window.open(result.spreadsheetUrl, '_blank')}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-open-sheets"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Open Google Sheet
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(result.automation.whatsappMessage);
                            toast({ title: "WhatsApp message copied!" });
                          }}
                          data-testid="button-copy-whatsapp"
                        >
                          Copy WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(result.automation.telegramMessage);
                            toast({ title: "Telegram message copied!" });
                          }}
                          data-testid="button-copy-telegram"
                        >
                          Copy Telegram
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">Preview: WhatsApp Message</h4>
                    <span className="text-xs text-green-400 font-mono">READY TO SEND</span>
                  </div>
                  <pre className="bg-black/40 p-4 rounded-lg text-sm text-gray-300 whitespace-pre-wrap font-mono border border-white/5" data-testid="text-whatsapp-preview">
                    {result.automation.whatsappMessage}
                  </pre>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">Preview: Telegram Message</h4>
                    <span className="text-xs text-blue-400 font-mono">READY TO SEND</span>
                  </div>
                  <pre className="bg-black/40 p-4 rounded-lg text-sm text-gray-300 whitespace-pre-wrap font-mono border border-white/5" data-testid="text-telegram-preview">
                    {result.automation.telegramMessage}
                  </pre>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="text-center text-xs text-muted-foreground space-y-2 pt-8">
            <p>💡 Each run creates a new row in your Google Sheet with product details and formatted messages</p>
            <p className="font-mono">Scrape → AI Viral Hooks → Sheet Export → Done</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
