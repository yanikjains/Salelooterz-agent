import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ShoppingBag, Zap, Send, Bot, TrendingUp,
  Settings, Play, Square, RefreshCw, Copy, ExternalLink,
  CheckCircle, XCircle, Clock, Activity, Star,
  ChevronDown, ChevronUp, IndianRupee, FileSpreadsheet,
  AlertCircle, Brain,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  memoryCount: number;
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
    telegramMessage: string;
    affiliateTag: string;
    productUrl: string;
    createdAt: string;
  }>;
}

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

// ─── Admin PIN Screen ─────────────────────────────────────────────────────────
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
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm">
        <div className="border border-white/10 rounded-xl p-8 space-y-6 bg-white/[0.02]">
          <div className="text-center space-y-2">
            <img src={logo} alt="SaleLooterz" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">SaleLooterz AI</h1>
            <p className="text-sm text-white/40">Enter your admin PIN</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="• • • • • •"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
              className="text-center text-xl tracking-[0.5em] h-12 bg-white/5 border-white/10 rounded-lg placeholder:tracking-normal placeholder:text-base text-white"
              data-testid="input-admin-pin"
            />
            {error && (
              <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />{error}
              </p>
            )}
            <Button type="submit" disabled={!pin || loading} className="w-full h-11 rounded-lg bg-white text-black hover:bg-white/90 font-semibold border-0" data-testid="button-pin-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Dashboard"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
