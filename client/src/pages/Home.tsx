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
  AlertCircle, Brain,
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
  lastBatchSkipped: number;
  lastBatchSuccess: boolean;
  totalSent: number;
  telegramSent: number;
  whatsappSent: number;
  memoryCount: number;
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
  const [resolving, setResolving] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{ name: string; subscribers: number } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const isInviteLink = channelJid.includes("whatsapp.com/channel/") ||
    (channelJid.length > 8 && !channelJid.includes("@") && !channelJid.includes("."));

  // SSE stream for real-time QR / status updates
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

  // Fetch channel name when connected
  useEffect(() => {
    if (waState.status === "connected" && waState.channelJid) {
      fetch("/api/whatsapp/channel-info")
        .then(r => r.json())
        .then(d => { if (d.success && d.name && d.name !== d.jid) setChannelInfo({ name: d.name, subscribers: d.subscribers }); })
        .catch(() => {});
    } else {
      setChannelInfo(null);
    }
  }, [waState.status, waState.channelJid]);

  const handleConnect = async () => {
    setConnecting(true);
    setQrBase64(null);
    try {
      await fetch("/api/whatsapp/connect", { method: "POST" });
    } catch (err) {
      toast({ title: "Failed to start connection", description: String(err), variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setQrBase64(null);
      setChannelInfo(null);
      toast({ title: "WhatsApp disconnected" });
    } catch {}
  };

  const handleResolve = async () => {
    if (!channelJid.trim()) return;
    setResolving(true);
    try {
      const res = await fetch("/api/whatsapp/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: channelJid.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setChannelJid(data.jid);
        if (data.name && data.name !== data.jid) setChannelInfo({ name: data.name, subscribers: data.subscribers });
        await fetch("/api/whatsapp/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jid: data.jid }),
        });
        toast({ title: `✅ Channel JID saved`, description: data.jid });
      } else {
        toast({ title: "Could not resolve", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Resolve failed", description: String(err), variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!channelJid.trim()) { toast({ title: "Enter a channel JID first", variant: "destructive" }); return; }
    if (isInviteLink) { await handleResolve(); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid: channelJid.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Channel JID saved!" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {} finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/whatsapp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) toast({ title: "✅ Test message posted to your channel!" });
      else toast({ title: "Send failed", description: data.error, variant: "destructive" });
    } catch {} finally { setTesting(false); }
  };

  const statusColor = { disconnected: "text-red-400", connecting: "text-amber-400", qr: "text-amber-400", connected: "text-emerald-400" }[waState.status];
  const statusLabel = { disconnected: "Disconnected", connecting: "Connecting…", qr: "Scan QR Code", connected: "Connected" }[waState.status];

  return (
    <div className="space-y-5">

      {/* ── Critical requirement banner ── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-300">Important — Admin account required</p>
          <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
            The phone you scan the QR with <strong>must be the owner or admin of your WhatsApp Channel</strong>.
            If you scan with a regular subscriber account, messages will silently fail.
            Go to your Channel → Manage → Admins to verify.
          </p>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        waState.status === "connected" ? "bg-emerald-500/10 border-emerald-500/25" :
        waState.status === "qr"        ? "bg-amber-500/10  border-amber-500/25"  :
        "bg-white/[0.04] border-white/[0.08]"
      }`}>
        {waState.status === "connected" ? <Wifi    className="w-5 h-5 text-emerald-400 shrink-0" /> :
         waState.status === "qr"        ? <QrCode  className="w-5 h-5 text-amber-400  shrink-0" /> :
                                          <WifiOff className="w-5 h-5 text-red-400    shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`font-bold ${statusColor}`}>{statusLabel}</p>
          {waState.status === "connected" && waState.phoneNumber && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <PhoneCall className="w-3 h-3" /> +{waState.phoneNumber}
              {waState.channelJid && <span className="ml-2 text-emerald-400/70 truncate max-w-[180px]">→ {waState.channelJid}</span>}
            </p>
          )}
          {waState.status === "qr" && (
            <p className="text-xs text-amber-300/80 mt-0.5">
              WhatsApp → Linked Devices → Link a Device → scan below
            </p>
          )}
          {waState.status === "connecting" && (
            <p className="text-xs text-amber-300/80 mt-0.5">Launching browser — QR will appear in 30–60 seconds…</p>
          )}
          {waState.error && <p className="text-xs text-red-400 mt-0.5">{waState.error}</p>}
        </div>
        {waState.status === "connected" ? (
          <Button onClick={handleDisconnect} size="sm" className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 shrink-0">
            Disconnect
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={connecting || waState.status === "qr" || waState.status === "connecting"} size="sm"
            className="btn-shine rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-bold border-0 shrink-0 shadow-lg shadow-green-500/20">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
            {connecting ? "Starting…" : "Connect"}
          </Button>
        )}
      </div>

      {/* ── QR Code ── */}
      <AnimatePresence>
        {(waState.status === "qr" || qrBase64) && (
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-xl shadow-black/40">
            {qrBase64 ? (
              <img src={qrBase64} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
                <p className="text-xs text-gray-400 text-center">Generating QR…</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-gray-700 font-semibold">Scan with your channel admin phone</p>
              <p className="text-xs text-gray-400 mt-1">QR refreshes every ~60 seconds</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Channel JID ── */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          WhatsApp Channel JID
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
            @newsletter only
          </span>
        </label>

        <div className="flex gap-2">
          <Input
            value={channelJid}
            onChange={e => { setChannelJid(e.target.value); setChannelInfo(null); }}
            placeholder="0029VbBCq7B3LdQZryJPsY1r@newsletter  or  paste invite link"
            className="bg-black/20 border-white/10 font-mono text-sm rounded-xl focus:border-emerald-500/40"
            data-testid="input-wa-jid"
          />
          {isInviteLink ? (
            <Button onClick={handleResolve} disabled={resolving}
              className="bg-blue-600/80 hover:bg-blue-500 text-white rounded-xl shrink-0 border-0">
              {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span className="ml-1.5">{resolving ? "Resolving…" : "Resolve"}</span>
            </Button>
          ) : (
            <Button onClick={handleSaveChannel} disabled={saving}
              className="btn-shine bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shrink-0 border-0 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          )}
        </div>

        {/* Saved channel badge */}
        <AnimatePresence>
          {channelInfo && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-emerald-300 truncate flex-1">{channelInfo.name}</p>
              {channelInfo.subscribers > 0 && (
                <span className="text-xs text-emerald-400/70 shrink-0">{channelInfo.subscribers.toLocaleString("en-IN")} subscribers</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1 pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-white">How to find your Channel JID:</strong> Open WhatsApp Web → your channel → copy the invite link
            (<code className="text-blue-400 text-[11px]">https://whatsapp.com/channel/0029Vb…</code>). Paste it above and click <strong className="text-white">Resolve</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Or paste the raw JID directly: <code className="text-amber-400 text-[11px]">0029VbXXXXXXXX@newsletter</code>
          </p>
        </div>
      </div>

      {/* ── Test send ── */}
      {waState.status === "connected" && waState.channelJid && (
        <Button onClick={handleTest} disabled={testing}
          className="w-full h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 font-semibold">
          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Send Test Message to Channel
        </Button>
      )}

      {/* ── Setup guide ── */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-5 py-3 bg-white/[0.04] border-b border-white/[0.07] flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <p className="font-bold text-white text-sm">Step-by-step Setup</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { n: "1", label: "Verify admin access", desc: "In your WhatsApp Channel → Manage → confirm your phone number is listed as Owner or Admin." },
            { n: "2", label: "Click Connect", desc: "Press Connect above. Within ~10 seconds a QR code appears." },
            { n: "3", label: "Scan with admin phone", desc: "Open WhatsApp on the admin phone → Settings → Linked Devices → Link a Device → scan the QR." },
            { n: "4", label: "Set the channel JID", desc: "Paste your channel's invite link above and click Resolve. The JID is saved automatically." },
            { n: "5", label: "Test & start", desc: "Hit \"Send Test Message\" to confirm it works, then start the automation. Messages will auto-post every 20 min." },
          ].map((s) => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-black text-amber-400">{s.n}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-blue-500/[0.08] border-t border-blue-500/15">
          <p className="text-xs text-blue-300/90 leading-relaxed">
            <strong>Pro tip:</strong> Use a dedicated secondary WhatsApp number as the bot admin — add it as a channel admin, then scan the QR with that number. Your personal phone is never involved.
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── Admin PIN Screen (standalone page) ─────────────────────────────────────
function PinScreen({ onVerified }: { onVerified: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("admin_pin_ok", "1");
        onVerified();
      } else {
        setError("Wrong PIN. Try again.");
        setPin("");
      }
    } catch {
      setError("Connection error — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb absolute top-[-10%] left-[30%] w-[400px] h-[400px] bg-amber-500/10" />
        <div className="orb absolute bottom-[-10%] right-[20%] w-[300px] h-[300px] bg-purple-600/10" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-sm relative z-10">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/20 via-transparent to-purple-500/10 blur-xl -z-10 scale-110" />

        <div className="glass-card-strong rounded-3xl p-8 space-y-7">
          <div className="text-center space-y-3">
            <div className="relative mx-auto w-fit mb-2">
              <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto shadow-2xl glow-amber">
                <Bot className="w-9 h-9 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">SaleLooterz AI</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">Enter your admin PIN to<br />access the dashboard</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <Input
                type="password"
                inputMode="numeric"
                placeholder="• • • • • •"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                className="text-center text-2xl tracking-[0.5em] h-14 bg-white/5 border-white/10 rounded-2xl placeholder:tracking-normal placeholder:text-base focus:border-amber-500/50 focus:ring-amber-500/20 transition-all"
                data-testid="input-admin-pin"
              />
            </div>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-400 text-center flex items-center justify-center gap-1.5 bg-red-500/10 rounded-xl py-2.5 border border-red-500/20">
                <XCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </motion.p>
            )}
            <Button type="submit" disabled={!pin || loading} className="btn-shine w-full h-13 h-[52px] rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-base shadow-xl shadow-amber-500/30 border-0 glow-amber transition-all" data-testid="button-pin-submit">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-4 h-4 mr-2" />Unlock Dashboard</>}
            </Button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard (inner — only rendered after PIN) ─────────────────────────
function HomeDashboard() {
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
        if (data.affiliateTag) {
          setAffiliateTag(data.affiliateTag);
          localStorage.setItem("sl_tag", data.affiliateTag);
        }
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
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl shadow-xl glow-amber flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              {isRunning && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />}
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">SaleLooterz AI</h1>
              <p className="text-[11px] text-muted-foreground">Admin Automation Engine · Amazon India</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white border border-white/[0.07] hover:border-white/15 gap-1.5 rounded-xl h-9 px-3 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Home
              </Button>
            </Link>
            <Button onClick={() => setShowAIChat(!showAIChat)} size="sm" className={`rounded-xl h-9 px-3 text-xs font-semibold border transition-all ${showAIChat ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20"}`}>
              <Bot className="w-3.5 h-3.5 mr-1.5" />AI
            </Button>
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${isRunning ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
                {isRunning ? "Running" : "Stopped"}
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${waStatus === "connected" ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-white/[0.04] text-muted-foreground border-white/[0.07]"}`}>
                <Smartphone className="w-3 h-3" />
                {waStatus === "connected" ? "WA ✓" : "WA —"}
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── Stats ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Today", value: status?.todayCount ?? 0, color: "text-emerald-400 stat-glow-green", border: "border-emerald-500/15 hover:border-emerald-500/30", icon: <TrendingUp className="w-3.5 h-3.5" />, iconBg: "bg-emerald-500/15 text-emerald-400" },
            { label: "This Hour", value: status?.thisHourCount ?? 0, color: "text-purple-400 stat-glow-purple", border: "border-purple-500/15 hover:border-purple-500/30", icon: <Activity className="w-3.5 h-3.5" />, iconBg: "bg-purple-500/15 text-purple-400" },
            { label: "Telegram", value: status?.telegramSent ?? 0, color: "text-sky-400 stat-glow-sky", border: "border-sky-500/15 hover:border-sky-500/30", icon: <Send className="w-3.5 h-3.5" />, iconBg: "bg-sky-500/15 text-sky-400" },
            { label: "WhatsApp", value: status?.whatsappSent ?? 0, color: "text-green-400 stat-glow-green", border: "border-green-500/15 hover:border-green-500/30", icon: <MessageCircle className="w-3.5 h-3.5" />, iconBg: "bg-green-500/15 text-green-400" },
          ].map((s, i) => (
            <div key={i} className={`glass-card rounded-2xl p-4 border ${s.border} card-hover transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <div className={`p-1.5 rounded-lg ${s.iconBg}`}>{s.icon}</div>
              </div>
              <p className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
          {/* Memory card */}
          <div className="glass-card rounded-2xl p-4 border border-violet-500/15 hover:border-violet-500/30 card-hover transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Memory</p>
              <div className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400"><Brain className="w-3.5 h-3.5" /></div>
            </div>
            <p className="text-3xl font-black text-violet-400 stat-glow-purple">{(status?.memoryCount ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">ASINs remembered</p>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-6 glass-card border-white/[0.07] rounded-2xl p-1 h-auto gap-1">
              <TabsTrigger value="control" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground transition-all">
                <Zap className="w-3.5 h-3.5" />Control
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground transition-all">
                <Smartphone className="w-3.5 h-3.5" />
                WhatsApp
                {waStatus === "connected" && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                {waStatus === "qr" && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground transition-all">
                <Settings className="w-3.5 h-3.5" />Settings
              </TabsTrigger>
            </TabsList>

            {/* ── Control Tab ── */}
            <TabsContent value="control" className="space-y-5">
              <div className={`glass-card rounded-2xl border-2 transition-all ${isRunning ? "border-emerald-500/30 shadow-emerald-500/10 shadow-xl" : "border-white/[0.07]"}`}>
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-5">
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isRunning ? "bg-emerald-500/20 glow-green" : "bg-white/5"}`}>
                          {isRunning
                            ? <Activity className="w-7 h-7 text-emerald-400 animate-pulse" />
                            : <Square className="w-7 h-7 text-muted-foreground" />}
                          {isRunning && <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 animate-ping" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h2 className="text-xl font-black text-white">{isRunning ? "Automation Active" : "Automation Stopped"}</h2>
                            {isRunning && (
                              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                24/7 · Even when closed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isRunning ? "15 products / 20 min · 45/hour · ~1,080/day" : "Configure settings then start"}
                          </p>
                        </div>
                      </div>

                      {isRunning && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Next batch", value: nextRunCountdown, color: "text-amber-400 font-mono text-lg font-black" },
                            { label: "Last run", value: formatTime(status?.lastRunAt || null), color: "text-white text-sm font-semibold" },
                            { label: "Status", value: status?.lastBatchSuccess ? "OK" : "Error", color: status?.lastBatchSuccess ? "text-emerald-400 text-sm font-semibold" : "text-red-400 text-sm font-semibold" },
                          ].map((item, i) => (
                            <div key={i} className="p-3 bg-black/20 rounded-xl border border-white/[0.06]">
                              <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">{item.label}</p>
                              <p className={item.color}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Channel status pills */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium ${waStatus === "connected" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/[0.04] border-white/[0.07] text-muted-foreground"}`}>
                          <Smartphone className="w-3 h-3" />
                          {waStatus === "connected" ? `WA: +${status?.whatsapp?.phoneNumber || "Connected"}` : "WhatsApp: Not connected"}
                        </div>
                        {status?.config?.telegramChannelId && (
                          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border bg-sky-500/10 border-sky-500/20 text-sky-400 font-medium">
                            <Send className="w-3 h-3" /> TG: {status.config.telegramChannelId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                      {!isRunning ? (
                        <Button onClick={handleStart} disabled={isActioning || !affiliateTag.trim()} className="btn-shine h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-xl shadow-emerald-500/20 border-0 rounded-2xl glow-green" data-testid="button-start">
                          {isActioning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                          Start Automation
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleRunNow} disabled={isActioning} className="h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 font-semibold" data-testid="button-run-now">
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Run Now
                          </Button>
                          <Button onClick={handleStop} disabled={isActioning} className="h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-semibold" data-testid="button-stop">
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                            Stop
                          </Button>
                        </>
                      )}
                      {!affiliateTag.trim() && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Set affiliate tag in Settings first
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule info */}
              <div className="glass-card rounded-2xl border border-white/[0.07] p-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">Schedule</span>
                  {["Every 20 min", "15 products/batch", "45/hour", "~1,080/day", "7 categories"].map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-400 text-xs font-semibold">{t}</span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto hidden sm:block">🔥 Hot · 📱 Electronics · 📲 Mobiles · 🏠 Home · 👗 Fashion · 💄 Beauty · 💪 Fitness</span>
                </div>
              </div>

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
                        <div className="glass-card rounded-2xl border border-white/[0.07] p-10 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                            <Activity className="w-7 h-7 text-white/20" />
                          </div>
                          <p className="text-muted-foreground text-sm">No messages yet — start the automation or run a batch</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {status.recentAutomations.map((item, i) => (
                            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                              <div className="glass-card h-full rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all card-hover p-5">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h4 className="font-semibold text-white text-sm line-clamp-2 flex-1 leading-snug">{item.productTitle}</h4>
                                  <div className="flex items-center gap-1 text-amber-400 shrink-0 bg-amber-500/10 rounded-lg px-2 py-1">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-xs font-bold">{item.rating}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xl font-black text-emerald-400 stat-glow-green">₹{item.price}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <Tabs defaultValue="whatsapp" className="w-full">
                                  <TabsList className="w-full bg-black/20 border border-white/[0.06] h-8 rounded-xl p-0.5 gap-0.5">
                                    <TabsTrigger value="whatsapp" className="flex-1 text-xs gap-1 h-7 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground"><MessageCircle className="w-3 h-3" />WA</TabsTrigger>
                                    <TabsTrigger value="telegram" className="flex-1 text-xs gap-1 h-7 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground"><Send className="w-3 h-3" />TG</TabsTrigger>
                                  </TabsList>
                                  {[{ key: "whatsapp", msg: item.whatsappMessage }, { key: "telegram", msg: item.telegramMessage }].map(({ key, msg }) => (
                                    <TabsContent key={key} value={key} className="mt-2">
                                      <div className="relative">
                                        <pre className="text-xs p-3 bg-black/30 rounded-xl whitespace-pre-wrap max-h-28 overflow-y-auto text-muted-foreground border border-white/[0.05]">{msg}</pre>
                                        <Button onClick={() => copyText(msg, key === "whatsapp" ? "WhatsApp" : "Telegram")} variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 hover:bg-white/10 rounded-lg"><Copy className="w-3 h-3" /></Button>
                                      </div>
                                    </TabsContent>
                                  ))}
                                </Tabs>
                                <a href={`${item.productUrl}?tag=${item.affiliateTag}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                                  <ExternalLink className="w-3 h-3" /> Amazon link
                                </a>
                              </div>
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
              <div className="glass-card rounded-2xl border border-white/[0.07] p-7">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">WhatsApp Auto-Send</h2>
                    <p className="text-sm text-muted-foreground">Link your phone once — messages auto-post to your channel</p>
                  </div>
                </div>
                <WhatsAppPanel />
              </div>
            </TabsContent>

            {/* ── Settings Tab ── */}
            <TabsContent value="settings">
              <div className="glass-card rounded-2xl border border-white/[0.07] p-7 space-y-5">
                  <h2 className="text-xl font-black text-white flex items-center gap-2"><Settings className="w-5 h-5 text-amber-400" />Automation Settings</h2>
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
                    <Button onClick={handleSaveSettings} disabled={!affiliateTag.trim()} className="btn-shine bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl border-0 shadow-lg shadow-amber-500/20">
                      <Zap className="w-4 h-4 mr-2" />Save Settings
                    </Button>
                    {!isRunning && (
                      <Button onClick={handleStart} disabled={isActioning || !affiliateTag.trim()} className="btn-shine bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold rounded-xl border-0 shadow-lg shadow-emerald-500/20">
                        {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        Save & Start
                      </Button>
                    )}
                  </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* ── AI Chat ── */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ duration: 0.2 }} className="fixed bottom-6 right-6 w-[90vw] sm:w-[380px] h-[520px] z-50">
            <div className="h-full glass-card-strong rounded-2xl flex flex-col border border-purple-500/25 shadow-2xl shadow-purple-500/10 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/[0.07] flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-violet-500/5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm">AI Assistant</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400">Online</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAIChat(false)} className="h-8 w-8 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white">
                  <span className="text-lg leading-none">×</span>
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                    )}
                    <div className={`px-3 py-2.5 rounded-2xl text-sm max-w-[82%] leading-relaxed ${msg.role === "user" ? "bg-gradient-to-br from-purple-600/40 to-violet-600/30 border border-purple-500/25 text-white rounded-tr-sm" : "bg-white/[0.05] border border-white/[0.08] text-gray-200 rounded-tl-sm"}`}>
                      {msg.content || (chatLoading && i === chatMessages.length - 1
                        ? <span className="flex gap-1 items-center py-0.5">{[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span>
                        : "")}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-white/[0.07] shrink-0">
                <div className="relative flex items-center">
                  <Input
                    placeholder="Ask about strategy, categories…"
                    className="pr-12 bg-white/[0.05] border-white/10 text-sm rounded-xl focus:border-purple-500/40 focus:ring-purple-500/20 h-10"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    disabled={chatLoading}
                    data-testid="input-chat"
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 border-0 shadow-lg shadow-purple-500/20"
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PIN-gated entry point ─────────────────────────────────────────────────────
export default function Home() {
  const [pinVerified, setPinVerified] = useState<boolean>(() => sessionStorage.getItem("admin_pin_ok") === "1");
  if (!pinVerified) {
    return <PinScreen onVerified={() => setPinVerified(true)} />;
  }
  return <HomeDashboard />;
}
