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
  MessageCircle, Send, LogOut, Smartphone, Bot, TrendingUp, BarChart3
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const userId = user?.id;
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
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
  const [chatMessages, setChatMessages] = useState<Array<{role: string; content: string}>>([
    { role: "assistant", content: "Hi! I'm your AI assistant. I can help you find hot products, optimize your affiliate tags, or troubleshoot your setup. What's on your mind?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const fetchWithAuth = async (url: string) => {
    const res = await fetch(url);
    if (res.status === 401) {
      window.location.href = "/api/login";
      return null;
    }
    return res;
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    
    if (userId) {
      setUsername(storedUsername || (user as any)?.firstName || "");
      
      Promise.all([
        fetchWithAuth("/api/categories")
          .then(res => res?.json())
          .then(data => {
            if (data) {
              setCategories([
                { id: "hot", name: "Hot Deals", icon: "🔥", description: "Today's Best" },
                ...data.categories
              ]);
            }
          }),
        fetchWithAuth("/api/automations")
          .then(res => res?.json())
          .then(data => {
            if (data) {
              setWeeklyStats({
                weeklyCount: data.dailyCount,
                remaining: data.remaining,
                weeklyLimit: data.dailyLimit
              });
            }
          }),
        fetchWithAuth("/api/user/sheets-id")
          .then(async res => {
            if (!res || res.status === 404) return null;
            return res.json();
          })
          .then(data => {
            if (data) setSheetsId(data.sheetsId || "");
          })
          .catch(() => setSheetsId("")),
        fetchWithAuth("/api/user/telegram")
          .then(async res => {
            if (!res || res.status === 404) return null;
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
        fetchWithAuth("/api/user/whatsapp")
          .then(async res => {
            if (!res || res.status === 404) return null;
            return res.json();
          })
          .then(data => {
            if (data) setWhatsappChannelUrl(data.whatsappChannelUrl || "");
          })
          .catch(() => {
            setWhatsappChannelUrl("");
          }),
        fetchWithAuth("/api/analytics/scrapes")
          .then(res => res?.json())
          .then(data => {
            if (data) setAnalyticsData(data);
          })
          .catch(console.error)
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

      fetch("/api/user/sheets-id", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sheetsId: sheetId })
      }).catch(() => {});
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

    setIsLoading(true);
    setDiscoveryResult(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
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
        setWeeklyStats(prev => ({
          ...prev,
          weeklyCount: data.dailyCount,
          remaining: data.remaining >= 0 ? data.remaining : prev.remaining,
        }));
        toast({
          title: `Found ${data.count} Products!`,
          description: "All products with viral messages generated successfully",
        });
      } else if (data.requiresPayment) {
        setLocation("/pricing");
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
      const response = await fetch("/api/user/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      const response = await fetch("/api/user/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
          "Content-Type": "application/json"
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

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: message }]);
    setChatLoading(true);

    try {
      let convId = conversationId;
      if (!convId) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "SaleLooterz Chat" })
        });
        const conv = await res.json();
        convId = conv.id;
        setConversationId(convId);
      }

      let assistantMsg = "";
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message })
      });

      if (!res.ok || !res.body) throw new Error("Failed to get response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMsg += data.content;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't get a response. Please try again." };
        return updated;
      });
    } finally {
      setChatLoading(false);
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
            <span className="text-xl font-bold text-white tracking-tight">SaleLooterz AI</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/features">
              <span className="hidden sm:inline text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Features</span>
            </Link>
            <Button 
              onClick={() => setLocation("/login")}
              variant="outline" 
              className="rounded-full px-4 sm:px-6 bg-white/5 border-white/10 text-white hover:bg-white/10 h-9 sm:h-10 text-xs sm:text-sm"
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
            Scale Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-[length:200%_auto] animate-gradient-x">Affiliate Empire.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mb-12 leading-relaxed"
          >
            The premium automation engine for Amazon India creators. Turn browsing into high-conversion viral assets in one click.
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
            <span>© 2026 SaleLooterz AI India</span>
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
              <h1 className="text-2xl font-bold text-white tracking-tight">SaleLooterz AI</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Scraping Activity</h3>
                  <p className="text-sm text-muted-foreground">Your daily product discovery trends</p>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="h-[200px] sm:h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                    />
                    <YAxis 
                      hide={true}
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1e1b4b', border: 'none', borderRadius: '8px', color: '#fff'}}
                      itemStyle={{color: '#a855f7'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#a855f7" 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Growth Potential</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Reach</p>
                    <p className="text-2xl font-bold text-white">{(weeklyStats.weeklyCount * 450).toLocaleString()}+</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-muted-foreground mb-1">Efficiency Score</p>
                    <p className="text-2xl font-bold text-white">98.4%</p>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none">
                View Detailed Insights
              </Button>
            </CardContent>
          </Card>
        </div>

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
                    onClick={() => setShowTelegramForm(true)}
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
                  <Input
                    value={tempTelegramBotToken}
                    onChange={(e) => setTempTelegramBotToken(e.target.value)}
                    placeholder="Bot Token"
                    className="h-10 bg-gray-900 border-gray-700 text-white text-sm"
                    type="password"
                    data-testid="input-telegram-token"
                  />
                  <Input
                    value={tempTelegramChannelId}
                    onChange={(e) => setTempTelegramChannelId(e.target.value)}
                    placeholder="Channel ID"
                    className="h-10 bg-gray-900 border-gray-700 text-white text-sm"
                    data-testid="input-telegram-channel"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTelegram}
                      disabled={telegramLoading || !tempTelegramBotToken.trim() || !tempTelegramChannelId.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Connect
                    </Button>
                    <Button
                      onClick={() => setShowTelegramForm(false)}
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
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Your Amazon India Affiliate Tag
                  </label>
                  <Input
                    value={affiliateTag}
                    onChange={(e) => setAffiliateTag(e.target.value)}
                    placeholder="yourtag-21"
                    className="h-12 sm:h-14 text-base sm:text-lg bg-background/50 border-white/10"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 sm:mb-3 block">
                    Products to Scrape
                  </label>
                  <Input
                    type="number"
                    value={productLimit}
                    onChange={(e) => setProductLimit(Math.max(1, Math.min(weeklyStats.remaining, parseInt(e.target.value) || 1)))}
                    className="h-12 sm:h-14 text-base sm:text-lg bg-background/50 border-white/10 text-center"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="text-sm font-medium text-muted-foreground mb-4 block text-center">
                  Select Product Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 text-center ${
                        selectedCategory === cat.id
                          ? "bg-amber-500/20 border-amber-500/50 shadow-lg"
                          : "bg-card/40 border-white/5 hover:border-white/20"
                      }`}
                      disabled={isLoading}
                    >
                      <span className="text-3xl block mb-2">{cat.icon}</span>
                      <span className="text-xs font-semibold block text-white/80">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleDiscover}
                disabled={isLoading || !affiliateTag || weeklyStats.remaining <= 0}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl transition-all duration-300"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Scraping...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Zap className="w-6 h-6" />
                    Scrape & Generate
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
              <Card className="glass-card border-emerald-500/30 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Found {discoveryResult.count} Products!</h3>
                    </div>
                    <Button
                      onClick={handleSendAllToChannels}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Post All to Channels
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {discoveryResult.results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="glass-card h-full flex flex-col overflow-hidden group">
                      <div className="relative aspect-video overflow-hidden">
                        <img 
                          src={result.product.image} 
                          alt={result.product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-amber-500 text-black font-bold">
                            {result.product.discount}
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-6 flex-1 flex flex-col">
                        <h4 className="font-semibold text-white line-clamp-2 mb-4">
                          {result.product.title}
                        </h4>
                        
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">₹{result.product.price}</span>
                            <span className="text-sm text-muted-foreground line-through">₹{result.product.originalPrice}</span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm font-medium">{result.product.rating}</span>
                          </div>
                        </div>

                        <div className="space-y-3 mt-auto">
                          <Tabs defaultValue="whatsapp" className="w-full">
                            <TabsList className="w-full bg-background/40">
                              <TabsTrigger value="whatsapp" className="flex-1 gap-2">
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                              </TabsTrigger>
                              <TabsTrigger value="telegram" className="flex-1 gap-2">
                                <Send className="w-4 h-4" /> Telegram
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="whatsapp" className="mt-2">
                              <div className="relative">
                                <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap h-32 overflow-y-auto text-muted-foreground border border-white/5">
                                  {result.whatsappMessage}
                                </pre>
                                <Button
                                  onClick={() => copyToClipboard(result.whatsappMessage, "WhatsApp")}
                                  variant="ghost" size="icon"
                                  className="absolute top-2 right-2 hover:bg-white/10"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TabsContent>
                            <TabsContent value="telegram" className="mt-2">
                              <div className="relative">
                                <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap h-32 overflow-y-auto text-muted-foreground border border-white/5">
                                  {result.telegramMessage}
                                </pre>
                                <Button
                                  onClick={() => copyToClipboard(result.telegramMessage, "Telegram")}
                                  variant="ghost" size="icon"
                                  className="absolute top-2 right-2 hover:bg-white/10"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] sm:h-[600px] z-50"
          >
            <Card className="glass-card h-full shadow-2xl flex flex-col border-2 border-purple-500/30">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-purple-500/10">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span className="font-bold text-white">SaleLooterz AI Assistant</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAIChat(false)}>
                  <span className="text-xl leading-none">×</span>
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4" id="chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl border max-w-[80%] text-sm ${
                      msg.role === "user"
                        ? "bg-purple-600/30 border-purple-500/30 text-white rounded-tr-none"
                        : "bg-white/5 border-white/10 text-gray-200 rounded-tl-none"
                    }`}>
                      {msg.content || (chatLoading && i === chatMessages.length - 1 ? (
                        <span className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: "0ms"}} />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}} />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}} />
                        </span>
                      ) : "")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="relative">
                  <Input
                    placeholder="Ask me anything..."
                    className="pr-12 bg-white/5 border-white/10"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    disabled={chatLoading}
                    data-testid="input-chat"
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1 bottom-1 h-auto bg-purple-600 hover:bg-purple-700"
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    data-testid="button-send-chat"
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