function HomeDashboard() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<"control" | "settings">("control");
  const [nextRunCountdown, setNextRunCountdown] = useState("—");

  const [affiliateTag, setAffiliateTag] = useState(localStorage.getItem("sl_tag") || "");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

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
        body: JSON.stringify({
          affiliateTag: affiliateTag.trim(),
          telegramBotToken: telegramBotToken.trim() || undefined,
          telegramChannelId: telegramChannelId.trim() || undefined,
          spreadsheetId: spreadsheetId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Automation Started" });
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
      if (data.success) { toast({ title: "Batch Triggered" }); setTimeout(fetchStatus, 5000); }
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
        body: JSON.stringify({
          affiliateTag: affiliateTag.trim(),
          telegramBotToken: telegramBotToken.trim() || undefined,
          telegramChannelId: telegramChannelId.trim() || undefined,
          spreadsheetId: spreadsheetId.trim() || undefined,
        }),
      });
      if (res.ok) { toast({ title: "Settings saved" }); localStorage.setItem("sl_tag", affiliateTag.trim()); }
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
      if (data.success) toast({ title: "Telegram connected — test message sent" });
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

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied" }); };
  const isRunning = status?.isRunning ?? false;

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="SaleLooterz" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <h1 className="text-base font-bold text-white">SaleLooterz AI</h1>
              <p className="text-[11px] text-white/30">Admin · Amazon India</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white rounded-lg h-8 px-3 text-xs">Home</Button>
            </Link>
            <Button onClick={() => setShowAIChat(!showAIChat)} size="sm" className={`rounded-lg h-8 px-3 text-xs border ${showAIChat ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/10 text-white/50 hover:text-white"}`}>
              <Bot className="w-3 h-3 mr-1.5" />AI
            </Button>
            <div className={`text-xs px-2.5 py-1 rounded-md border ${isRunning ? "border-white/20 text-white/70" : "border-white/10 text-white/30"}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isRunning ? "bg-white animate-pulse" : "bg-white/20"}`} />
              {isRunning ? "Running" : "Stopped"}
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "Today", value: status?.todayCount ?? 0, icon: <TrendingUp className="w-3 h-3" /> },
            { label: "This Hour", value: status?.thisHourCount ?? 0, icon: <Activity className="w-3 h-3" /> },
            { label: "Telegram", value: status?.telegramSent ?? 0, icon: <Send className="w-3 h-3" /> },
            { label: "Memory", value: status?.memoryCount ?? 0, icon: <Brain className="w-3 h-3" /> },
          ].map((s, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
                <span className="text-white/20">{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 mb-5 border border-white/10 rounded-lg p-0.5 w-fit">
          {(["control", "settings"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors ${activeTab === tab ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
            >
              {tab === "control" ? <><Zap className="w-3 h-3" />Control</> : <><Settings className="w-3 h-3" />Settings</>}
            </button>
          ))}
        </div>

        {/* Control Tab */}
        {activeTab === "control" && (
          <div className="space-y-4">
            {/* Main control card */}
            <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-white animate-pulse" : "bg-white/20"}`} />
                    <h2 className="font-semibold text-white">{isRunning ? "Automation Active" : "Automation Stopped"}</h2>
                  </div>
                  <p className="text-xs text-white/40 mb-4">
                    {isRunning ? "15 products / 20 min · 45/hour · ~1,080/day" : "Configure settings then start"}
                  </p>

                  {isRunning && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Next batch", value: nextRunCountdown },
                        { label: "Last run", value: formatTime(status?.lastRunAt || null) },
                        { label: "Status", value: status?.lastBatchSuccess ? "OK" : "Error" },
                      ].map((item, i) => (
                        <div key={i} className="border border-white/[0.06] rounded-md p-2.5">
                          <p className="text-[10px] text-white/30 mb-1">{item.label}</p>
                          <p className={`text-xs font-mono font-semibold ${item.label === "Status" && !status?.lastBatchSuccess ? "text-red-400" : "text-white"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {status?.config?.telegramChannelId && (
                    <p className="text-[11px] text-white/30">
                      <Send className="w-3 h-3 inline mr-1" />TG: {status.config.telegramChannelId}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[160px]">
                  {!isRunning ? (
                    <Button onClick={handleStart} disabled={isActioning || !affiliateTag.trim()} className="h-10 bg-white text-black hover:bg-white/90 font-semibold border-0 rounded-lg text-sm" data-testid="button-start">
                      {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Start
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleRunNow} disabled={isActioning} className="h-9 bg-transparent border border-white/20 text-white hover:bg-white/5 rounded-lg text-sm font-medium" data-testid="button-run-now">
                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                        Run Now
                      </Button>
                      <Button onClick={handleStop} disabled={isActioning} className="h-9 bg-transparent border border-white/10 text-white/50 hover:text-white hover:border-white/20 rounded-lg text-sm font-medium" data-testid="button-stop">
                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Square className="w-3.5 h-3.5 mr-1.5" />}
                        Stop
                      </Button>
                    </>
                  )}
                  {!affiliateTag.trim() && (
                    <p className="text-[11px] text-white/40 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Set tag in Settings
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule info */}
            <div className="border border-white/[0.06] rounded-lg p-3 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] text-white/20 uppercase tracking-wider">Schedule</span>
              {["Every 20 min", "15 products/batch", "45/hour", "~1,080/day"].map((t, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-white/40">{t}</span>
              ))}
            </div>

            {/* Live Feed */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">Live Feed</h2>
                  {status?.recentAutomations?.length ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/30">{status.recentAutomations.length}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button onClick={fetchStatus} variant="ghost" size="icon" className="text-white/30 hover:text-white h-7 w-7"><RefreshCw className="w-3 h-3" /></Button>
                  <Button onClick={() => setShowFeed(!showFeed)} variant="ghost" size="icon" className="text-white/30 hover:text-white h-7 w-7">
                    {showFeed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {showFeed && (
                <>
                  {!status?.recentAutomations?.length ? (
                    <div className="border border-white/[0.06] rounded-lg p-8 text-center">
                      <Activity className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-white/30">No messages yet — start the automation or run a batch</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {status.recentAutomations.map((item) => (
                        <div key={item.id} className="border border-white/[0.06] rounded-lg p-4 hover:border-white/15 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-medium text-white text-xs line-clamp-2 flex-1 leading-snug">{item.productTitle}</h4>
                            <div className="flex items-center gap-0.5 text-white/40 shrink-0">
                              <Star className="w-2.5 h-2.5" />
                              <span className="text-[10px]">{item.rating}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-white">₹{item.price}</span>
                            <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="relative">
                            <pre className="text-[11px] p-2.5 bg-white/[0.03] rounded-md whitespace-pre-wrap max-h-24 overflow-y-auto text-white/40 border border-white/[0.05] font-mono">{item.telegramMessage}</pre>
                            <Button onClick={() => copyText(item.telegramMessage)} variant="ghost" size="icon" className="absolute top-1 right-1 h-5 w-5 hover:bg-white/10 rounded text-white/30 hover:text-white"><Copy className="w-2.5 h-2.5" /></Button>
                          </div>
                          <a href={`${item.productUrl}?tag=${item.affiliateTag}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> Amazon link
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="border border-white/10 rounded-lg p-5 space-y-5 bg-white/[0.02]">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm"><Settings className="w-4 h-4 text-white/40" />Settings</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1.5 flex items-center gap-1.5"><IndianRupee className="w-3 h-3" />Amazon Affiliate Tag *</label>
                <Input value={affiliateTag} onChange={e => setAffiliateTag(e.target.value)} placeholder="yourtag-21" className="bg-white/5 border-white/10 text-white rounded-lg h-9 text-sm" data-testid="input-affiliate-tag" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 flex items-center gap-1.5"><FileSpreadsheet className="w-3 h-3" />Google Sheet ID</label>
                <Input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="Sheet ID from URL" className="bg-white/5 border-white/10 text-white rounded-lg h-9 text-sm" data-testid="input-sheet-id" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 flex items-center gap-1.5"><Send className="w-3 h-3" />Telegram Bot Token</label>
                <Input value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} placeholder="1234567890:AAF..." type={showTokens ? "text" : "password"} className="bg-white/5 border-white/10 text-white rounded-lg h-9 text-sm" data-testid="input-telegram-token" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 flex items-center gap-1.5"><Send className="w-3 h-3" />Telegram Channel ID</label>
                <Input value={telegramChannelId} onChange={e => setTelegramChannelId(e.target.value)} placeholder="@yourchannel or -100..." className="bg-white/5 border-white/10 text-white rounded-lg h-9 text-sm" data-testid="input-telegram-channel" />
              </div>
            </div>

            {/* Telegram setup guide */}
            <div className="border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-white/30" />
                <p className="text-xs font-medium text-white/50">How to connect Telegram</p>
              </div>
              <div className="px-4 py-3">
                <ol className="space-y-2">
                  {[
                    <>Search <code className="text-white/60 bg-white/5 px-1 rounded">@BotFather</code> on Telegram → send <code className="text-white/60 bg-white/5 px-1 rounded">/newbot</code></>,
                    <>Give it a name and username ending in <code className="text-white/60 bg-white/5 px-1 rounded">_bot</code></>,
                    <>Copy the Bot Token and paste it above</>,
                    <>Add the bot as Admin of your channel with Post Messages permission</>,
                    <>Use <code className="text-white/60 bg-white/5 px-1 rounded">@yourchannelname</code> as the Channel ID</>,
                    <>Click Test Telegram — if ✅ you're done!</>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[11px] text-white/30">
                      <span className="shrink-0 w-4 h-4 rounded-full border border-white/10 text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {(telegramBotToken || telegramChannelId) && (
              <Button onClick={handleTestTelegram} disabled={testingTelegram} className="bg-transparent border border-white/15 text-white/60 hover:text-white hover:border-white/30 rounded-lg h-9 text-xs" data-testid="button-test-telegram">
                {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                Test Telegram
              </Button>
            )}

            <div className="flex items-center gap-2 text-xs text-white/30">
              <input type="checkbox" id="show-tokens" checked={showTokens} onChange={e => setShowTokens(e.target.checked)} className="accent-white" />
              <label htmlFor="show-tokens">Show sensitive values</label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSaveSettings} disabled={!affiliateTag.trim()} className="bg-white text-black hover:bg-white/90 font-semibold rounded-lg border-0 h-9 text-xs px-4">
                Save Settings
              </Button>
              {!isRunning && (
                <Button onClick={handleStart} disabled={isActioning || !affiliateTag.trim()} className="bg-transparent border border-white/15 text-white/60 hover:text-white hover:border-white/30 rounded-lg h-9 text-xs px-4">
                  {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                  Save & Start
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Chat */}
      {showAIChat && (
        <div className="fixed bottom-5 right-5 w-[90vw] sm:w-[360px] h-[480px] z-50 border border-white/15 rounded-xl bg-black flex flex-col overflow-hidden shadow-2xl">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-sm font-medium text-white">AI Assistant</span>
            </div>
            <button onClick={() => setShowAIChat(false)} className="text-white/30 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 min-h-0">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`px-3 py-2 rounded-lg text-xs max-w-[85%] leading-relaxed ${msg.role === "user" ? "bg-white text-black" : "bg-white/[0.06] border border-white/[0.08] text-white/70"}`}>
                  {msg.content || (chatLoading && i === chatMessages.length - 1
                    ? <span className="flex gap-1 items-center">{[0, 150, 300].map(d => <span key={d} className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span>
                    : "")}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask about strategy, categories…"
                className="bg-white/5 border-white/10 text-white text-xs rounded-lg h-9 focus:border-white/25"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                disabled={chatLoading}
                data-testid="input-chat"
              />
              <Button size="icon" className="h-9 w-9 rounded-lg bg-white text-black hover:bg-white/90 border-0 shrink-0" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [pinVerified, setPinVerified] = useState<boolean>(() => sessionStorage.getItem("admin_pin_ok") === "1");
  if (!pinVerified) return <PinScreen onVerified={() => setPinVerified(true)} />;
  return <HomeDashboard />;
}
