import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, ExternalLink, Check, Loader2, FileSpreadsheet, 
  Zap, Copy, ArrowRight, ShoppingBag, IndianRupee, Star,
  MessageCircle, Send, LogOut
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
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
      originalPrice: string;
      discount: string;
      rating: number;
      reviews: number;
      image: string;
      category: string;
      url: string;
    };
    whatsappMessage: string;
    telegramMessage: string;
  }>;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [affiliateTag, setAffiliateTag] = useState("");
  const [productLimit, setProductLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("electronics");
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ weeklyCount: 0, remaining: 50, weeklyLimit: 50 });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const storedUsername = localStorage.getItem("username");
    
    if (!userId) {
      setLocation("/login");
      return;
    }

    setUsername(storedUsername || "");

    Promise.all([
      fetch("/api/categories")
        .then(res => res.json())
        .then(data => {
          setCategories([
            { id: "hot", name: "Hot Deals", icon: "🔥", description: "Today's Best" },
            ...data.categories
          ]);
        }),
      fetch("/api/user/weekly-stats", {
        headers: { "x-user-id": userId }
      })
        .then(res => res.json())
        .then(data => {
          setWeeklyStats(data);
        })
    ]).catch(console.error);
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setLocation("/login");
    toast({ title: "Logged out successfully" });
  };

  const handleDiscover = async () => {
    if (!affiliateTag) {
      toast({
        title: "Affiliate Tag Required",
        description: "Please enter your Amazon India affiliate tag (e.g., yourtag-21)",
        variant: "destructive",
      });
      return;
    }

    if (weeklyStats.remaining <= 0) {
      toast({
        title: "Weekly Limit Reached",
        description: "You've reached your limit of 50 products this week. Come back next week!",
        variant: "destructive",
      });
      return;
    }

    if (productLimit > weeklyStats.remaining) {
      toast({
        title: "Limit Exceeded",
        description: `You can only scrape ${weeklyStats.remaining} more products this week.`,
        variant: "destructive",
      });
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLocation("/login");
      return;
    }

    setIsLoading(true);
    setDiscoveryResult(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": userId
        },
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
          title: `Found ${data.count} Products!`,
          description: "All products with viral messages pushed to Google Sheets",
        });
      } else {
        throw new Error(data.error || "Discovery failed");
      }
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Please try again",
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
    <div className="min-h-screen w-full">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg glow-amber flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">India's First Smart Amazon Affiliate Bot</h1>
              <p className="text-xs text-muted-foreground">Automated Message Generation & Google Sheets Export</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {username && (
              <div className="text-right">
                <p className="text-sm text-white">Welcome, <span className="font-semibold">{username}</span></p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              Live Scraping
            </Badge>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Scrape Real Products from </span>
            <span className="gradient-text">Amazon.in</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select category → Auto-scrape unlimited products → Get viral WhatsApp & Telegram messages → Export to Google Sheets
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card mb-8 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Your Amazon India Affiliate Tag
                  </label>
                  <Input
                    value={affiliateTag}
                    onChange={(e) => setAffiliateTag(e.target.value)}
                    placeholder="yourtag-21"
                    className="h-14 text-lg bg-background/50 border-white/10 placeholder:text-muted-foreground/50"
                    disabled={isLoading}
                    data-testid="input-affiliate-tag"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Find your tag at affiliate-program.amazon.in
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Products to Scrape
                  </label>
                  <Input
                    type="number"
                    value={productLimit}
                    onChange={(e) => setProductLimit(Math.max(1, Math.min(weeklyStats.remaining, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={weeklyStats.remaining}
                    className="h-14 text-lg bg-background/50 border-white/10 text-center"
                    disabled={isLoading || weeklyStats.remaining <= 0}
                    data-testid="input-product-limit"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {weeklyStats.remaining > 0 
                      ? `${weeklyStats.remaining} remaining this week`
                      : "Weekly limit reached"}
                  </p>
                </div>
              </div>

              <div className="mb-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-muted-foreground">
                  <span className="text-amber-400 font-semibold">{weeklyStats.weeklyCount} / {weeklyStats.weeklyLimit}</span> products scraped this week
                </p>
              </div>

              <div className="mb-8">
                <label className="text-sm font-medium text-muted-foreground mb-4 block">
                  Select Product Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 text-center overflow-hidden ${
                        selectedCategory === cat.id
                          ? "bg-gradient-to-b from-amber-500/20 to-orange-600/10 border-amber-500/50 shadow-lg glow-amber"
                          : "bg-card/40 border-white/5 hover:border-white/20 hover:bg-card/60"
                      }`}
                      disabled={isLoading}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">
                        {cat.icon}
                      </span>
                      <span className={`text-xs font-semibold block ${
                        selectedCategory === cat.id ? "text-amber-400" : "text-white/80"
                      }`}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleDiscover}
                disabled={isLoading || !affiliateTag || weeklyStats.remaining <= 0}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl glow-amber transition-all duration-300 disabled:opacity-50"
                data-testid="button-discover"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Scraping Amazon India...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Zap className="w-6 h-6" />
                    Scrape {productLimit} Products & Generate Messages
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {discoveryResult && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="space-y-6"
            >
              <Card className="glass-card border-emerald-500/30 glow-green overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-white">
                          {discoveryResult.count} Products Scraped!
                        </h3>
                        <p className="text-muted-foreground">
                          Real data from Amazon.in with viral messages
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open(discoveryResult.spreadsheetUrl, '_blank')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                      data-testid="button-open-sheets"
                    >
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      Open Google Sheet
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {discoveryResult.results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="glass-card overflow-hidden hover:border-white/20 transition-colors">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                          <div className="lg:w-2/5 p-6 border-b lg:border-b-0 lg:border-r border-white/5">
                            <div className="flex items-start gap-4">
                              {result.product.image && (
                                <div className="w-20 h-20 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                                  <img 
                                    src={result.product.image} 
                                    alt={result.product.title}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white leading-tight line-clamp-2 mb-2">
                                  {result.product.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-xl font-bold text-amber-400">
                                    {result.product.price}
                                  </span>
                                  {result.product.originalPrice && result.product.originalPrice !== result.product.price && (
                                    <span className="text-sm text-muted-foreground line-through">
                                      {result.product.originalPrice}
                                    </span>
                                  )}
                                  {result.product.discount && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                      {result.product.discount}
                                    </Badge>
                                  )}
                                </div>
                                {result.product.rating > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span>{result.product.rating}/5</span>
                                    {result.product.reviews > 0 && (
                                      <span>({result.product.reviews.toLocaleString('en-IN')} reviews)</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="lg:w-3/5">
                            <Tabs defaultValue="whatsapp" className="h-full">
                              <div className="px-4 pt-4 border-b border-white/5">
                                <TabsList className="bg-background/50 w-full">
                                  <TabsTrigger 
                                    value="whatsapp" 
                                    className="flex-1 gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                  </TabsTrigger>
                                  <TabsTrigger 
                                    value="telegram" 
                                    className="flex-1 gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                                  >
                                    <Send className="w-4 h-4" />
                                    Telegram
                                  </TabsTrigger>
                                </TabsList>
                              </div>
                              
                              <TabsContent value="whatsapp" className="p-4 m-0">
                                <div className="relative">
                                  <pre className="bg-background/60 p-4 rounded-xl text-xs text-gray-300 whitespace-pre-wrap font-mono border border-white/5 max-h-40 overflow-y-auto">
                                    {result.whatsappMessage}
                                  </pre>
                                  <Button
                                    size="sm"
                                    className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => copyToClipboard(result.whatsappMessage, "WhatsApp")}
                                    data-testid={`button-copy-whatsapp-${index}`}
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="telegram" className="p-4 m-0">
                                <div className="relative">
                                  <pre className="bg-background/60 p-4 rounded-xl text-xs text-gray-300 whitespace-pre-wrap font-mono border border-white/5 max-h-40 overflow-y-auto">
                                    {result.telegramMessage}
                                  </pre>
                                  <Button
                                    size="sm"
                                    className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600"
                                    onClick={() => copyToClipboard(result.telegramMessage, "Telegram")}
                                    data-testid={`button-copy-telegram-${index}`}
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center gap-3 bg-card/40 border border-white/5 rounded-full px-6 py-3 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Scrapes real-time data from Amazon.in • Unlimited products • No rate limits
          </div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border-t border-white/5 mt-16 pt-8 text-center text-xs text-muted-foreground space-y-2"
        >
          <p>Created by <span className="text-white font-semibold">Yanik Jain</span></p>
          <p>
            Contact: <a href="mailto:salelooterz@gmail.com" className="text-amber-400 hover:text-amber-300 transition-colors">salelooterz@gmail.com</a>
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
