import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Loader2, Zap, Send, TrendingUp, Settings, Play, Square,
  RefreshCw, XCircle, Activity,
  IndianRupee, FileSpreadsheet,
  AlertCircle, Brain, MessageCircle, Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

interface SchedulerStatus {
  isRunning: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastBatchSuccess: boolean;
  todayCount: number;
  thisHourCount: number;
  telegramSent: number;
  memoryCount: number;
  config: { affiliateTag: string; telegramChannelId?: string } | null;
  recentAutomations: Array<{
    id: number;
    productTitle: string;
    price: string;
    rating: string;
    telegramMessage: string;
    whatsappMessage: string;
    affiliateTag: string;
    productUrl: string;
    createdAt: string;
  }>;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function until(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso).getTime() - Date.now();
  if (d <= 0) return "Now";
  const m = Math.floor(d / 60000), s = Math.floor((d % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── PIN Screen ────────────────────────────────────────────────────────────────
function PinScreen({ onVerified }: { onVerified: () => void }) {
  const [step, setStep]       = useState<1 | 2>(1);
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // track wrong attempts for lockout
  const [attempts, setAttempts] = useState(0);
  const locked = attempts >= 5;

  const PIN2 = "8101";

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setLoading(true); setError(null);

    // Step 2: verify locally (already passed server-verified step 1)
    if (step === 2) {
      await new Promise(r => setTimeout(r, 200)); // natural pause
      if (pin.trim() === PIN2) {
        onVerified();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 5) {
          setError("Too many wrong attempts. Locked.");
        } else {
          setError(`Wrong PIN — ${5 - newAttempts} attempt${5 - newAttempts === 1 ? "" : "s"} left.`);
        }
        setPin("");
      }
      setLoading(false);
      return;
    }

    // Step 1: server-verified
    try {
      const r = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json();
      if (d.success) {
        setAttempts(0);
        setStep(2); setPin(""); setError(null);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 5) {
          setError("Too many wrong attempts. Locked.");
        } else {
          setError(`Wrong PIN — ${5 - newAttempts} attempt${5 - newAttempts === 1 ? "" : "s"} left.`);
        }
        setPin("");
      }
    } catch { setError("Connection error — try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(34,197,94,0.07), transparent)" }} />
      <div className="w-full max-w-xs relative z-10">
        <div className="border border-white/[0.08] rounded-2xl p-8 bg-white/[0.02]">
          <div className="text-center mb-7">
            <img src={logo} alt="SaleLooterz" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4" />
            <h1 className="text-lg font-bold text-white">SaleLooterz AI</h1>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? "bg-green-500" : "bg-white/20"}`} />
              <div className={`w-8 h-px transition-colors ${step >= 2 ? "bg-green-500" : "bg-white/20"}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? "bg-green-500" : "bg-white/20"}`} />
            </div>
            <p className="text-xs text-white/35 mt-2">
              {step === 1 ? "Step 1 of 2 — Access Code" : "Step 2 of 2 — Security PIN"}
            </p>
          </div>

          {locked ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">🔒</div>
              <p className="text-red-400 text-sm font-medium">Access locked</p>
              <p className="text-white/30 text-xs mt-1">Reload the page to try again</p>
            </div>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <Input
                type="password" inputMode="numeric" autoFocus
                placeholder="••••••" value={pin}
                onChange={e => setPin(e.target.value)}
                className="text-center text-2xl tracking-[0.6em] h-12 bg-black border-white/10 focus:border-green-500/50 rounded-xl placeholder:tracking-normal placeholder:text-lg text-white"
              />
              {error && (
                <p className="text-[11px] text-red-400 flex items-center justify-center gap-1.5">
                  <XCircle className="w-3 h-3" />{error}
                </p>
              )}
              <button type="submit" disabled={!pin || loading}
                className="w-full h-11 rounded-xl btn-primary font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 1 ? "Continue →" : "Unlock Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [acting, setActing] = useState(false);
  const [tab, setTab] = useState<"control" | "settings">("control");
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [countdown, setCountdown] = useState("—");


  const [affiliateTag, setAffiliateTag] = useState(localStorage.getItem("sl_tag") || "");
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [testingTg, setTestingTg] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/status");
      if (!r.ok) return;
      const d = await r.json();
      setStatus(d);
      if (d.config?.affiliateTag) { setAffiliateTag(d.config.affiliateTag); localStorage.setItem("sl_tag", d.config.affiliateTag); }
    } catch {}
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/config");
      if (!r.ok) return;
      const d = await r.json();
      setBotToken(d.telegramBotToken || "");
      setChannelId(d.telegramChannelId || "");
      setSheetId(d.spreadsheetId || "");
      if (d.affiliateTag) { setAffiliateTag(d.affiliateTag); localStorage.setItem("sl_tag", d.affiliateTag); }
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); loadConfig(); }, []);
  useEffect(() => { const t = setInterval(fetchStatus, 5000); return () => clearInterval(t); }, [fetchStatus]);
  useEffect(() => { const t = setInterval(() => setCountdown(until(status?.nextRunAt ?? null)), 1000); return () => clearInterval(t); }, [status?.nextRunAt]);

  const payload = () => ({
    affiliateTag: affiliateTag.trim(),
    telegramBotToken: botToken.trim() || undefined,
    telegramChannelId: channelId.trim() || undefined,
    spreadsheetId: sheetId.trim() || undefined,
  });

  const handleStart = async () => {
    if (!affiliateTag.trim()) { toast({ title: "Affiliate Tag Required", variant: "destructive" }); return; }
    setActing(true);
    try {
      const r = await fetch("/api/admin/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const d = await r.json();
      if (d.success) { toast({ title: "Automation Started" }); localStorage.setItem("sl_tag", affiliateTag.trim()); await fetchStatus(); setTab("control"); }
      else throw new Error(d.error);
    } catch (e) { toast({ title: "Failed to start", description: e instanceof Error ? e.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  };

  const handleStop = async () => {
    setActing(true);
    try { await fetch("/api/admin/stop", { method: "POST" }); toast({ title: "Stopped" }); await fetchStatus(); }
    finally { setActing(false); }
  };

  const handleRunNow = async () => {
    setActing(true);
    try {
      const r = await fetch("/api/admin/run-now", { method: "POST" });
      const d = await r.json();
      if (d.success) { toast({ title: "Batch Triggered" }); setTimeout(fetchStatus, 5000); }
      else throw new Error(d.error);
    } catch (e) { toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  };

  const handleSave = async () => {
    if (!affiliateTag.trim()) { toast({ title: "Affiliate Tag Required", variant: "destructive" }); return; }
    try {
      const r = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      if (r.ok) { toast({ title: "Settings saved" }); localStorage.setItem("sl_tag", affiliateTag.trim()); }
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  };

  const handleTestTg = async () => {
    if (!botToken.trim() || !channelId.trim()) { toast({ title: "Fill Bot Token and Channel ID first", variant: "destructive" }); return; }
    setTestingTg(true);
    try {
      const r = await fetch("/api/telegram/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botToken: botToken.trim(), channelId: channelId.trim() }) });
      const d = await r.json();
      if (d.success) toast({ title: "✅ Telegram connected" });
      else toast({ title: "Failed", description: d.error, variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setTestingTg(false); }
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copied" }); };

  const handleGenerateBatch = async () => {
    setGeneratingBatch(true);
    try {
      const r = await fetch("/api/admin/whatsapp-batch", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        const lines: string[] = [];
        if (d.fileSaved) lines.push("Saved locally — click Download Messages below");
        if (d.sheetExported) lines.push("Also exported to Google Sheet ✓");
        else if (!d.fileSaved) lines.push("Nothing saved — check affiliate tag");
        toast({
          title: `✅ ${d.count} WhatsApp messages generated`,
          description: lines.join(" · "),
        });
      } else {
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setGeneratingBatch(false);
    }
  };
  const running = status?.isRunning ?? false;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <div className="glass-nav sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="SaleLooterz" className="w-8 h-8 rounded-xl object-cover" />
            <div>
              <p className="text-[13px] font-bold leading-none">SaleLooterz AI</p>
              <p className="text-[10px] text-white/30 mt-0.5">Admin Dashboard</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-lg border ${running ? "border-green-500/25 bg-green-500/8 text-green-400" : "border-white/8 text-white/25"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
            {running ? "Running" : "Stopped"}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Today", value: status?.todayCount ?? 0, icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { label: "This Hour", value: status?.thisHourCount ?? 0, icon: <Activity className="w-3.5 h-3.5" /> },
            { label: "Telegram", value: status?.telegramSent ?? 0, icon: <Send className="w-3.5 h-3.5" /> },
            { label: "ASIN Memory", value: status?.memoryCount ?? 0, icon: <Brain className="w-3.5 h-3.5" /> },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{s.label}</p>
                <span className={s.value > 0 ? "text-green-500/50" : "text-white/15"}>{s.icon}</span>
              </div>
              <p className={`text-[1.75rem] font-black leading-none number-highlight ${s.value > 0 ? "text-white" : "text-white/30"}`}>
                {s.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-0.5 bg-white/[0.03] border border-white/[0.07] rounded-xl w-fit">
          <button onClick={() => setTab("control")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-[10px] text-xs font-semibold transition-all ${tab === "control" ? "bg-white text-black shadow" : "text-white/35 hover:text-white"}`}>
            <Zap className="w-3 h-3" />Control
          </button>
          <button onClick={() => setTab("settings")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-[10px] text-xs font-semibold transition-all ${tab === "settings" ? "bg-white text-black shadow" : "text-white/35 hover:text-white"}`}>
            <Settings className="w-3 h-3" />Settings
          </button>
        </div>

        {/* Control Tab */}
        {tab === "control" && (
          <div className="space-y-3">
            <div className={`rounded-xl border p-5 ${running ? "border-green-500/20 bg-green-500/[0.04]" : "border-white/[0.07] bg-white/[0.02]"}`}>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-2 h-2 rounded-full ${running ? "bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-white/20"}`} />
                    <h2 className={`font-bold text-sm ${running ? "text-green-300" : "text-white/60"}`}>
                      {running ? "Automation Active" : "Automation Stopped"}
                    </h2>
                  </div>
                  {running ? (
                    <>
                      <p className="text-[11px] text-white/30 mb-4">13 products · every 60 min · 13/hour · ~312/day Telegram · 30 WhatsApp auto-daily</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Next batch", value: countdown },
                          { label: "Last run", value: fmt(status?.lastRunAt ?? null) },
                          { label: "Status", value: status?.lastBatchSuccess ? "✓ OK" : "✗ Error", err: !status?.lastBatchSuccess },
                        ].map((item, i) => (
                          <div key={i} className="rounded-lg border border-white/[0.06] bg-black/30 p-2.5">
                            <p className="text-[10px] text-white/25 mb-1">{item.label}</p>
                            <p className={`text-xs font-mono font-bold ${item.err ? "text-red-400" : "text-white"}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {status?.config?.telegramChannelId && (
                        <p className="mt-3 text-[11px] text-green-500/50 flex items-center gap-1">
                          <Send className="w-2.5 h-2.5" />posting to {status.config.telegramChannelId}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-white/30">
                      {affiliateTag.trim() ? "Ready — click Start." : "Set your affiliate tag in Settings first."}
                    </p>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 sm:min-w-[140px] sm:justify-center">
                  {!running ? (
                    <button onClick={handleStart} disabled={acting || !affiliateTag.trim()}
                      className="btn-primary rounded-xl h-10 px-6 text-sm font-bold flex items-center gap-2 disabled:opacity-40 shadow-lg shadow-green-900/30">
                      {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}Start
                    </button>
                  ) : (
                    <>
                      <button onClick={handleRunNow} disabled={acting}
                        className="btn-ghost rounded-xl h-9 px-4 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40">
                        {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Run Now
                      </button>
                      <button onClick={handleStop} disabled={acting}
                        className="h-9 px-4 rounded-xl border border-white/[0.07] text-white/30 hover:text-white/60 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40">
                        {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}Stop
                      </button>
                    </>
                  )}
                  {!affiliateTag.trim() && (
                    <p className="text-[10px] text-white/25 flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />Set tag in Settings
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule chips */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/15">Schedule</span>
              {["10 AM + 7 PM IST Telegram", "150 msgs × 2 / day", "Midnight IST WhatsApp", "30 msgs / day"].map((t, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg border border-white/[0.07] text-white/30">{t}</span>
              ))}
            </div>

            {/* WhatsApp → Google Sheets card */}
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-400/70" />
                  <div>
                    <p className="text-xs font-bold text-white">WhatsApp Messages</p>
                    <p className="text-[11px] text-white/30 mt-0.5">Generated midnight IST · saved locally + Google Sheets</p>
                  </div>
                </div>
                {sheetId.trim() && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetId.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-[11px] font-semibold"
                  >
                    <FileSpreadsheet className="w-3 h-3" />Open Sheet
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleGenerateBatch}
                  disabled={generatingBatch}
                  className="flex items-center gap-1.5 h-8 px-4 rounded-lg border border-white/[0.07] text-white/40 hover:text-white hover:border-white/20 text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  {generatingBatch ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</> : <><RefreshCw className="w-3 h-3" />Generate Now</>}
                </button>
                <a
                  href="/api/admin/whatsapp-messages/download"
                  download
                  className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-xs font-semibold"
                >
                  <Download className="w-3 h-3" />Download Messages
                </a>
              </div>
            </div>

          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="border border-white/[0.07] rounded-xl p-5 bg-white/[0.02] space-y-5">
            <div>
              <h2 className="text-sm font-bold text-white mb-0.5">Configuration</h2>
              <p className="text-xs text-white/30">Saved on the server — persists across restarts.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-white/35 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <IndianRupee className="w-2.5 h-2.5" />Affiliate Tag *
                </label>
                <Input value={affiliateTag} onChange={e => setAffiliateTag(e.target.value)} placeholder="yourtag-21"
                  className="bg-white/[0.03] border-white/[0.08] focus:border-green-500/40 text-white rounded-lg h-9 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/35 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileSpreadsheet className="w-2.5 h-2.5" />Google Sheet ID
                </label>
                <Input value={sheetId} onChange={e => setSheetId(e.target.value)} placeholder="ID from Sheet URL"
                  className="bg-white/[0.03] border-white/[0.08] focus:border-green-500/40 text-white rounded-lg h-9 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/35 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <Send className="w-2.5 h-2.5" />Bot Token
                </label>
                <Input value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="1234567890:AAF..."
                  type={showTokens ? "text" : "password"}
                  className="bg-white/[0.03] border-white/[0.08] focus:border-green-500/40 text-white rounded-lg h-9 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/35 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <Send className="w-2.5 h-2.5" />Channel ID
                </label>
                <Input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="@yourchannel or -100..."
                  className="bg-white/[0.03] border-white/[0.08] focus:border-green-500/40 text-white rounded-lg h-9 text-sm" />
              </div>
            </div>

            {/* Telegram guide */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
                <Send className="w-3 h-3 text-green-500/40" />
                <p className="text-[11px] font-semibold text-white/40">How to connect Telegram</p>
              </div>
              <ol className="px-4 py-3 space-y-2">
                {[
                  <>Search <code className="text-green-400/70 bg-green-500/10 px-1 rounded text-[10px]">@BotFather</code> → send <code className="text-green-400/70 bg-green-500/10 px-1 rounded text-[10px]">/newbot</code></>,
                  <>Name it and copy the Bot Token</>,
                  <>Add bot as Admin of your channel (Post Messages permission)</>,
                  <>Use <code className="text-green-400/70 bg-green-500/10 px-1 rounded text-[10px]">@channelname</code> as Channel ID</>,
                  <>Save settings and click Test Telegram — if ✅ you're done!</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-white/25">
                    <span className="shrink-0 w-4 h-4 rounded-full border border-white/[0.08] text-[10px] flex items-center justify-center mt-0.5 font-bold">{i + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(botToken || channelId) && (
                <button onClick={handleTestTg} disabled={testingTg}
                  className="btn-ghost rounded-lg h-9 px-4 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40">
                  {testingTg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Test Telegram
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-white/25">
                <input type="checkbox" id="show-tokens" checked={showTokens} onChange={e => setShowTokens(e.target.checked)} className="accent-green-500 w-3 h-3" />
                <label htmlFor="show-tokens">Show values</label>
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/[0.05]">
              <button onClick={handleSave} disabled={!affiliateTag.trim()}
                className="btn-primary rounded-lg h-9 px-5 text-xs font-bold flex items-center gap-2 disabled:opacity-40">
                Save Settings
              </button>
              {!running && (
                <button onClick={handleStart} disabled={acting || !affiliateTag.trim()}
                  className="btn-ghost rounded-lg h-9 px-5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40">
                  {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}Save & Start
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root: always show PIN, never persist across reloads ───────────────────────
export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <PinScreen onVerified={() => setUnlocked(true)} />;
  return <Dashboard />;
}
