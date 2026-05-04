import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ShoppingBag, Zap, Send, Bot, TrendingUp,
  Settings, Play, Square, RefreshCw, Copy, ExternalLink,
  CheckCircle, XCircle, Clock, BarChart3, MessageCircle,
  ChevronDown, ChevronUp, Star, IndianRupee, FileSpreadsheet,
  Smartphone, Activity,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SchedulerStatus {
  isRunning: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  todayCount: number;
  thisHourCount: number;
  lastBatchCount: number;
  lastBatchSuccess: boolean;
  totalSent: number;
  config: {
    affiliateTag: string;
    telegramBotToken?: string;
    telegramChannelId?: string;
    spreadsheetId?: string;
  } | null;
  recentAutomations: Array<{
    id: number;
    productTitle: string;
    price: string;
    rating: string;
    whatsappMessage: string;
    telegramMessage: string;
    affiliateTag: string;
    productUrl: string;
    createdAt: string;
  }>;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Home() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showFeed, setShowFeed] = useState(true);
  const [nextRunCountdown, setNextRunCountdown] = useState("—");

  // Config form
  const [affiliateTag, setAffiliateTag] = useState(localStorage.getItem("sl_tag") || "");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [showTokens, setShowTokens] = useState(false);

  // AI Chat
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Hi! I'm your automation assistant. Ask me about category strategy, message optimization, or how to maximize your affiliate revenue." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.config?.affiliateTag) {
          setAffiliateTag(data.config.affiliateTag);
          localStorage.setItem("sl_tag", data.config.affiliateTag);
        }
      }
    } catch {}
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setTelegramBotToken(data.telegramBotToken || "");
        setTelegramChannelId(data.telegramChannelId || "");
        setSpreadsheetId(data.spreadsheetId || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    loadConfig();
  }, []);

  // Poll status every 5 seconds when running
  useEffect(() => {
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Live countdown to next run
  useEffect(() => {
    const tick = setInterval(() => {
      setNextRunCountdown(timeUntil(status?.nextRunAt || null));
    }, 1000);
    return () => clearInterval(tick);
  }, [status?.nextRunAt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleStart = async () => {
    if (!affiliateTag.trim()) {
      toast({ title: "Affiliate Tag Required", description: "Enter your Amazon India affiliate tag first", variant: "destructive" });
      return;
    }
    setIsActioning(true);
    try {
      const res = await fetch("/api/admin/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateTag: affiliateTag.trim(),
          telegramBotToken: telegramBotToken.trim() || undefined,
          telegramChannelId: telegramChannelId.trim() || undefined,
          spreadsheetId: spreadsheetId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "🚀 Automation Started!", description: "Scraping 15 products every 20 minutes — 45/hour, ~1080/day" });
        localStorage.setItem("sl_tag", affiliateTag.trim());
        await fetchStatus();
        setShowConfig(false);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast({ title: "Failed to start", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsActioning(false);
    }
  };

  const handleStop = async () => {
    setIsActioning(true);
    try {
      await fetch("/api/admin/stop", { method: "POST" });
      toast({ title: "Automation Stopped" });
      await fetchStatus();
    } finally {
      setIsActioning(false);
    }
  };

  const handleRunNow = async () => {
    setIsActioning(true);
    try {
      const res = await fetch("/api/admin/run-now", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Batch Triggered!", description: "Running now — live feed will update in ~30 seconds" });
        setTimeout(fetchStatus, 5000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsActioning(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!affiliateTag.trim()) {
      toast({ title: "Affiliate Tag Required", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateTag: affiliateTag.trim(),
          telegramBotToken: telegramBotToken.trim() || undefined,
          telegramChannelId: telegramChannelId.trim() || undefined,
          spreadsheetId: spreadsheetId.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Config saved!" });
        localStorage.setItem("sl_tag", affiliateTag.trim());
        setShowConfig(false);
      }
    } catch {
      toast({ title: "Failed to save config", variant: "destructive" });
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
          body: JSON.stringify({ title: "Admin Chat" }),
        });
        const conv = await res.json();
        convId = conv.id;
        setConversationId(convId);
      }
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMsg += data.content;
              setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistantMsg }; return u; });
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Sorry, couldn't get a response." }; return u; });
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const isRunning = status?.isRunning ?? false;
  const hasConfig = !!(affiliateTag.trim());

  return (
    <div className="min-h-screen w-full">
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* ── Header ── */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SaleLooterz AI</h1>
              <p className="text-xs text-muted-foreground">Admin Automation Engine · Amazon India Affiliate Bot</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowAIChat(!showAIChat)} variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Bot className="w-4 h-4 mr-2" />AI Assistant
            </Button>
            <Badge className={isRunning ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1.5" : "bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1.5"}>
              <span className={`w-2 h-2 rounded-full mr-2 inline-block ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              {isRunning ? "Running" : "Stopped"}
            </Badge>
          </div>
        </motion.header>

        {/* ── Stats Row ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Sent Today", value: status?.todayCount ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "This Hour", value: status?.thisHourCount ?? 0, icon: <Activity className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "Last Batch", value: status?.lastBatchCount ?? 0, icon: <BarChart3 className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "All Time", value: status?.totalSent ?? 0, icon: <Zap className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10" },
          ].map((stat, i) => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>{stat.icon}</div>
                </div>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Main Control Panel ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <Card className={`glass-card overflow-hidden border-2 transition-colors ${isRunning ? "border-emerald-500/40" : "border-white/10"}`}>
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

                {/* Status info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    {isRunning ? (
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <Square className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {isRunning ? "Automation Active" : "Automation Stopped"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {isRunning
                          ? "Scraping 15 products every 20 min · 45/hour · ~1,080/day"
                          : "Configure and start to begin auto-sending to your channels"}
                      </p>
                    </div>
                  </div>

                  {isRunning && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-muted-foreground mb-1">Next batch in</p>
                        <p className="text-lg font-bold text-amber-400 font-mono">{nextRunCountdown}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-muted-foreground mb-1">Last run</p>
                        <p className="text-sm font-semibold text-white">{formatTime(status?.lastRunAt || null)}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-muted-foreground mb-1">Last batch</p>
                        <div className="flex items-center gap-2">
                          {status?.lastBatchSuccess
                            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                            : <XCircle className="w-4 h-4 text-red-400" />}
                          <span className="text-sm font-semibold text-white">{status?.lastBatchSuccess ? "Success" : "Failed"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Control buttons */}
                <div className="flex flex-col gap-3 min-w-[200px]">
                  {!isRunning ? (
                    <Button
                      onClick={handleStart}
                      disabled={isActioning || !hasConfig}
                      className="h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-xl shadow-emerald-500/20"
                      data-testid="button-start"
                    >
                      {isActioning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                      Start Automation
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleRunNow}
                        disabled={isActioning}
                        variant="outline"
                        className="h-12 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        data-testid="button-run-now"
                      >
                        {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Run Batch Now
                      </Button>
                      <Button
                        onClick={handleStop}
                        disabled={isActioning}
                        variant="outline"
                        className="h-12 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid="button-stop"
                      >
                        {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                        Stop Automation
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => setShowConfig(!showConfig)}
                    variant="ghost"
                    className="h-10 text-muted-foreground hover:text-white"
                    data-testid="button-toggle-config"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {showConfig ? "Hide" : "Configure"}
                    {showConfig ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </div>

              {/* Config panel */}
              <AnimatePresence>
                {showConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-8 pt-8 border-t border-white/10 space-y-5">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-amber-400" />
                        Automation Configuration
                      </h3>

                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <IndianRupee className="w-4 h-4" /> Amazon Affiliate Tag *
                          </label>
                          <Input
                            value={affiliateTag}
                            onChange={e => setAffiliateTag(e.target.value)}
                            placeholder="yourtag-21"
                            className="bg-background/50 border-white/10"
                            data-testid="input-affiliate-tag"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" /> Google Sheet ID (optional)
                          </label>
                          <Input
                            value={spreadsheetId}
                            onChange={e => setSpreadsheetId(e.target.value)}
                            placeholder="Sheet ID or full URL"
                            className="bg-background/50 border-white/10"
                            data-testid="input-sheet-id"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Smartphone className="w-4 h-4" /> Telegram Bot Token
                          </label>
                          <Input
                            value={telegramBotToken}
                            onChange={e => setTelegramBotToken(e.target.value)}
                            placeholder="1234567890:AAF..."
                            type={showTokens ? "text" : "password"}
                            className="bg-background/50 border-white/10"
                            data-testid="input-telegram-token"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Send className="w-4 h-4" /> Telegram Channel ID
                          </label>
                          <Input
                            value={telegramChannelId}
                            onChange={e => setTelegramChannelId(e.target.value)}
                            placeholder="@yourchannel or -100..."
                            className="bg-background/50 border-white/10"
                            data-testid="input-telegram-channel"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" id="show-tokens" checked={showTokens} onChange={e => setShowTokens(e.target.checked)} className="accent-purple-500" />
                        <label htmlFor="show-tokens">Show sensitive values</label>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
                        <p className="font-semibold mb-1">ℹ️ WhatsApp Auto-Send</p>
                        <p className="text-amber-300/80">WhatsApp doesn't allow bots to post to channels without the official WhatsApp Business API. Messages are generated and stored — you can copy them from the live feed below. For auto-posting, Telegram is fully automated.</p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={isRunning ? handleSaveConfig : handleStart}
                          disabled={isActioning || !affiliateTag.trim()}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
                        >
                          {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                          {isRunning ? "Save & Update" : "Save & Start"}
                        </Button>
                        <Button onClick={() => setShowConfig(false)} variant="outline" className="border-white/10">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Schedule Info ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-semibold text-white">Schedule:</span>
                {[
                  { label: "Every 20 min", sub: "per batch" },
                  { label: "15 products", sub: "per batch" },
                  { label: "45/hour", sub: "auto-sent" },
                  { label: "~1,080/day", sub: "total messages" },
                  { label: "7 categories", sub: "rotating" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="text-amber-400 font-bold">{item.label}</span>
                    <span className="text-muted-foreground">{item.sub}</span>
                  </div>
                ))}
                <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Categories: 🔥 Hot Deals · 📱 Electronics · 📲 Mobiles · 🏠 Home · 👗 Fashion · 💄 Beauty · 💪 Fitness</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Live Feed ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Live Feed
              {status?.recentAutomations && status.recentAutomations.length > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
                  {status.recentAutomations.length} recent
                </Badge>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <Button onClick={fetchStatus} variant="ghost" size="icon" className="text-muted-foreground hover:text-white" data-testid="button-refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={() => setShowFeed(!showFeed)} variant="ghost" size="sm" className="text-muted-foreground">
                {showFeed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showFeed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!status?.recentAutomations || status.recentAutomations.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-12 text-center">
                      <Activity className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">No messages yet</p>
                      <p className="text-muted-foreground text-sm mt-1">Start the automation or run a batch to see products here</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {status.recentAutomations.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Card className="glass-card h-full overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h4 className="font-semibold text-white text-sm line-clamp-2 flex-1">{item.productTitle}</h4>
                              <div className="flex items-center gap-1 text-amber-400 shrink-0">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-xs">{item.rating}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xl font-bold text-emerald-400">₹{item.price}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>

                            <Tabs defaultValue="whatsapp" className="w-full">
                              <TabsList className="w-full bg-background/40 h-8">
                                <TabsTrigger value="whatsapp" className="flex-1 text-xs gap-1 h-7">
                                  <MessageCircle className="w-3 h-3" />WhatsApp
                                </TabsTrigger>
                                <TabsTrigger value="telegram" className="flex-1 text-xs gap-1 h-7">
                                  <Send className="w-3 h-3" />Telegram
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="whatsapp" className="mt-2">
                                <div className="relative">
                                  <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap max-h-28 overflow-y-auto text-muted-foreground border border-white/5">{item.whatsappMessage}</pre>
                                  <Button onClick={() => copyToClipboard(item.whatsappMessage, "WhatsApp")} variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 hover:bg-white/10">
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TabsContent>
                              <TabsContent value="telegram" className="mt-2">
                                <div className="relative">
                                  <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap max-h-28 overflow-y-auto text-muted-foreground border border-white/5">{item.telegramMessage}</pre>
                                  <Button onClick={() => copyToClipboard(item.telegramMessage, "Telegram")} variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 hover:bg-white/10">
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TabsContent>
                            </Tabs>

                            <a href={`${item.productUrl}?tag=${item.affiliateTag}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                              <ExternalLink className="w-3 h-3" /> View on Amazon
                            </a>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── AI Chat ── */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] sm:h-[580px] z-50">
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
                          {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
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
                    placeholder="Ask about categories, strategy..."
                    className="pr-12 bg-white/5 border-white/10"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    disabled={chatLoading}
                    data-testid="input-chat"
                  />
                  <Button size="icon" className="absolute right-1 top-1 bottom-1 h-auto bg-purple-600 hover:bg-purple-700" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
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
