import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Check, Loader2, FileSpreadsheet,
  Zap, Copy, ArrowRight, ShoppingBag, IndianRupee, Star,
  MessageCircle, Send, Smartphone, Bot, TrendingUp,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";

// Anonymous user ID — generated once and stored in localStorage
function getOrCreateUserId(): string {
  let id = localStorage.getItem("sl_uid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sl_uid", id);
  }
  return id;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface DiscoveryResult {
  success: boolean;
  count: number;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
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
  const userId = getOrCreateUserId();

  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [affiliateTag, setAffiliateTag] = useState(localStorage.getItem("sl_tag") || "");
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
  const [dailyStats, setDailyStats] = useState({ dailyCount: 0, remaining: 50, dailyLimit: 50 });

  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Hi! I'm your AI assistant. Ask me about hot products, affiliate tags, or anything about your setup." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const authHeaders = { "Content-Type": "application/json", "x-user-id": userId };

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: { ...authHeaders, ...(options?.headers || {}) },
    });
    return res;
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then(r => r.json()).then(data => {
        if (data?.categories) {
          setCategories([
            { id: "hot", name: "Hot Deals", icon: "🔥", description: "Today's Best" },
            ...data.categories,
          ]);
        }
      }).catch(() => {}),
      apiFetch("/api/automations").then(r => r.json()).then(data => {
        if (data) {
          setDailyStats({
            dailyCount: data.dailyCount ?? 0,
            remaining: data.remaining >= 0 ? data.remaining : 50,
            dailyLimit: data.dailyLimit ?? 50,
          });
        }
      }).catch(() => {}),
      apiFetch("/api/user/sheets-id").then(r => r.json()).then(data => {
        if (data) setSheetsId(data.sheetsId || "");
      }).catch(() => {}),
      apiFetch("/api/user/telegram").then(r => r.json()).then(data => {
        if (data) {
          setTelegramBotToken(data.telegramBotToken || "");
          setTelegramChannelId(data.telegramChannelId || "");
        }
      }).catch(() => {}),
      apiFetch("/api/user/whatsapp").then(r => r.json()).then(data => {
        if (data) setWhatsappChannelUrl(data.whatsappChannelUrl || "");
      }).catch(() => {}),
      apiFetch("/api/analytics/scrapes").then(r => r.json()).then(data => {
        if (data) setAnalyticsData(data);
      }).catch(() => {}),
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Save affiliate tag to localStorage whenever it changes
  useEffect(() => {
    if (affiliateTag) localStorage.setItem("sl_tag", affiliateTag);
  }, [affiliateTag]);

  const handleSaveSheets = async () => {
    if (!tempSheetsId.trim()) {
      toast({ title: "Invalid Sheet ID", description: "Please paste your Google Sheet ID or full URL", variant: "destructive" });
      return;
    }
    let sheetId = tempSheetsId.trim();
    const urlMatch = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) sheetId = urlMatch[1];

    setSheetsLoading(true);
    try {
      await apiFetch("/api/user/sheets-id", { method: "POST", body: JSON.stringify({ sheetsId: sheetId }) });
      setSheetsId(sheetId);
      setShowSheetsForm(false);
      toast({ title: "Google Sheet saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save Google Sheet", variant: "destructive" });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleDiscover = async () => {
    if (!affiliateTag) {
      toast({ title: "Affiliate Tag Required", description: "Enter your Amazon India affiliate tag (e.g. yourtag-21)", variant: "destructive" });
      return;
    }
    if (dailyStats.remaining <= 0) {
      toast({ title: "Daily Limit Reached", description: "You've used all 50 products today. Come back tomorrow!", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setDiscoveryResult(null);
    try {
      const response = await apiFetch("/api/discover", {
        method: "POST",
        body: JSON.stringify({ category: selectedCategory, affiliateTag, limit: productLimit }),
      });
      const data = await response.json();

      if (data.success) {
        setDiscoveryResult(data);
        setDailyStats(prev => ({
          ...prev,
          dailyCount: data.dailyCount,
          remaining: data.remaining >= 0 ? data.remaining : prev.remaining,
        }));
        toast({ title: `Found ${data.count} Products!`, description: "Viral messages generated successfully" });
      } else {
        throw new Error(data.error || "Discovery failed");
      }
    } catch (error) {
      toast({ title: "Discovery Failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!tempTelegramBotToken.trim() || !tempTelegramChannelId.trim()) {
      toast({ title: "Missing Fields", description: "Enter both bot token and channel ID", variant: "destructive" });
      return;
    }
    setTelegramLoading(true);
    try {
      const res = await apiFetch("/api/user/telegram", {
        method: "POST",
        body: JSON.stringify({ telegramBotToken: tempTelegramBotToken.trim(), telegramChannelId: tempTelegramChannelId.trim() }),
      });
      if (res.ok) {
        setTelegramBotToken(tempTelegramBotToken.trim());
        setTelegramChannelId(tempTelegramChannelId.trim());
        setShowTelegramForm(false);
        toast({ title: "Telegram connected!" });
      } else throw new Error();
    } catch {
      toast({ title: "Error", description: "Failed to save Telegram config", variant: "destructive" });
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!tempWhatsappChannelUrl.trim()) {
      toast({ title: "Missing URL", description: "Enter your WhatsApp channel URL", variant: "destructive" });
      return;
    }
    setWhatsappLoading(true);
    try {
      const res = await apiFetch("/api/user/whatsapp", {
        method: "POST",
        body: JSON.stringify({ whatsappChannelUrl: tempWhatsappChannelUrl.trim() }),
      });
      if (res.ok) {
        setWhatsappChannelUrl(tempWhatsappChannelUrl.trim());
        setShowWhatsappForm(false);
        toast({ title: "WhatsApp connected!" });
      } else throw new Error();
    } catch {
      toast({ title: "Error", description: "Failed to save WhatsApp config", variant: "destructive" });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleSendAllToChannels = async () => {
    if (!discoveryResult) return;
    if (!telegramBotToken) {
      toast({ title: "No Telegram Configured", description: "Connect Telegram first", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/send-bulk-messages", {
        method: "POST",
        body: JSON.stringify({
          products: discoveryResult.results,
          telegramBotToken: telegramBotToken || null,
          telegramChannelId: telegramChannelId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Messages Sent!", description: `Sent ${data.sentCount} messages to your Telegram channel` });
      } else throw new Error(data.error);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to send messages", variant: "destructive" });
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
          body: JSON.stringify({ title: "SaleLooterz Chat" }),
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
        body: JSON.stringify({ content: message }),
      });

      if (!res.ok || !res.body) throw new Error("No response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n").filter(l => l.startsWith("data: "))) {
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
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, couldn't get a response. Please try again." };
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

  return (
    <div className="min-h-screen w-full">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SaleLooterz AI</h1>
              <p className="text-xs text-muted-foreground">Automated Message Generation & Google Sheets Export</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAIChat(!showAIChat)}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
              data-testid="button-toggle-ai-chat"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI Assistant
            </Button>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 inline-block" />
              Live
            </Badge>
          </div>
        </motion.header>

        {/* Analytics + Growth */}
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
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: "#1e1b4b", border: "none", borderRadius: "8px", color: "#fff" }} itemStyle={{ color: "#a855f7" }} />
                    <Area type="monotone" dataKey="count" stroke="#a855f7" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 flex flex-col h-full">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Today's Usage</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-muted-foreground mb-1">Products Scraped Today</p>
                    <p className="text-2xl font-bold text-white">{dailyStats.dailyCount} / {dailyStats.dailyLimit}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-muted-foreground mb-1">Remaining Today</p>
                    <p className={`text-2xl font-bold ${dailyStats.remaining <= 10 ? "text-amber-400" : "text-emerald-400"}`}>
                      {dailyStats.remaining >= 0 ? dailyStats.remaining : "∞"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Google Sheets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <Card className={`glass-card overflow-hidden border-2 ${sheetsId ? "border-emerald-500/30" : "border-amber-500/30"}`}>
            <CardContent className="p-6">
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

              {!showSheetsForm && !sheetsId && (
                <Button onClick={() => setShowSheetsForm(true)} className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" data-testid="button-add-sheets">
                  Add Sheet ID
                </Button>
              )}
              {!showSheetsForm && sheetsId && (
                <Button onClick={() => { setTempSheetsId(sheetsId); setShowSheetsForm(true); }} variant="outline" className="mt-4 w-full" data-testid="button-edit-sheets">
                  Edit Sheet ID
                </Button>
              )}
              {showSheetsForm && (
                <div className="mt-4 space-y-3">
                  <Input value={tempSheetsId} onChange={e => setTempSheetsId(e.target.value)} placeholder="Paste full URL or Sheet ID" className="h-10 bg-gray-900 border-gray-700 text-white text-sm" data-testid="input-sheets-id" />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSheets} disabled={sheetsLoading || !tempSheetsId.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-700" data-testid="button-save-sheets">
                      {sheetsLoading ? "Saving..." : "Save Sheet"}
                    </Button>
                    <Button onClick={() => { setShowSheetsForm(false); setTempSheetsId(""); }} variant="outline" className="flex-1">Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Telegram */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
          <Card className={`glass-card overflow-hidden border-2 ${telegramBotToken && telegramChannelId ? "border-emerald-500/30" : "border-purple-500/30"}`}>
            <CardContent className="p-6">
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

              {!showTelegramForm && !telegramBotToken && (
                <Button onClick={() => setShowTelegramForm(true)} className="mt-4 w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold" data-testid="button-add-telegram">
                  Connect Telegram
                </Button>
              )}
              {!showTelegramForm && telegramBotToken && (
                <Button onClick={() => { setTempTelegramBotToken(telegramBotToken); setTempTelegramChannelId(telegramChannelId); setShowTelegramForm(true); }} variant="outline" className="mt-4 w-full" data-testid="button-edit-telegram">
                  Edit Connection
                </Button>
              )}
              {showTelegramForm && (
                <div className="mt-4 space-y-3">
                  <Input value={tempTelegramBotToken} onChange={e => setTempTelegramBotToken(e.target.value)} placeholder="Bot Token" className="h-10 bg-gray-900 border-gray-700 text-white text-sm" type="password" data-testid="input-telegram-token" />
                  <Input value={tempTelegramChannelId} onChange={e => setTempTelegramChannelId(e.target.value)} placeholder="Channel ID (e.g. @mychannel)" className="h-10 bg-gray-900 border-gray-700 text-white text-sm" data-testid="input-telegram-channel" />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTelegram} disabled={telegramLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      {telegramLoading ? "Saving..." : "Connect"}
                    </Button>
                    <Button onClick={() => setShowTelegramForm(false)} variant="outline" className="flex-1">Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* WhatsApp */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <Card className={`glass-card overflow-hidden border-2 ${whatsappChannelUrl ? "border-emerald-500/30" : "border-green-500/30"}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${whatsappChannelUrl ? "bg-emerald-500/20" : "bg-green-500/20"}`}>
                  <MessageCircle className={`w-6 h-6 ${whatsappChannelUrl ? "text-emerald-400" : "text-green-400"}`} />
                </div>
                <div>
                  <p className="font-semibold text-white">WhatsApp Channel</p>
                  <p className={`text-sm ${whatsappChannelUrl ? "text-emerald-400" : "text-green-400"}`}>
                    {whatsappChannelUrl ? "✓ Channel URL saved" : "Save your WhatsApp channel link"}
                  </p>
                </div>
              </div>

              {!showWhatsappForm && !whatsappChannelUrl && (
                <Button onClick={() => setShowWhatsappForm(true)} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold" data-testid="button-add-whatsapp">
                  Add WhatsApp Channel
                </Button>
              )}
              {!showWhatsappForm && whatsappChannelUrl && (
                <Button onClick={() => { setTempWhatsappChannelUrl(whatsappChannelUrl); setShowWhatsappForm(true); }} variant="outline" className="mt-4 w-full" data-testid="button-edit-whatsapp">
                  Edit Channel URL
                </Button>
              )}
              {showWhatsappForm && (
                <div className="mt-4 space-y-3">
                  <Input value={tempWhatsappChannelUrl} onChange={e => setTempWhatsappChannelUrl(e.target.value)} placeholder="https://whatsapp.com/channel/..." className="h-10 bg-gray-900 border-gray-700 text-white text-sm" data-testid="input-whatsapp-url" />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveWhatsapp} disabled={whatsappLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      {whatsappLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={() => setShowWhatsappForm(false)} variant="outline" className="flex-1">Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Scraper */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Scrape Products from </span>
              <span className="gradient-text">Amazon.in</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select category → Auto-scrape products → Get viral WhatsApp & Telegram messages → Export to Google Sheets
            </p>
          </div>

          <Card className="glass-card mb-8 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Amazon India Affiliate Tag
                  </label>
                  <Input
                    value={affiliateTag}
                    onChange={e => setAffiliateTag(e.target.value)}
                    placeholder="yourtag-21"
                    className="h-12 sm:h-14 text-base sm:text-lg bg-background/50 border-white/10"
                    disabled={isLoading}
                    data-testid="input-affiliate-tag"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">Products to Scrape</label>
                  <Input
                    type="number"
                    value={productLimit}
                    onChange={e => setProductLimit(Math.max(1, Math.min(dailyStats.remaining > 0 ? dailyStats.remaining : 50, parseInt(e.target.value) || 1)))}
                    className="h-12 sm:h-14 text-base sm:text-lg bg-background/50 border-white/10 text-center"
                    disabled={isLoading}
                    data-testid="input-product-limit"
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="text-sm font-medium text-muted-foreground mb-4 block text-center">Select Product Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 text-center ${selectedCategory === cat.id ? "bg-amber-500/20 border-amber-500/50 shadow-lg" : "bg-card/40 border-white/5 hover:border-white/20"}`}
                      disabled={isLoading}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <span className="text-3xl block mb-2">{cat.icon}</span>
                      <span className="text-xs font-semibold block text-white/80">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleDiscover}
                disabled={isLoading || !affiliateTag || dailyStats.remaining <= 0}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl transition-all duration-300"
                data-testid="button-discover"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3"><Loader2 className="w-6 h-6 animate-spin" />Scraping...</span>
                ) : (
                  <span className="flex items-center gap-3"><Zap className="w-6 h-6" />Scrape & Generate<ArrowRight className="w-5 h-5" /></span>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {discoveryResult && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="space-y-6">
              <Card className="glass-card border-emerald-500/30 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Found {discoveryResult.count} Products!</h3>
                    </div>
                    <Button onClick={handleSendAllToChannels} disabled={isLoading || !telegramBotToken} className="bg-purple-600 hover:bg-purple-700" data-testid="button-send-all">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Post to Telegram
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {discoveryResult.results.map((result, index) => (
                  <motion.div key={index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                    <Card className="glass-card h-full flex flex-col overflow-hidden group" data-testid={`card-product-${index}`}>
                      <div className="relative aspect-video overflow-hidden">
                        <img src={result.product.image} alt={result.product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-amber-500 text-black font-bold">{result.product.discount}</Badge>
                        </div>
                      </div>
                      <CardContent className="p-6 flex-1 flex flex-col">
                        <h4 className="font-semibold text-white line-clamp-2 mb-4">{result.product.title}</h4>
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
                                <MessageCircle className="w-4 h-4" />WhatsApp
                              </TabsTrigger>
                              <TabsTrigger value="telegram" className="flex-1 gap-2">
                                <Send className="w-4 h-4" />Telegram
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="whatsapp" className="mt-2">
                              <div className="relative">
                                <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap h-32 overflow-y-auto text-muted-foreground border border-white/5">{result.whatsappMessage}</pre>
                                <Button onClick={() => copyToClipboard(result.whatsappMessage, "WhatsApp")} variant="ghost" size="icon" className="absolute top-2 right-2 hover:bg-white/10" data-testid={`button-copy-whatsapp-${index}`}>
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TabsContent>
                            <TabsContent value="telegram" className="mt-2">
                              <div className="relative">
                                <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap h-32 overflow-y-auto text-muted-foreground border border-white/5">{result.telegramMessage}</pre>
                                <Button onClick={() => copyToClipboard(result.telegramMessage, "Telegram")} variant="ghost" size="icon" className="absolute top-2 right-2 hover:bg-white/10" data-testid={`button-copy-telegram-${index}`}>
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>

                          <a href={`${result.product.url}?tag=${affiliateTag}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full border-white/10 hover:bg-white/10">
                              View on Amazon
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </a>
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

      {/* AI Chat */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] sm:h-[600px] z-50">
            <Card className="glass-card h-full shadow-2xl flex flex-col border-2 border-purple-500/30">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-purple-500/10">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span className="font-bold text-white">AI Assistant</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAIChat(false)}>
                  <span className="text-xl leading-none">×</span>
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl border max-w-[80%] text-sm ${msg.role === "user" ? "bg-purple-600/30 border-purple-500/30 text-white rounded-tr-none" : "bg-white/5 border-white/10 text-gray-200 rounded-tl-none"}`}>
                      {msg.content || (chatLoading && i === chatMessages.length - 1 ? (
                        <span className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : "")}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="relative">
                  <Input
                    placeholder="Ask me anything..."
                    className="pr-12 bg-white/5 border-white/10"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
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
