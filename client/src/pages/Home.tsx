import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, ExternalLink, Check, Loader2, FileSpreadsheet, 
  Zap, TrendingUp, Copy, ChevronRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
// @ts-ignore
import bgImage from "@assets/generated_images/abstract_dark_cyber_grid_background_with_neon_orange_and_green_accents.png";

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface DiscoveryResult {
  success: boolean;
  count: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
  results: Array<{
    product: {
      title: string;
      price: string;
      discount: number;
      category: string;
    };
    whatsappMessage: string;
    telegramMessage: string;
  }>;
}

export default function Home() {
  const [affiliateTag, setAffiliateTag] = useState("myaffiliate-20");
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [productLimit, setProductLimit] = useState(5);

  useEffect(() => {
    fetch("/api/categories")
      .then(res => res.json())
      .then(data => {
        setCategories([
          { id: "all", name: "All Categories", icon: "🌟", count: 15 },
          { id: "hot", name: "Hot Deals", icon: "🔥", count: 5 },
          ...data.categories
        ]);
      })
      .catch(console.error);
  }, []);

  const handleDiscover = async () => {
    if (!affiliateTag) {
      toast({
        title: "Affiliate Tag Required",
        description: "Please enter your Amazon affiliate tag",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setDiscoveryResult(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category: selectedCategory, 
          affiliateTag,
          limit: productLimit
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDiscoveryResult(data);
        toast({
          title: `✅ Found ${data.count} Products!`,
          description: "All products have been pushed to your Google Sheet",
        });
      } else {
        throw new Error(data.error || "Discovery failed");
      }
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${type} message copied!` });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <img src={bgImage} alt="Background" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center font-bold text-white text-xl">
              A
            </div>
            <div>
              <span className="text-2xl font-heading font-bold tracking-tight text-white">
                AmzViral
              </span>
              <p className="text-xs text-muted-foreground">Auto Product Research</p>
            </div>
          </div>
          <Badge variant="outline" className="border-green-500/50 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
            Demo Mode Active
          </Badge>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-5xl mx-auto space-y-8"
        >
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white">
              Auto-Discover <span className="text-primary">Trending Products</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a category → Get viral messages for trending products → Everything pushed to Google Sheets automatically
            </p>
          </div>

          <Card className="glass-panel border-white/10">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
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
                <div className="w-32">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Products
                  </label>
                  <Input
                    type="number"
                    value={productLimit}
                    onChange={(e) => setProductLimit(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={10}
                    className="h-12 bg-black/20 border-white/10"
                    disabled={isLoading}
                    data-testid="input-limit"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Select Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-4 rounded-xl border transition-all text-center ${
                        selectedCategory === cat.id
                          ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-black/20 border-white/10 text-muted-foreground hover:border-white/30"
                      }`}
                      disabled={isLoading}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <span className="text-2xl block mb-1">{cat.icon}</span>
                      <span className="text-xs font-medium line-clamp-1">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleDiscover}
                disabled={isLoading || !affiliateTag}
                className="w-full h-14 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold text-lg shadow-lg shadow-primary/30"
                data-testid="button-discover"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Discovering Products & Generating Messages...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Auto-Discover & Push to Sheets
                    <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {discoveryResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-6"
              >
                <Card className="glass-panel border-green-500/30 bg-green-500/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-7 h-7 text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white">
                            {discoveryResult.count} Products Processed!
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            All viral messages ready in your Google Sheet
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.open(discoveryResult.spreadsheetUrl, '_blank')}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-open-sheets"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Open Google Sheet
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Generated Messages Preview
                    </h3>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {discoveryResult.count} products
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    {discoveryResult.results.map((result, index) => (
                      <Card key={index} className="glass-panel border-white/5 overflow-hidden">
                        <CardContent className="p-0">
                          <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-white line-clamp-1">
                                {result.product.title}
                              </h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">{result.product.price}</span>
                                <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                  -{result.product.discount}% OFF
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <Tabs defaultValue="whatsapp" className="w-full">
                            <div className="px-4 pt-2">
                              <TabsList className="bg-black/30 w-full">
                                <TabsTrigger value="whatsapp" className="flex-1 data-[state=active]:bg-green-600">
                                  WhatsApp
                                </TabsTrigger>
                                <TabsTrigger value="telegram" className="flex-1 data-[state=active]:bg-blue-500">
                                  Telegram
                                </TabsTrigger>
                              </TabsList>
                            </div>
                            
                            <TabsContent value="whatsapp" className="p-4 pt-2 m-0">
                              <div className="relative">
                                <pre className="bg-black/40 p-4 rounded-lg text-xs text-gray-300 whitespace-pre-wrap font-mono border border-white/5 max-h-48 overflow-y-auto">
                                  {result.whatsappMessage}
                                </pre>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute top-2 right-2 bg-green-600/80 hover:bg-green-600"
                                  onClick={() => copyToClipboard(result.whatsappMessage, "WhatsApp")}
                                  data-testid={`button-copy-whatsapp-${index}`}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="telegram" className="p-4 pt-2 m-0">
                              <div className="relative">
                                <pre className="bg-black/40 p-4 rounded-lg text-xs text-gray-300 whitespace-pre-wrap font-mono border border-white/5 max-h-48 overflow-y-auto">
                                  {result.telegramMessage}
                                </pre>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute top-2 right-2 bg-blue-500/80 hover:bg-blue-500"
                                  onClick={() => copyToClipboard(result.telegramMessage, "Telegram")}
                                  data-testid={`button-copy-telegram-${index}`}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center text-xs text-muted-foreground space-y-2 pt-8 pb-12">
            <p className="font-mono bg-black/30 inline-block px-4 py-2 rounded-full border border-white/10">
              🔄 Select Category → 🔍 Auto-Discover → 📝 Generate Messages → 📊 Push to Sheets
            </p>
            <p className="text-muted-foreground/60">
              Demo mode uses curated trending products. Connect Amazon PA-API for real-time discovery.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
