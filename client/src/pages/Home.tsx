import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ShoppingBag, Zap, Send, Bot, TrendingUp,
  Settings, Play, Square, RefreshCw, Copy, ExternalLink,
  CheckCircle, XCircle, Clock, BarChart3, MessageCircle,
  ChevronDown, ChevronUp, Star, IndianRupee, FileSpreadsheet,
  Smartphone, Activity, QrCode, Wifi, WifiOff, PhoneCall,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WAState {
  status: "disconnected" | "connecting" | "qr" | "connected";
  phoneNumber: string | null;
  channelJid: string | null;
  error: string | null;
}

interface SchedulerStatus {
  isRunning: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  todayCount: number;
  thisHourCount: number;
  lastBatchCount: number;
  lastBatchSuccess: boolean;
  totalSent: number;
  telegramSent: number;
  whatsappSent: number;
  config: {
    affiliateTag: string;
    telegramBotToken?: string;
    telegramChannelId?: string;
    whatsappChannelJid?: string;
    spreadsheetId?: string;
  } | null;
  whatsapp: WAState;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function timeUntil(iso: string | null) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── WhatsApp Setup Panel ─────────────────────────────────────────────────────
function WhatsAppPanel() {
  const [waState, setWaState] = useState<WAState>({ status: "disconnected", phoneNumber: null, channelJid: null, error: null });
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [channelJid, setChannelJid] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // SSE stream for real-time updates
  useEffect(() => {
    const es = new EventSource("/api/whatsapp/stream");
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "qr") {
          setQrBase64(data.qrBase64);
        } else if (data.type === "status") {
          setWaState({ status: data.status, phoneNumber: data.phoneNumber, channelJid: data.channelJid, error: data.error });
          if (data.status === "connected") setQrBase64(null);
          if (data.channelJid) setChannelJid(data.channelJid);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setQrBase64(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch (err) {
      toast({ title: "Failed to connect", description: String(err), variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setQrBase64(null);
      toast({ title: "WhatsApp disconnected" });
    } catch {}
  };

  const handleSaveChannel = async () => {
    if (!channelJid.trim()) { toast({ title: "Enter a JID first", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid: channelJid.trim() }),
      });
      if (res.ok) toast({ title: "Channel saved!" });
    } catch {} finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/whatsapp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) toast({ title: "✅ Test message sent to your WhatsApp channel!" });
      else toast({ title: "Failed", description: data.error, variant: "destructive" });
    } catch {} finally { setTesting(false); }
  };

  const statusColor = { disconnected: "text-red-400", connecting: "text-amber-400", qr: "text-amber-400", connected: "text-emerald-400" }[waState.status];
  const statusLabel = { disconnected: "Disconnected", connecting: "Connecting…", qr: "Scan QR Code", connected: `Connected` }[waState.status];

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${waState.status === "connected" ? "bg-emerald-500/10 border-emerald-500/20" : waState.status === "qr" ? "bg-amber-500/10 border-amber-500/20" : "bg-white/5 border-white/10"}`}>
        {waState.status === "connected"
          ? <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
          : waState.status === "qr"
          ? <QrCode className="w-5 h-5 text-amber-400 shrink-0" />
          : <WifiOff className="w-5 h-5 text-red-400 shrink-0" />}
        <div className="flex-1">
          <p className={`font-semibold ${statusColor}`}>{statusLabel}</p>
          {waState.status === "connected" && waState.phoneNumber && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><PhoneCall className="w-3 h-3" /> +{waState.phoneNumber}</p>
          )}
          {waState.status === "qr" && <p className="text-xs text-amber-300/80">Open WhatsApp → Settings → Linked Devices → Link a Device</p>}
          {waState.error && <p className="text-xs text-red-400">{waState.error}</p>}
        </div>
        {waState.status === "connected" ? (
          <Button onClick={handleDisconnect} variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0">Disconnect</Button>
        ) : (
          <Button onClick={handleConnect} disabled={connecting || waState.status === "qr"} size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
          </Button>
        )}
      </div>

      {/* QR Code */}
      <AnimatePresence>
        {(waState.status === "qr" || qrBase64) && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl">
            {qrBase64 ? (
              <img src={qrBase64} alt="WhatsApp QR Code" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
              </div>
            )}
            <p className="text-sm text-gray-600 text-center font-medium">Scan with your phone's WhatsApp<br /><span className="text-xs text-gray-400">QR code refreshes every 60 seconds</span></p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel JID */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">WhatsApp Channel / Group JID</label>
        <div className="flex gap-2">
          <Input
            value={channelJid}
            onChange={e => setChannelJid(e.target.value)}
            placeholder="120363xxxxxxxx@newsletter  or  xxxxxxxx@g.us"
            className="bg-background/50 border-white/10 font-mono text-sm"
            data-testid="input-wa-jid"
          />
          <Button onClick={handleSaveChannel} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          For WhatsApp Channels: copy the channel link, the ID is in the URL (format: <code className="text-amber-400">120363...@newsletter</code>). For groups: use the group JID ending in <code className="text-amber-400">@g.us</code>
        </p>
      </div>

      {/* Test button */}
      {waState.status === "connected" && waState.channelJid && (
        <Button onClick={handleTest} disabled={testing} variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Send Test Message
        </Button>
      )}

      {/* Full transparency breakdown */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 bg-white/5 border-b border-white/10">
          <p className="font-bold text-white text-sm">Full Transparency — What SaleLooterz Can & Cannot Do</p>
          <p className="text-xs text-muted-foreground mt-0.5">Read every line of the code yourself at <code className="text-amber-400">server/whatsapp.ts</code></p>
        </div>
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {/* CAN */}
          <div className="p-5 space-y-2">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">✅ What it CAN do</p>
            {[
              "Send text messages to the ONE channel JID you configure",
              "Maintain the connection (auto-reconnect if dropped)",
              "Show you a QR code to log in",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>{t}
              </div>
            ))}
          </div>
          {/* CANNOT */}
          <div className="p-5 space-y-2">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">❌ What it CANNOT do</p>
            {[
              "Read your chats, DMs, or group messages",
              "See your contacts or call logs",
              "Download your chat history (disabled in code)",
              "Send to any number other than your channel",
              "Mark messages as read or show you as online",
              "Edit, delete, or do anything to your account",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="text-red-400 mt-0.5 shrink-0">✗</span>{t}
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 bg-amber-500/10 border-t border-amber-500/20">
          <p className="text-xs text-amber-300 leading-relaxed">
            <strong>Honest limitation:</strong> WhatsApp has no "channel-only" permission system — the QR scan is technically a full WhatsApp Web session at the protocol level. However, <strong>our code only ever calls one function: <code>sendMessage()</code></strong>. No message listeners, no chat reads, nothing else — you can verify this yourself.
          </p>
        </div>
      </div>

      {/* Recommended: secondary account */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
        <p className="text-sm font-semibold text-blue-300 flex items-center gap-2">
          <Smartphone className="w-4 h-4 shrink-0" />
          Recommended: Use a Dedicated Bot Number
        </p>
        <p className="text-xs text-blue-300/80 leading-relaxed">
          For 100% peace of mind, use a <strong>separate secondary phone number</strong> as the bot — not your personal WhatsApp. That way your personal chats are never involved at any level.
        </p>
        <ol className="text-xs text-blue-300/70 space-y-1 list-decimal list-inside">
          <li>Get a free virtual number (TextNow, Google Voice, 2ndLine, etc.)</li>
          <li>Create a new WhatsApp account on that number</li>
          <li>Go to your Channel → <strong>Add Collaborator</strong> → add the secondary number</li>
          <li>Scan the QR here with the secondary account — your personal WhatsApp is never touched</li>
        </ol>
      </div>

      {/* Step-by-step connect guide */}
      {waState.status === "disconnected" && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
          <p className="text-sm font-semibold text-white">Ready to connect?</p>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Click <strong className="text-white">Connect</strong> above — a QR code appears</li>
            <li>Open WhatsApp on your bot/secondary phone → Settings → Linked Devices → Link a Device</li>
            <li>Scan the QR code</li>
            <li>Paste your channel JID in the field above and click Save</li>
            <li>Start the automation — it auto-posts to your channel every 20 minutes</li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Home() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<"control" | "whatsapp" | "settings">("control");
  const [nextRunCountdown, setNextRunCountdown] = useState("—");

  // Settings form
  const [affiliateTag, setAffiliateTag] = useState(localStorage.getItem("sl_tag") || "");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // AI Chat
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hi! I'm your automation assistant. Ask me about categories, message strategy, or maximizing affiliate revenue." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showFeed, setShowFeed] = useState(true);

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

  useEffect(() => { fetchStatus(); loadConfig(); }, []);
  useEffect(() => { const t = setInterval(fetchStatus, 5000); return () => clearInterval(t); }, [fetchStatus]);
  useEffect(() => { const t = setInterval(() => setNextRunCountdown(timeUntil(status?.nextRunAt || null)), 1000); return () => clearInterval(t); }, [status?.nextRunAt]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleStart = async () => {
    if (!affiliateTag.trim()) { toast({ title: "Affiliate Tag Required", variant: "destructive" }); return; }
    setIsActioning(true);
    try {
      const res = await fetch("/api/admin/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateTag: affiliateTag.trim(), telegramBotToken: telegramBotToken.trim() || undefined, telegramChannelId: telegramChannelId.trim() || undefined, spreadsheetId: spreadsheetId.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "🚀 Automation Started!", description: "15 products every 20 min → 45/hour → ~1,080/day" });
        localStorage.setItem("sl_tag", affiliateTag.trim());
        await fetchStatus();
        setActiveTab("control");
      } else throw new Error(data.error);
    } catch (err) {
      toast({ title: "Failed to start", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally { setIsActioning(false); }
  };

  const handleStop = async () => {
    setIsActioning(true);
    try { await fetch("/api/admin/stop", { method: "POST" }); toast({ title: "Automation Stopped" }); await fetchStatus(); }
    finally { setIsActioning(false); }
  };

  const handleRunNow = async () => {
    setIsActioning(true);
    try {
      const res = await fetch("/api/admin/run-now", { method: "POST" });
      const data = await res.json();
      if (data.success) { toast({ title: "Batch Triggered!", description: "Check live feed in ~30 seconds" }); setTimeout(fetchStatus, 5000); }
      else throw new Error(data.error);
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally { setIsActioning(false); }
  };

  const handleSaveSettings = async () => {
    if (!affiliateTag.trim()) { toast({ title: "Affiliate Tag Required", variant: "destructive" }); return; }
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateTag: affiliateTag.trim(), telegramBotToken: telegramBotToken.trim() || undefined, telegramChannelId: telegramChannelId.trim() || undefined, spreadsheetId: spreadsheetId.trim() || undefined }),
      });
      if (res.ok) { toast({ title: "Settings saved!" }); localStorage.setItem("sl_tag", affiliateTag.trim()); }
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChannelId.trim()) {
      toast({ title: "Fill in both Bot Token and Channel ID first", variant: "destructive" });
      return;
    }
    setTestingTelegram(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: telegramBotToken.trim(), channelId: telegramChannelId.trim() }),
      });
      const data = await res.json();
      if (data.success) toast({ title: "✅ Telegram connected! Test message sent to your channel." });
      else toast({ title: "Failed", description: data.error, variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setTestingTelegram(false); }
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
        const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Admin Chat" }) });
        const conv = await res.json();
        convId = conv.id;
        setConversationId(convId);
      }
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const res = await fetch(`/api/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: message }) });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let txt = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try { const d = JSON.parse(line.slice(6)); if (d.content) { txt += d.content; setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: txt }; return u; }); } } catch {}
        }
      }
    } catch {
      setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Sorry, couldn't respond." }; return u; });
    } finally { setChatLoading(false); }
  };

  const copyText = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: `${label} copied!` }); };
  const isRunning = status?.isRunning ?? false;
  const waStatus = status?.whatsapp?.status || "disconnected";

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
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Home
              </Button>
            </Link>
            <Button onClick={() => setShowAIChat(!showAIChat)} variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Bot className="w-4 h-4 mr-2" />AI
            </Button>
            <div className="flex items-center gap-2">
              <Badge className={isRunning ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1.5" : "bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1.5"}>
                <span className={`w-2 h-2 rounded-full mr-2 inline-block ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                {isRunning ? "Running" : "Stopped"}
              </Badge>
              <Badge className={waStatus === "connected" ? "bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5" : "bg-gray-500/20 text-gray-400 border-gray-500/30 px-3 py-1.5"}>
                <Smartphone className="w-3 h-3 mr-1.5" />
                {waStatus === "connected" ? "WA ✓" : "WA —"}
              </Badge>
            </div>
          </div>
        </motion.header>

        {/* ── Stats ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Today", value: status?.todayCount ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <TrendingUp className="w-4 h-4" /> },
            { label: "This Hour", value: status?.thisHourCount ?? 0, color: "text-purple-400", bg: "bg-purple-500/10", icon: <Activity className="w-4 h-4" /> },
            { label: "Last Batch", value: status?.lastBatchCount ?? 0, color: "text-amber-400", bg: "bg-amber-500/10", icon: <BarChart3 className="w-4 h-4" /> },
            { label: "Telegram", value: status?.telegramSent ?? 0, color: "text-sky-400", bg: "bg-sky-500/10", icon: <Send className="w-4 h-4" /> },
            { label: "WhatsApp", value: status?.whatsappSent ?? 0, color: "text-green-400", bg: "bg-green-500/10", icon: <MessageCircle className="w-4 h-4" /> },
          ].map((s, i) => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className={`p-1.5 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-6 bg-white/5 border border-white/10">
              <TabsTrigger value="control" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />Control
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                WhatsApp
                {waStatus === "connected" && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
                {waStatus === "qr" && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />Settings
              </TabsTrigger>
            </TabsList>

            {/* ── Control Tab ── */}
            <TabsContent value="control" className="space-y-6">
              <Card className={`border-2 transition-colors ${isRunning ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-white/5"}`}>
                <CardContent className="p-7">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRunning ? "bg-emerald-500/20" : "bg-gray-500/20"}`}>
                          {isRunning ? <Activity className="w-6 h-6 text-emerald-400 animate-pulse" /> : <Square className="w-6 h-6 text-gray-400" />}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">{isRunning ? "Automation Active" : "Automation Stopped"}</h2>
                          <p className="text-sm text-muted-foreground">
                            {isRunning ? "15 products / 20 min · 45/hour · ~1,080/day" : "Configure settings then start"}
                          </p>
                        </div>
                      </div>

                      {isRunning && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <p className="text-xs text-muted-foreground mb-1">Next batch</p>
                            <p className="text-lg font-bold text-amber-400 font-mono">{nextRunCountdown}</p>
                          </div>
                          <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <p className="text-xs text-muted-foreground mb-1">Last run</p>
                            <p className="text-sm font-semibold text-white">{formatTime(status?.lastRunAt || null)}</p>
                          </div>
                          <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <p className="text-xs text-muted-foreground mb-1">Status</p>
                            <div className="flex items-center gap-1.5">
                              {status?.lastBatchSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                              <span className="text-sm font-semibold text-white">{status?.lastBatchSuccess ? "OK" : "Error"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Channel status mini-row */}
                      <div className="flex items-center gap-3 mt-4">
                        <div className={`flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border ${waStatus === "connected" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-muted-foreground"}`}>
                          <Smartphone className="w-3 h-3" />
                          {waStatus === "connected" ? `WhatsApp: ${status?.whatsapp?.phoneNumber ? `+${status.whatsapp.phoneNumber}` : "Connected"}` : "WhatsApp: Not connected"}
                        </div>
                        {status?.config?.telegramChannelId && (
                          <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border bg-sky-500/10 border-sky-500/20 text-sky-400">
                            <Send className="w-3 h-3" /> Telegram: {status.config.telegramChannelId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[180px]">
                      {!isRunning ? (
                        <Button onClick={handleStart} disabled={isActioning || !affiliateTag.trim()} className="h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-xl shadow-emerald-500/20" data-testid="button-start">
                          {isActioning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                          Start
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleRunNow} disabled={isActioning} variant="outline" className="h-11 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" data-testid="button-run-now">
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Run Now
                          </Button>
                          <Button onClick={handleStop} disabled={isActioning} variant="outline" className="h-11 border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="button-stop">
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                            Stop
                          </Button>
                        </>
                      )}
                      {!affiliateTag.trim() && (
                        <p className="text-xs text-amber-400 text-center flex items-center gap-1 justify-center"><AlertCircle className="w-3 h-3" /> Set affiliate tag in Settings first</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule info */}
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3 items-center text-sm">
                    <span className="font-semibold text-white">Schedule:</span>
                    {["Every 20 min", "15 products/batch", "45/hour", "~1,080/day", "7 categories rotating"].map((t, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-amber-400 text-xs font-medium">{t}</span>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">🔥 Hot · 📱 Electronics · 📲 Mobiles · 🏠 Home · 👗 Fashion · 💄 Beauty · 💪 Fitness</span>
                  </div>
                </CardContent>
              </Card>

              {/* Live Feed */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Live Feed
                    {status?.recentAutomations && status.recentAutomations.length > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">{status.recentAutomations.length}</Badge>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button onClick={fetchStatus} variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8"><RefreshCw className="w-3.5 h-3.5" /></Button>
                    <Button onClick={() => setShowFeed(!showFeed)} variant="ghost" size="sm" className="text-muted-foreground h-8">
                      {showFeed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {showFeed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {!status?.recentAutomations?.length ? (
                        <Card className="bg-white/5 border-white/10">
                          <CardContent className="p-10 text-center">
                            <Activity className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-muted-foreground">No messages yet — start the automation or run a batch</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {status.recentAutomations.map((item, i) => (
                            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                              <Card className="h-full border border-white/10 hover:border-white/20 transition-colors bg-white/5">
                                <CardContent className="p-5">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h4 className="font-semibold text-white text-sm line-clamp-2 flex-1">{item.productTitle}</h4>
                                    <div className="flex items-center gap-1 text-amber-400 shrink-0">
                                      <Star className="w-3 h-3 fill-current" />
                                      <span className="text-xs">{item.rating}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-xl font-bold text-emerald-400">₹{item.price}</span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </div>
                                  <Tabs defaultValue="whatsapp" className="w-full">
                                    <TabsList className="w-full bg-background/40 h-8">
                                      <TabsTrigger value="whatsapp" className="flex-1 text-xs gap-1 h-7"><MessageCircle className="w-3 h-3" />WA</TabsTrigger>
                                      <TabsTrigger value="telegram" className="flex-1 text-xs gap-1 h-7"><Send className="w-3 h-3" />TG</TabsTrigger>
                                    </TabsList>
                                    {[{ key: "whatsapp", msg: item.whatsappMessage }, { key: "telegram", msg: item.telegramMessage }].map(({ key, msg }) => (
                                      <TabsContent key={key} value={key} className="mt-2">
                                        <div className="relative">
                                          <pre className="text-xs p-3 bg-black/40 rounded-lg whitespace-pre-wrap max-h-28 overflow-y-auto text-muted-foreground border border-white/5">{msg}</pre>
                                          <Button onClick={() => copyText(msg, key === "whatsapp" ? "WhatsApp" : "Telegram")} variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 hover:bg-white/10"><Copy className="w-3 h-3" /></Button>
                                        </div>
                                      </TabsContent>
                                    ))}
                                  </Tabs>
                                  <a href={`${item.productUrl}?tag=${item.affiliateTag}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                                    <ExternalLink className="w-3 h-3" /> Amazon link
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
              </div>
            </TabsContent>

            {/* ── WhatsApp Tab ── */}
            <TabsContent value="whatsapp">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-7">
                  <div className="flex items-center gap-2 mb-6">
                    <Smartphone className="w-6 h-6 text-green-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">WhatsApp Auto-Send</h2>
                      <p className="text-sm text-muted-foreground">Link your phone once — messages auto-post to your channel</p>
                    </div>
                  </div>
                  <WhatsAppPanel />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Settings Tab ── */}
            <TabsContent value="settings">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-7 space-y-5">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-amber-400" />Automation Settings</h2>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2"><IndianRupee className="w-4 h-4" />Amazon Affiliate Tag *</label>
                      <Input value={affiliateTag} onChange={e => setAffiliateTag(e.target.value)} placeholder="yourtag-21" className="bg-background/50 border-white/10" data-testid="input-affiliate-tag" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Google Sheet ID</label>
                      <Input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="Sheet ID from URL" className="bg-background/50 border-white/10" data-testid="input-sheet-id" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2"><Send className="w-4 h-4" />Telegram Bot Token</label>
                      <Input value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} placeholder="1234567890:AAF..." type={showTokens ? "text" : "password"} className="bg-background/50 border-white/10" data-testid="input-telegram-token" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2"><Send className="w-4 h-4" />Telegram Channel ID</label>
                      <Input value={telegramChannelId} onChange={e => setTelegramChannelId(e.target.value)} placeholder="@yourchannel or -100..." className="bg-background/50 border-white/10" data-testid="input-telegram-channel" />
                    </div>
                  </div>

                  {/* Telegram setup guide */}
                  <div className="rounded-xl border border-sky-500/20 overflow-hidden">
                    <div className="px-5 py-3 bg-sky-500/10 border-b border-sky-500/20 flex items-center gap-2">
                      <Send className="w-4 h-4 text-sky-400" />
                      <p className="text-sm font-semibold text-sky-300">How to connect your Telegram channel</p>
                    </div>
                    <div className="px-5 py-4 space-y-2">
                      <ol className="space-y-2">
                        {[
                          <>Open Telegram → search <code className="text-amber-400 bg-amber-400/10 px-1 rounded">@BotFather</code> → send <code className="text-amber-400 bg-amber-400/10 px-1 rounded">/newbot</code></>,
                          <>Give it any name (e.g. <em>SaleLooterz Bot</em>) and a username ending in <code className="text-amber-400 bg-amber-400/10 px-1 rounded">_bot</code></>,
                          <>BotFather replies with your <strong className="text-white">Bot Token</strong> — paste it above</>,
                          <>Go to your Telegram channel → <strong className="text-white">Edit Channel</strong> → <strong className="text-white">Administrators</strong> → Add Admin → search your bot username → add it as admin with <em>Post Messages</em> permission</>,
                          <>For Channel ID: open your channel, the link looks like <code className="text-amber-400 bg-amber-400/10 px-1 rounded">t.me/yourchannelname</code> → use <code className="text-amber-400 bg-amber-400/10 px-1 rounded">@yourchannelname</code> as the Channel ID above. Or forward any channel message to <code className="text-amber-400 bg-amber-400/10 px-1 rounded">@userinfobot</code> to get the numeric ID.</>,
                          <>Click <strong className="text-white">Test Telegram</strong> below — if it shows ✅ you're done!</>,
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs text-gray-300">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Test Telegram button */}
                  {(telegramBotToken || telegramChannelId) && (
                    <Button onClick={handleTestTelegram} disabled={testingTelegram} variant="outline" className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10" data-testid="button-test-telegram">
                      {testingTelegram ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Test Telegram
                    </Button>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" id="show-tokens" checked={showTokens} onChange={e => setShowTokens(e.target.checked)} className="accent-purple-500" />
                    <label htmlFor="show-tokens">Show sensitive values</label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSaveSettings} disabled={!affiliateTag.trim()} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold">
                      <Zap className="w-4 h-4 mr-2" />Save Settings
                    </Button>
                    {!isRunning && (
                      <Button onClick={handleStart} disabled={isActioning || !affiliateTag.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        Save & Start
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* ── AI Chat ── */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed bottom-6 right-6 w-[90vw] sm:w-[380px] h-[520px] z-50">
            <Card className="h-full shadow-2xl flex flex-col border-2 border-purple-500/30 bg-black/90 backdrop-blur">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-purple-500/10">
                <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-400" /><span className="font-bold text-white">AI Assistant</span></div>
                <Button variant="ghost" size="icon" onClick={() => setShowAIChat(false)}><span className="text-xl">×</span></Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-purple-400" /></div>}
                    <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${msg.role === "user" ? "bg-purple-600/30 border border-purple-500/30 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"}`}>
                      {msg.content || (chatLoading && i === chatMessages.length - 1 ? <span className="flex gap-1">{[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span> : "")}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/10">
                <div className="relative">
                  <Input placeholder="Ask about strategy, categories…" className="pr-11 bg-white/5 border-white/10 text-sm" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }} disabled={chatLoading} data-testid="input-chat" />
                  <Button size="icon" className="absolute right-1 top-1 bottom-1 h-auto w-9 bg-purple-600 hover:bg-purple-700" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                    {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
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
