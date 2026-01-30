import stockImage from '@assets/stock_images/ai_marketing_automat_decfe48f.jpg'
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleLogin } from "@react-oauth/google";
import { 
  Sparkles, ExternalLink, Check, Loader2, FileSpreadsheet, 
  Zap, Copy, ArrowRight, ShoppingBag, IndianRupee, Star,
  MessageCircle, Send, LogOut, Smartphone, Bot
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

import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();
  const userId = user?.id;
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [affiliateTag, setAffiliateTag] = useState("");
  const [productLimit, setProductLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetsId, setSheetsId] = useState("");
  const [tempSheetsId, setTempSheetsId] = useState("");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [showSheetsForm, setShowSheetsForm] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [tempTelegramBotToken, setTempTelegramBotToken] = useState("");
  const [tempTelegramChannelId, setTempTelegramChannelId] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [showTelegramForm, setShowTelegramForm] = useState(false);
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState("");
  const [tempWhatsappChannelUrl, setTempWhatsappChannelUrl] = useState("");
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [showWhatsappForm, setShowWhatsappForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("electronics");
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ weeklyCount: 0, remaining: 50, weeklyLimit: 50 });
  const [showAIChat, setShowAIChat] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await fetch("/api/auth/google-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        setUsername(data.username);
        toast({ title: "Login successful!" });
        window.location.reload();
      } else {
        toast({ title: "Login failed", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Login failed", description: "Please try again", variant: "destructive" });
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    
    if (userId) {
      setUsername(storedUsername || (user as any)?.firstName || "");
      
      Promise.all([
        fetch("/api/categories")
          .then(res => res.json())
          .then(data => {
            setCategories([
              { id: "hot", name: "Hot Deals", icon: "🔥", description: "Today's Best" },
              ...data.categories
            ]);
          }),
        fetch("/api/automations")
          .then(res => res.json())
          .then(data => {
            setWeeklyStats({
              weeklyCount: data.dailyCount,
              remaining: data.remaining,
              weeklyLimit: data.dailyLimit
            });
          }),
        fetch("/api/user/sheets-id")
          .then(async res => {
            if (res.status === 404) return null;
            return res.json();
          })
          .then(data => {
            if (data) setSheetsId(data.sheetsId || "");
          })
          .catch(() => setSheetsId("")),
        fetch("/api/user/telegram")
          .then(async res => {
            if (res.status === 404) return null;
            return res.json();
          })
          .then(data => {
            if (data) {
              setTelegramBotToken(data.telegramBotToken || "");
              setTelegramChannelId(data.telegramChannelId || "");
            }
          })
          .catch(() => {
            setTelegramBotToken("");
            setTelegramChannelId("");
          }),
        fetch("/api/user/whatsapp")
          .then(async res => {
            if (res.status === 404) {
              handleLogout();
              return;
            }
            return res.json();
          })
          .then(data => {
            if (data) setWhatsappChannelUrl(data.whatsappChannelUrl || "");
          })
          .catch(() => {
            setWhatsappChannelUrl("");
          })
      ]).catch(console.error);
    }
  }, [userId, user]);

  const handleSaveSheets = async () => {
    if (!tempSheetsId.trim()) {
      toast({
        title: "Invalid Sheet ID",
        description: "Please paste your Google Sheet ID or full URL",
        variant: "destructive",
      });
      return;
    }

    let sheetId = tempSheetsId.trim();
    const urlMatch = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      sheetId = urlMatch[1];
    }

    setSheetsLoading(true);
    try {
      localStorage.setItem("sheetsId", sheetId);
      setSheetsId(sheetId);
      setShowSheetsForm(false);
      toast({ title: "Google Sheet saved successfully!" });

      const userId = localStorage.getItem("userId");
      if (userId) {
        fetch("/api/user/sheets-id", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-id": userId
          },
          body: JSON.stringify({ sheetsId: sheetId })
        }).catch(() => {});
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Google Sheet",
        variant: "destructive",
      });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
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

  const handleSaveTelegram = async () => {
    if (!tempTelegramBotToken.trim() || !tempTelegramChannelId.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please enter both bot token and channel ID",
        variant: "destructive",
      });
      return;
    }

    setTelegramLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setLocation("/login");
        return;
      }

      const response = await fetch("/api/user/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          telegramBotToken: tempTelegramBotToken.trim(),
          telegramChannelId: tempTelegramChannelId.trim()
        })
      });

      if (response.ok) {
        setTelegramBotToken(tempTelegramBotToken.trim());
        setTelegramChannelId(tempTelegramChannelId.trim());
        setShowTelegramForm(false);
        toast({ title: "Telegram connected successfully!" });
      } else {
        throw new Error("Failed to save Telegram config");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save Telegram config",
        variant: "destructive",
      });
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!tempWhatsappChannelUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter your WhatsApp channel URL",
        variant: "destructive",
      });
      return;
    }

    setWhatsappLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setLocation("/login");
        return;
      }

      const response = await fetch("/api/user/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          whatsappChannelUrl: tempWhatsappChannelUrl.trim()
        })
      });

      if (response.ok) {
        setWhatsappChannelUrl(tempWhatsappChannelUrl.trim());
        setShowWhatsappForm(false);
        toast({ title: "WhatsApp connected successfully!" });
      } else {
        throw new Error("Failed to save WhatsApp config");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save WhatsApp config",
        variant: "destructive",
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleSendAllToChannels = async () => {
    if (!discoveryResult) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLocation("/login");
      return;
    }

    if (!whatsappChannelUrl && !telegramBotToken) {
      toast({
        title: "No Channels Configured",
        description: "Please connect at least WhatsApp or Telegram",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/send-bulk-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          products: discoveryResult.results,
          whatsappChannelUrl: whatsappChannelUrl || null,
          telegramBotToken: telegramBotToken || null,
          telegramChannelId: telegramChannelId || null
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Messages Sent!",
          description: `Successfully sent ${data.sentCount} messages to your channels`,
        });
      } else {
        throw new Error(data.error || "Failed to send messages");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send messages",
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


  if (!userId) {
    return (
      <div className="min-h-screen w-full bg-[#030303] flex flex-col items-center selection:bg-purple-500/30 selection:text-purple-200">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.08)_0%,transparent_50%)] pointer-events-none" />
        <div className="fixed inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))] pointer-events-none" />
        
        <header className="w-full max-w-7xl px-6 py-8 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Affiliate Bot</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/features">
              <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Features</span>
            </Link>
            <Button 
              onClick={() => setLocation("/login")}
              variant="outline" 
              className="rounded-full px-6 bg-white/5 border-white/10 text-white hover:bg-white/10 h-10"
              data-testid="button-nav-login"
            >
              Sign In
            </Button>
          </div>
        </header>

        <main className="container max-w-5xl px-6 pt-24 pb-32 flex flex-col items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Affiliate Automation</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold text-center text-white tracking-tight leading-[1.1] mb-8"
          >
            Automate Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-[length:200%_auto] animate-gradient-x">Earnings Flow.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mb-12 leading-relaxed"
          >
            The world's first smart Amazon affiliate bot. Scrape, generate, and post viral content to WhatsApp & Telegram in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 mb-16 relative z-10"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />
              <blockquote className="relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl italic text-gray-300 text-xl text-center font-medium tracking-wide">
                "Success in affiliate marketing isn't about working harder, it's about working smarter. Let AI handle the grind while you focus on the growth."
              </blockquote>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 w-full max-w-4xl rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            <img 
              src={stockImage} 
              alt="AI Marketing Dashboard" 
              className="w-full h-full object-cover aspect-[16/9] opacity-60 group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-black/20">
              <div className="space-y-4">
                <div className="flex gap-2 justify-center mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/40 border border-green-600/60" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white mb-2">Smart Dashboard</h3>
                  <p className="text-gray-300 max-w-md text-sm">Automated Amazon product discovery and message generation at your fingertips.</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 grid grid-cols-3 gap-8 text-center border-t border-white/10 bg-black/40 backdrop-blur-md z-30">
              <div>
                <div className="text-2xl font-bold text-white mb-1">50+</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Daily Scrapes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">10k+</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Users India</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">99.9%</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Success Rate</div>
              </div>
            </div>
          </motion.div>
        </main>
        
        <footer className="w-full max-w-7xl px-6 py-12 border-t border-white/5 relative z-10 flex flex-col items-center gap-8 text-sm text-gray-500 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center w-full">
            <span>© 2026 Affiliate Bot India</span>
            <div className="hidden md:block w-1 h-1 rounded-full bg-gray-800" />
            <span>Built by Yanik Jain</span>
          </div>
          <div className="flex items-center justify-center gap-8 w-full">
            <Link href="/support">
              <span className="hover:text-white transition-colors cursor-pointer">Support</span>
            </Link>
            <Link href="/privacy">
              <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            </Link>
            <Link href="/terms">
              <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            </Link>
          </div>
        </footer>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-white tracking-tight">Affiliate Bot</h1>
              <p className="text-xs text-muted-foreground">Automated Message Generation & Google Sheets Export</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowAIChat(!showAIChat)}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
              data-testid="button-toggle-ai-chat"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI Assistant
            </Button>
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
          className="mb-8"
        >
          <Card className={`glass-card overflow-hidden border-2 ${sheetsId ? "border-emerald-500/30" : "border-amber-500/30"}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${sheetsId ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
                    <FileSpreadsheet className={`w-6 h-6 ${sheetsId ? "text-emerald-400" : "text-amber-400"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Google Sheets Export</p>
                    <p className={`text-sm ${sheetsId ? "text-emerald-400" : "text-amber-400"}`}>
                      {sheetsId ? "✓ Sheet Connected" : "Add your Google Sheet ID"}
                    </p>
                  </div>
                </div>
              </div>

              {!showSheetsForm && !sheetsId && (
                <div className="mt-4 space-y-3">
                  <Button
                    onClick={() => setShowSheetsForm(true)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    data-testid="button-add-sheets"
                  >
                    Add Sheet ID
                  </Button>
                  <div className="text-center">
                    <div className="inline-block bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-blue-400 font-semibold">Coming Soon:</span> Direct Google Sheets Sync
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!showSheetsForm && sheetsId && (
                <Button
                  onClick={() => {
                    setTempSheetsId(sheetsId);
                    setShowSheetsForm(true);
                  }}
                  variant="outline"
                  className="mt-4 w-full"
                  data-testid="button-edit-sheets"
                >
                  Edit Sheet ID
                </Button>
              )}

              {showSheetsForm && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs bg-blue-500/10 p-4 rounded border border-blue-500/20 space-y-2">
                    <p className="font-semibold text-white">📝 What is a Google Sheet ID?</p>
                    <p className="text-muted-foreground">
                      A unique identifier for your Google Sheet found in the URL. It's a long string of letters and numbers.
                    </p>
                    <div className="bg-black/30 p-2 rounded border border-blue-500/30 mt-2">
                      <p className="text-muted-foreground text-xs mb-1">Full URL example:</p>
                      <p className="text-blue-300 font-mono text-xs break-all">
                        https://docs.google.com/spreadsheets/d/<span className="text-amber-400">1a2b3c4d5e6f7g8h9i0j</span>/edit
                      </p>
                    </div>
                    <div className="pt-2 border-t border-blue-500/20">
                      <p className="font-semibold text-white text-xs mb-2">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Create a Google Sheet at sheets.google.com</li>
                        <li>Share it (Anyone with link can edit)</li>
                        <li>Paste the full URL or just the ID below</li>
                      </ol>
                    </div>
                  </div>
                  <Input
                    value={tempSheetsId}
                    onChange={(e) => setTempSheetsId(e.target.value)}
                    placeholder="Paste full URL or just the Sheet ID"
                    className="h-10 bg-gray-900 border-gray-700 text-white text-sm"
                    data-testid="input-sheets-id"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveSheets}
                      disabled={sheetsLoading || !tempSheetsId.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid="button-save-sheets"
                    >
                      {sheetsLoading ? "Saving..." : "Save Sheet"}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSheetsForm(false);
                        setTempSheetsId("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <Card className={`glass-card overflow-hidden border-2 ${telegramBotToken && telegramChannelId ? "border-emerald-500/30" : "border-purple-500/30"}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${telegramBotToken && telegramChannelId ? "bg-emerald-500/20" : "bg-purple-500/20"}`}>
                    <Smartphone className={`w-6 h-6 ${telegramBotToken && telegramChannelId ? "text-emerald-400" : "text-purple-400"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Telegram Channel</p>
                    <p className={`text-sm ${telegramBotToken && telegramChannelId ? "text-emerald-400" : "text-purple-400"}`}>
                      {telegramBotToken && telegramChannelId ? "✓ Connected" : "Auto-send messages to your channel"}
                    </p>
                  </div>
                </div>
              </div>

              {!showTelegramForm && !telegramBotToken && (
                <div className="mt-4 space-y-3">
                  <Button
                    onClick={() => {
                      setTempTelegramBotToken("");
                      setTempTelegramChannelId("");
                      setShowTelegramForm(true);
                    }}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                    data-testid="button-add-telegram"
                  >
                    Connect Telegram
                  </Button>
                </div>
              )}

              {!showTelegramForm && telegramBotToken && (
                <Button
                  onClick={() => {
                    setTempTelegramBotToken(telegramBotToken);
                    setTempTelegramChannelId(telegramChannelId);
                    setShowTelegramForm(true);
                  }}
                  variant="outline"
                  className="mt-4 w-full"
                  data-testid="button-edit-telegram"
                >
                  Edit Connection
                </Button>
              )}

              {showTelegramForm && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs bg-purple-500/10 p-4 rounded border border-purple-500/20 space-y-2">
                    <p className="font-semibold text-white">🤖 How to connect Telegram?</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                      <li>Chat with <span className="text-purple-400 font-semibold">@BotFather</span> on Telegram</li>
                      <li>Create a new bot with <span className="font-mono text-purple-400">/newbot</span></li>
                      <li>Copy your <span className="text-purple-400 font-semibold">bot token</span></li>
                      <li>Create a public Telegram channel</li>
                      <li>Add your bot to the channel as admin</li>
                      <li>Get your <span className="text-purple-400 font-semibold">channel ID</span> (starts with @)</li>
                    </ol>
                  </div>
                  <Input
                    value={tempTelegramBotToken}
                    onChange={(e) => setTempTelegramBotToken(e.target.value)}
                    placeholder="Bot Token (e.g., 123456789:ABCDEFGH...)"
                    className="h-10 bg-gray-900 border-gray-700 text-white text-sm"
                    type="password"
                    data-testid="input-telegram-token"
                  />
                  <Input
                    value={tempTelegramChannelId}
                    onChange={(e) => setTempTelegramChannelId(e.target.value)}
                    placeholder="Channel ID (e.g., @mychannel or -100123456789)"
                    className="h-10 bg-gray-900 border-gray-700 text-white text-sm"
                    data-testid="input-telegram-channel"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTelegram}
                      disabled={telegramLoading || !tempTelegramBotToken.trim() || !tempTelegramChannelId.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid="button-save-telegram"
                    >
                      {telegramLoading ? "Connecting..." : "Connect"}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowTelegramForm(false);
                        setTempTelegramBotToken("");
                        setTempTelegramChannelId("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className={`glass-card overflow-hidden border-2 ${whatsappChannelUrl ? "border-emerald-500/30" : "border-green-500/30"}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${whatsappChannelUrl ? "bg-emerald-500/20" : "bg-green-500/20"}`}>
                    <MessageCircle className={`w-6 h-6 ${whatsappChannelUrl ? "text-emerald-400" : "text-green-400"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">WhatsApp Channel</p>
                    <p className={`text-sm ${whatsappChannelUrl ? "text-emerald-400" : "text-green-400"}`}>
                      {whatsappChannelUrl ? "✓ Connected" : "Auto-send messages to your WhatsApp"}
                    </p>
                  </div>
                </div>
              </div>

              {!showWhatsappForm && !whatsappChannelUrl && (
                <div className="mt-4 space-y-3">
                  <Button
                    onClick={() => {
                      setTempWhatsappChannelUrl("");
                      setShowWhatsappForm(true);
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                    data-testid="button-add-whatsapp"
                  >
                    Connect WhatsApp
                  </Button>
                </div>
              )}

              {!showWhatsappForm && whatsappChannelUrl && (
                <Button
                  onClick={() => {
                    setTempWhatsappChannelUrl(whatsappChannelUrl);
                    setShowWhatsappForm(true);
                  }}
                  variant="outline"
                  className="mt-4 w-full"
                  data-testid="button-edit-whatsapp"
                >
                  Edit Connection
                </Button>
              )}

              {showWhatsappForm && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs bg-green-500/10 p-4 rounded border border-green-500/20 space-y-2">
                    <p className="font-semibold text-white">📱 WhatsApp Channel URL</p>
                    <p className="text-muted-foreground">Paste your WhatsApp channel link to auto-send messages</p>
                  </div>
                  <Input
                    value={tempWhatsappChannelUrl}
                    onChange={(e) => setTempWhatsappChannelUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/... or your channel URL"
                    className="h-10 bg-gray-900 border-gray-700 text-white text-sm"
                    data-testid="input-whatsapp-url"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveWhatsapp}
                      disabled={whatsappLoading || !tempWhatsappChannelUrl.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid="button-save-whatsapp"
                    >
                      {whatsappLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowWhatsappForm(false);
                        setTempWhatsappChannelUrl("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
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
                    data-testid="input-affiliate-tag-tour"
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
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Results Found!</h3>
                        <p className="text-sm text-emerald-400/80">Pushed to your Google Sheet</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleSendAllToChannels}
                        disabled={isLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Post All to Channels
                      </Button>
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${sheetsId || discoveryResult.spreadsheetId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="border-white/10 hover:bg-white/5">
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          View Spreadsheet
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    {discoveryResult.results.map((res, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 group hover:border-amber-500/30 transition-all duration-300">
                        <div className="grid md:grid-cols-4 gap-6">
                          <div className="md:col-span-1">
                            <div className="relative rounded-xl overflow-hidden aspect-square bg-white flex items-center justify-center">
                              <img src={res.product.image} alt={res.product.title} className="max-w-full max-h-full object-contain p-2" />
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-amber-500 text-black font-bold">-{res.product.discount}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-3 space-y-4">
                            <div>
                              <h4 className="font-bold text-lg text-white line-clamp-2 mb-1">{res.product.title}</h4>
                              <div className="flex items-center gap-4">
                                <span className="text-2xl font-bold text-amber-400">₹{res.product.price}</span>
                                <span className="text-sm text-muted-foreground line-through">₹{res.product.originalPrice}</span>
                                <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                  <Star className="w-4 h-4 fill-current" />
                                  <span>{res.product.rating}</span>
                                </div>
                              </div>
                            </div>

                            <Tabs defaultValue="whatsapp" className="w-full">
                              <TabsList className="grid grid-cols-2 bg-black/40 border border-white/10 rounded-xl p-1">
                                <TabsTrigger value="whatsapp" className="rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  WhatsApp
                                </TabsTrigger>
                                <TabsTrigger value="telegram" className="rounded-lg data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                                  <Send className="w-4 h-4 mr-2" />
                                  Telegram
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="whatsapp" className="mt-4">
                                <div className="relative">
                                  <div className="absolute top-2 right-2 flex gap-2">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-green-400" onClick={() => copyToClipboard(res.whatsappMessage, "WhatsApp")}>
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <pre className="p-4 rounded-xl bg-black/60 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap font-sans min-h-[100px]">
                                    {res.whatsappMessage}
                                  </pre>
                                </div>
                              </TabsContent>
                              <TabsContent value="telegram" className="mt-4">
                                <div className="relative">
                                  <div className="absolute top-2 right-2 flex gap-2">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-blue-400" onClick={() => copyToClipboard(res.telegramMessage, "Telegram")}>
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <pre className="p-4 rounded-xl bg-black/60 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap font-sans min-h-[100px]">
                                    {res.telegramMessage}
                                  </pre>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="w-full max-w-7xl px-6 py-12 border-t border-white/5 relative z-10 flex flex-col items-center gap-8 text-sm text-gray-500 mx-auto mt-20">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center w-full">
          <span>© 2026 Affiliate Bot India</span>
          <div className="hidden md:block w-1 h-1 rounded-full bg-gray-800" />
          <span>Built by Yanik Jain</span>
        </div>
        <div className="flex items-center justify-center gap-8 w-full">
          <Link href="/support">
            <span className="hover:text-white transition-colors cursor-pointer">Support</span>
          </Link>
          <Link href="/privacy">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
          </Link>
          <Link href="/terms">
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
          </Link>
        </div>
      </footer>

      {/* AI Chat Widget */}
      {showAIChat && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black/90 backdrop-blur-xl">
          <iframe 
            src="/chat" 
            className="w-full h-full border-none"
            title="AI Assistant"
          />
        </div>
      )}
    </div>
  );
}
