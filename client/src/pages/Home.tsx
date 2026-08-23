import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Loader2, Send, Settings, Play, Square, RefreshCw,
  XCircle, IndianRupee, FileSpreadsheet, Download,
  CheckCircle2, AlertCircle, Zap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

interface SchedulerStatus {
  isRunning: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastBatchSuccess: boolean;
  todayCount: number;
  telegramSent: number;
  memoryCount: number;
  config: { affiliateTag: string; telegramChannelId?: string; googleAppsScriptUrl?: string } | null;
  recentAutomations: any[];
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function until(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso).getTime() - Date.now();
  if (d <= 0) return "Now";
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  const s = Math.floor((d % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── PIN Screen ─────────────────────────────────────────────────────────────────
function PinScreen({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const locked = attempts >= 5;
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setLoading(true); setError(null);

    if (step === 2) {
      // Step 2 is verified by the server too; do not keep this PIN in browser code.
    }

    try {
      const r = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json();
      if (d.success && d.verified) {
        onVerified();
      } else if (d.success && d.nextStep === 2) {
        setAttempts(0); setStep(2); setPin(""); setError(null);
      } else {
        const n = attempts + 1;
        setAttempts(n);
        setError(n >= 5 ? "Too many attempts. Locked." : `Wrong PIN — ${5 - n} attempt${5 - n === 1 ? "" : "s"} left.`);
        setPin("");
      }
    } catch { setError("Connection error — try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,197,94,0.06), transparent)" }}
      />
      <div className="w-full max-w-[340px] relative z-10">
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#080808] p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-lg shadow-green-900/20 mb-4">
              <img src={logo} alt="SaleLooterz" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-white font-bold text-[17px] tracking-tight">SaleLooterz AI</h1>
            <p className="text-white/30 text-[11px] mt-1">Admin Access</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <div className={`h-1 rounded-full transition-all duration-300 ${step >= 1 ? "w-8 bg-green-500" : "w-4 bg-white/15"}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${step >= 2 ? "w-8 bg-green-500" : "w-4 bg-white/15"}`} />
          </div>
          <p className="text-center text-[11px] text-white/25 mb-4 -mt-3">
            {step === 1 ? "Step 1 — Access Code" : "Step 2 — Security PIN"}
          </p>

          {locked ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-3xl">🔒</div>
              <p className="text-red-400 text-sm font-semibold">Access locked</p>
              <p className="text-white/25 text-xs">Reload to try again</p>
            </div>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <Input
                type="password" inputMode="numeric" autoFocus
                placeholder="• • • • • •" value={pin}
                onChange={e => setPin(e.target.value)}
                className="text-center text-xl tracking-[0.5em] h-12 bg-black/60 border-white/[0.08] focus:border-green-500/50 focus:ring-0 rounded-xl text-white placeholder:tracking-normal placeholder:text-sm placeholder:text-white/20"
              />
              {error && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-red-400">
                  <XCircle className="w-3 h-3" />{error}
                </div>
              )}
              <button
                type="submit" disabled={!pin || loading}
                className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 1 ? "Continue →" : "Unlock →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stat box ───────────────────────────────────────────────────────────────────
function StatBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">{label}</p>
      <p className={`text-[13px] font-bold text-white leading-none ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
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
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [appsScriptSecret, setAppsScriptSecret] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [testingTg, setTestingTg] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/status");
      if (!r.ok) return;
      const d = await r.json();
      setStatus(d);
      if (d.config?.affiliateTag) {
        setAffiliateTag(d.config.affiliateTag);
        localStorage.setItem("sl_tag", d.config.affiliateTag);
      }
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
      setAppsScriptUrl(d.googleAppsScriptUrl || "");
      setAppsScriptSecret(d.googleAppsScriptSecret || "");
      if (d.affiliateTag) {
        setAffiliateTag(d.affiliateTag);
        localStorage.setItem("sl_tag", d.affiliateTag);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); loadConfig(); }, []);
  useEffect(() => {
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, [fetchStatus]);
  useEffect(() => {
    const t = setInterval(() => setCountdown(until(status?.nextRunAt ?? null)), 1000);
    return () => clearInterval(t);
  }, [status?.nextRunAt]);

  const payload = () => ({
    affiliateTag: affiliateTag.trim(),
    telegramBotToken: botToken.trim() || undefined,
    telegramChannelId: channelId.trim() || undefined,
    spreadsheetId: sheetId.trim() || undefined,
    googleAppsScriptUrl: appsScriptUrl.trim() || undefined,
    googleAppsScriptSecret: appsScriptSecret.trim() || undefined,
  });

  const handleStart = async () => {
    if (!affiliateTag.trim()) { toast({ title: "Set your affiliate tag in Settings first", variant: "destructive" }); return; }
    setActing(true);
    try {
      const r = await fetch("/api/admin/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const d = await r.json();
      if (d.success) { toast({ title: "Automation started" }); localStorage.setItem("sl_tag", affiliateTag.trim()); await fetchStatus(); setTab("control"); }
      else throw new Error(d.error);
    } catch (e) { toast({ title: "Failed to start", description: e instanceof Error ? e.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  };

  const handleStop = async () => {
    setActing(true);
    try { await fetch("/api/admin/stop", { method: "POST" }); toast({ title: "Automation stopped" }); await fetchStatus(); }
    finally { setActing(false); }
  };

  const handleRunNow = async () => {
    setActing(true);
    try {
      const r = await fetch("/api/admin/run-now", { method: "POST" });
      const d = await r.json();
      if (d.success) { toast({ title: "Batch triggered" }); setTimeout(fetchStatus, 5000); }
      else throw new Error(d.error);
    } catch (e) { toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  };

  const handleSave = async () => {
    if (!affiliateTag.trim()) { toast({ title: "Affiliate tag required", variant: "destructive" }); return; }
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
      if (d.success) toast({ title: "✅ Telegram connected!" });
      else toast({ title: "Connection failed", description: d.error, variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setTestingTg(false); }
  };

  const handleGenerateBatch = async () => {
    setGeneratingBatch(true);
    try {
      const r = await fetch("/api/admin/whatsapp-batch", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        toast({
          title: `✅ ${d.count} WhatsApp messages generated`,
          description: d.sheetExported ? "Exported to Google Sheet ✓" : d.fileSaved ? "Saved locally — download below" : "Check affiliate tag in Settings",
        });
      } else {
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setGeneratingBatch(false); }
  };

  const running = status?.isRunning ?? false;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Navbar ── */}
      <div className="sticky top-0 z-40 border-b border-white/[0.05] bg-black/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-13 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SaleLooterz" className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" />
            <div>
              <p className="text-[13px] font-bold leading-none tracking-tight">SaleLooterz AI</p>
              <p className="text-[10px] text-white/25 mt-0.5">Amazon Affiliate Bot</p>
            </div>
          </div>
          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {(["control", "settings"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize ${tab === t ? "bg-white text-black shadow" : "text-white/35 hover:text-white"}`}>
                {t === "control" ? <Zap className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">

        {/* ── CONTROL TAB ── */}
        {tab === "control" && (
          <>
            {/* Status card */}
            <div className={`rounded-2xl border p-5 transition-colors ${running ? "border-green-500/20 bg-green-500/[0.03]" : "border-white/[0.07] bg-white/[0.015]"}`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${running ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)] animate-pulse" : "bg-white/20"}`} />
                    <h2 className={`text-sm font-bold ${running ? "text-green-300" : "text-white/50"}`}>
                      {running ? "Automation Active" : "Automation Stopped"}
                    </h2>
                  </div>
                  {running && status?.config?.telegramChannelId && (
                    <p className="text-[11px] text-white/25 ml-4 flex items-center gap-1">
                      <Send className="w-2.5 h-2.5" />
                      Posting to {status.config.telegramChannelId}
                    </p>
                  )}
                  {!running && (
                    <p className="text-[11px] text-white/25 ml-4">
                      {affiliateTag.trim() ? "Ready — press Start." : "Set your affiliate tag in Settings."}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!running ? (
                    <button onClick={handleStart} disabled={acting || !affiliateTag.trim()}
                      className="h-9 px-5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-green-900/30">
                      {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      Start
                    </button>
                  ) : (
                    <>
                      <button onClick={handleRunNow} disabled={acting}
                        className="h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/70 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30">
                        {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Run Now
                      </button>
                      <button onClick={handleStop} disabled={acting}
                        className="h-9 px-4 rounded-xl border border-white/[0.06] text-white/25 hover:text-white/60 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30">
                        {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stat row (only when running) */}
              {running && (
                <div className="flex gap-2">
                  <StatBox label="Next Batch" value={countdown} mono />
                  <StatBox label="Last Run" value={fmt(status?.lastRunAt ?? null)} mono />
                  <StatBox
                    label="Status"
                    value={status?.lastBatchSuccess ? "✓ OK" : "✗ Error"}
                  />
                </div>
              )}
            </div>

            {/* Schedule row */}
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/15 mr-1">Schedule</span>
              {[
                { label: "Telegram", detail: "10 AM + 7 PM IST", count: "150 × 2 msgs" },
                { label: "WhatsApp → Sheets", detail: "3 PM IST", count: "30 msgs" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02]">
                  <span className="text-[11px] font-semibold text-white/50">{s.label}</span>
                  <span className="w-px h-3 bg-white/10" />
                  <span className="text-[11px] text-white/30">{s.detail}</span>
                  <span className="w-px h-3 bg-white/10" />
                  <span className="text-[11px] text-green-500/60 font-mono">{s.count}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp → Google Sheets card */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[13px] font-bold text-white">WhatsApp Messages</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                     Generated daily at 3 PM IST → pushed to Google Sheets + CSV backup
                  </p>
                </div>
                {sheetId.trim() && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetId.trim()}`}
                    target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-600/15 border border-green-500/25 text-green-400 hover:bg-green-600/25 transition-colors text-[11px] font-semibold"
                  >
                    <FileSpreadsheet className="w-3 h-3" />Open Sheet
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleGenerateBatch} disabled={generatingBatch}
                  className="flex items-center gap-1.5 h-8 px-4 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white text-xs font-semibold transition-colors disabled:opacity-30">
                  {generatingBatch
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
                    : <><RefreshCw className="w-3 h-3" />Generate Now</>}
                </button>
                <a href="/api/admin/whatsapp-messages/download" download
                  className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-green-600/15 border border-green-500/25 text-green-400 hover:bg-green-600/25 transition-colors text-xs font-semibold">
                  <Download className="w-3 h-3" />Download Messages
                </a>
                <a href="/api/admin/whatsapp-messages/download.csv" download
                  className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600/15 border border-blue-500/25 text-blue-400 hover:bg-blue-600/25 transition-colors text-xs font-semibold">
                  <Download className="w-3 h-3" />Download CSV
                </a>
              </div>
            </div>
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5 space-y-5">
            <div>
              <h2 className="text-sm font-bold text-white">Configuration</h2>
              <p className="text-[11px] text-white/25 mt-0.5">Saved on server — persists across restarts.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: "Affiliate Tag", icon: <IndianRupee className="w-2.5 h-2.5" />, value: affiliateTag, onChange: setAffiliateTag, placeholder: "yourtag-21", required: true },
                 { label: "Google Sheet ID (optional)", icon: <FileSpreadsheet className="w-2.5 h-2.5" />, value: sheetId, onChange: setSheetId, placeholder: "Only for Replit connector" },
                 { label: "Apps Script Web App URL", icon: <FileSpreadsheet className="w-2.5 h-2.5" />, value: appsScriptUrl, onChange: setAppsScriptUrl, placeholder: "https://script.google.com/macros/s/.../exec" },
                 { label: "Apps Script Secret", icon: <Settings className="w-2.5 h-2.5" />, value: appsScriptSecret, onChange: setAppsScriptSecret, placeholder: "Same secret as Apps Script", secret: true },
                { label: "Telegram Bot Token", icon: <Send className="w-2.5 h-2.5" />, value: botToken, onChange: setBotToken, placeholder: "1234567890:AAF…", secret: true },
                { label: "Telegram Channel ID", icon: <Send className="w-2.5 h-2.5" />, value: channelId, onChange: setChannelId, placeholder: "@yourchannel" },
              ].map((field, i) => (
                <div key={i}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1.5">
                    {field.icon}{field.label}{field.required && <span className="text-green-500">*</span>}
                  </label>
                  <Input
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    type={field.secret && !showTokens ? "password" : "text"}
                    className="bg-black/40 border-white/[0.08] focus:border-green-500/40 text-white rounded-lg h-9 text-sm placeholder:text-white/15"
                  />
                </div>
              ))}
            </div>

            {/* Show values toggle */}
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input type="checkbox" checked={showTokens} onChange={e => setShowTokens(e.target.checked)} className="accent-green-500 w-3.5 h-3.5 rounded" />
              <span className="text-[11px] text-white/30">Show sensitive values</span>
            </label>

            {/* Telegram setup guide */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
                <Send className="w-3 h-3 text-green-500/40" />
                <p className="text-[11px] font-semibold text-white/35">How to connect Telegram</p>
              </div>
              <ol className="px-4 py-3 space-y-2.5">
                {[
                  <>Search <code className="text-green-400/70 bg-green-500/10 px-1.5 py-0.5 rounded text-[10px]">@BotFather</code> → send <code className="text-green-400/70 bg-green-500/10 px-1.5 py-0.5 rounded text-[10px]">/newbot</code></>,
                  <>Copy the Bot Token it gives you</>,
                  <>Add the bot as Admin of your channel (allow Post Messages)</>,
                  <>Use <code className="text-green-400/70 bg-green-500/10 px-1.5 py-0.5 rounded text-[10px]">@channelname</code> or the numeric ID as Channel ID</>,
                  <>Save settings → click Test Telegram to confirm ✅</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-white/25">
                    <span className="shrink-0 w-4 h-4 rounded-full border border-white/[0.10] text-[10px] flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.05]">
              <button onClick={handleSave} disabled={!affiliateTag.trim()}
                className="h-9 px-5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30">
                Save Settings
              </button>
              {!running && (
                <button onClick={handleStart} disabled={acting || !affiliateTag.trim()}
                  className="h-9 px-5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30">
                  {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Save & Start
                </button>
              )}
              {(botToken || channelId) && (
                <button onClick={handleTestTg} disabled={testingTg}
                  className="h-9 px-4 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white/40 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30">
                  {testingTg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Test Telegram
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <PinScreen onVerified={() => setUnlocked(true)} />;
  return <Dashboard />;
}
