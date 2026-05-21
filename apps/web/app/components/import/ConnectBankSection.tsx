"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSyncState } from "../../../lib/syncState";
import type { SyncResult } from "../../../lib/syncState";
import { createDemoBankProvider, createBasiqProvider } from "../../../lib/providers";
import type { StoredSyncStatus } from "../../../lib/providers";
import { supabase } from "../../../lib/supabase";
import { FALLBACK_PRICE, ANNUAL_SAVING_PCT } from "../../../lib/pricing";

// ── Date range options (Australian financial year) ───────────────────────────

const DATE_OPTIONS = (() => {
  const now  = new Date();
  const base = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const rolling = new Date(now);
  rolling.setFullYear(rolling.getFullYear() - 1);
  return [
    { label: `This financial year (1 Jul ${base})`,     value: `${base}-07-01` },
    { label: `Last financial year (1 Jul ${base - 1})`, value: `${base - 1}-07-01` },
    { label: "Last 12 months",                          value: rolling.toISOString().split("T")[0] },
  ];
})();

type Interval = "month" | "year";

// ── Shared atoms ──────────────────────────────────────────────────────────────

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`inline-block shrink-0 animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20"
      fill="currentColor" aria-hidden="true" style={{ color: "#22C55E" }}>
      <path fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd" />
    </svg>
  );
}

// ── Trust copy ────────────────────────────────────────────────────────────────

function TrustCopy() {
  return (
    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
      Connect your bank to automatically import transactions. Kashio uses read-only
      transaction access through Basiq. You can still upload CSV files manually.
    </p>
  );
}

// ── Date range picker ─────────────────────────────────────────────────────────

function DateRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Date range</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#22C55E] transition-colors appearance-none cursor-pointer"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid transparent", color: "var(--text-primary)" }}
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Upgrade card (shown inline when free user clicks Connect bank) ─────────────

function UpgradeCard({ cancelPath }: { cancelPath: string }) {
  const [interval,  setInterval]  = useState<Interval>("year");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ interval, cancelPath }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error("Something went wrong.");
      window.location.href = body.url;
    } catch {
      setError("Couldn't start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl px-5 py-5 space-y-5"
      style={{
        backgroundColor: "rgba(13,20,33,0.92)",
        border:          "1px solid rgba(34,197,94,0.20)",
        boxShadow:       "0 2px 12px rgba(0,0,0,0.4), 0 0 40px rgba(34,197,94,0.05)",
      }}
    >
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#22C55E" }}>
          Kashio Pro
        </p>
        <p className="text-[17px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
          Bank connection is a Pro feature
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Upgrade to connect your bank and automatically import transactions every sync.
        </p>
      </div>

      {/* Feature list */}
      <ul className="space-y-2">
        {[
          "Automatic bank transaction import",
          "Full potential deductions breakdown",
          "Export-ready tax summary",
          "Up to 100 receipt uploads",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <CheckIcon />
            {item}
          </li>
        ))}
      </ul>

      {/* Interval toggle */}
      <div
        className="flex rounded-xl p-1"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {(["month", "year"] as Interval[]).map((i) => (
          <button
            key={i}
            onClick={() => setInterval(i)}
            className="relative flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-150"
            style={{
              backgroundColor: interval === i ? "rgba(34,197,94,0.15)" : "transparent",
              border:          interval === i ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent",
              color:           interval === i ? "#22C55E" : "var(--text-muted)",
            }}
          >
            {i === "month" ? "Monthly" : "Annual"}
            {i === "year" && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "rgba(34,197,94,0.20)", color: "#22C55E" }}
              >
                {ANNUAL_SAVING_PCT}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-[30px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
          {interval === "month" ? FALLBACK_PRICE.monthly : FALLBACK_PRICE.annual}
        </span>
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          AUD / {interval === "month" ? "month" : "year"}
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
        style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
      >
        {loading && <Spinner />}
        {loading ? "Redirecting…" : "Unlock Kashio Pro"}
      </button>

      {error && (
        <p className="text-center text-[12px]" style={{ color: "#f87171" }}>{error}</p>
      )}

      <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        CSV upload is always free — upgrade only for bank connection.
      </p>
    </div>
  );
}

// ── Sync state sub-components ─────────────────────────────────────────────────

function SyncInProgress({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
      <div className="flex items-center gap-2.5">
        <Spinner />
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
      </div>
      <p className="mt-1.5 pl-[26px] text-sm" style={{ color: "var(--text-muted)" }}>{detail}</p>
    </div>
  );
}

function SyncSuccess({ result, onSyncAgain }: { result: SyncResult; onSyncAgain: () => void }) {
  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  if (result.inserted === 0 && result.duplicates > 0) {
    return (
      <div className="rounded-xl px-5 py-5 space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
            style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>✓</span>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Already up to date</p>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {result.duplicates} transaction{result.duplicates !== 1 ? "s" : ""} already saved. Nothing new to add.
        </p>
        <button onClick={onSyncAgain} className="text-sm" style={{ color: "var(--text-muted)" }}>Sync again</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
            style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>✓</span>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Sync complete</p>
        </div>
        <p className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          {result.inserted} imported{result.duplicates > 0 ? ` · ${result.duplicates} skipped` : ""}
        </p>
      </div>

      {result.flagged > 0 && (
        <div className="px-5 pb-5">
          <p className="text-[11px] font-medium uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Potential deductions
          </p>
          <p className="text-[42px] font-bold leading-none tabular-nums" style={{ color: "var(--text-primary)" }}>
            {result.totalValue ? fmt(result.totalValue) : `${result.flagged} items`}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            {result.flagged} candidate{result.flagged !== 1 ? "s" : ""} found — review to confirm which apply to you.
          </p>
        </div>
      )}

      <div
        className="px-5 pb-5 flex items-center gap-4"
        style={result.flagged > 0 ? { borderTop: "1px solid var(--bg-elevated)", paddingTop: "1.25rem" } : {}}
      >
        <a
          href="/review"
          className="flex-1 rounded-xl py-3 text-center text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          Review deductions
        </a>
        <button onClick={onSyncAgain} className="shrink-0 text-sm" style={{ color: "var(--text-muted)" }}>
          Sync again
        </button>
      </div>
    </div>
  );
}

function SyncFailed({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <p className="text-sm font-medium text-red-400">Sync didn&apos;t complete</p>
        <p className="mt-1 text-sm text-red-400" style={{ opacity: 0.8 }}>
          Your transactions weren&apos;t imported. Nothing was saved.
        </p>
        {message && (
          <p className="mt-2 text-xs font-mono break-all text-red-400" style={{ opacity: 0.7 }}>{message}</p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
        style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
      >
        Try again
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConnectBankSection({ isPro }: { isPro: boolean }) {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const justConnected  = searchParams.get("connected") === "true";

  const syncState = useSyncState();

  // Session & connection state
  const [userId, setUserId]                   = useState("anon");
  const [email,  setEmail]                    = useState("");
  const [bankConnected, setBankConnected]     = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [statusLoaded,  setStatusLoaded]      = useState(false);

  // Disconnect
  const [disconnecting,     setDisconnecting]     = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Add another bank
  const [addingBank,    setAddingBank]    = useState(false);
  const [addMobile,     setAddMobile]     = useState("");
  const [addConnecting, setAddConnecting] = useState(false);
  const [addError,      setAddError]      = useState<string | null>(null);

  // Date range — defaults to current FY
  const [from, setFrom] = useState(DATE_OPTIONS[0].value);

  // First-time connect inputs
  const [mobile,       setMobile]       = useState("");
  const [connecting,   setConnecting]   = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Free-user upgrade prompt
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Stored sync statuses (for "last synced" line)
  const [demoStatus,  setDemoStatus]  = useState<StoredSyncStatus | null>(null);
  const [basiqStatus, setBasiqStatus] = useState<StoredSyncStatus | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid    = session?.user?.id    ?? "anon";
      const uEmail = session?.user?.email ?? "";
      setUserId(uid);
      setEmail(uEmail);

      setDemoStatus(createDemoBankProvider(uid).loadStatus());
      setBasiqStatus(createBasiqProvider(uid).loadStatus());

      try {
        const res = await fetch("/api/basiq/status");
        if (res.ok) {
          const data = await res.json();
          setBankConnected(data.connected === true);
          setInstitutionName(data.institutionName ?? null);
        }
      } catch { /* ignore — stays false */ }

      setStatusLoaded(true);
    }
    init();
  }, []);

  // ── Sync handlers ──────────────────────────────────────────────────────────

  async function handleDemoSync() {
    const provider = createDemoBankProvider(userId);
    syncState.setConnecting();
    await new Promise((r) => setTimeout(r, 900));
    syncState.setSyncing();
    try {
      const result = await provider.sync();
      provider.saveStatus(result);
      setDemoStatus(provider.loadStatus());
      syncState.setSuccess(result);
    } catch (err) {
      syncState.setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleBasiqSync() {
    const provider = createBasiqProvider(userId, from);
    syncState.setSyncing();
    try {
      const result = await provider.sync();
      provider.saveStatus(result);
      setBasiqStatus(provider.loadStatus());
      setBankConnected(true);
      syncState.setSuccess(result);
      if (justConnected) router.replace("/import");
    } catch (err) {
      syncState.setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/basiq/disconnect", { method: "POST" });
      setBankConnected(false);
      setInstitutionName(null);
      setConfirmDisconnect(false);
    } catch {
      // non-fatal — page still works
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleAddBank() {
    if (!addMobile.trim()) return;
    setAddConnecting(true);
    setAddError(null);
    try {
      const res  = await fetch("/api/basiq/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ redirectPath: "/import", mobile: addMobile, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not connect bank.");
      window.location.href = data.authLink;
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
      setAddConnecting(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const res  = await fetch("/api/basiq/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ redirectPath: "/import", mobile, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start bank connection.");
      window.location.href = data.authLink;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Something went wrong.");
      setConnecting(false);
    }
  }

  // ── Active sync states (take over entire section) ──────────────────────────

  if (syncState.sync.status === "connecting") {
    return <SyncInProgress label="Connecting…" detail="This will only take a moment." />;
  }
  if (syncState.sync.status === "syncing") {
    return <SyncInProgress label="Importing transactions…" detail="This will only take a moment." />;
  }
  if (syncState.sync.status === "success") {
    return <SyncSuccess result={syncState.sync.result} onSyncAgain={syncState.reset} />;
  }
  if (syncState.sync.status === "error") {
    return <SyncFailed message={syncState.sync.message} onRetry={syncState.reset} />;
  }

  // ── Idle: post-connect redirect (bank just linked) ─────────────────────────

  if (justConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <p className="text-sm font-semibold text-green-400">Bank connected.</p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Choose a date range, then fetch your transactions.
          </p>
        </div>
        <DateRangePicker value={from} onChange={setFrom} />
        <button
          onClick={handleBasiqSync}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          Fetch my transactions
        </button>
      </div>
    );
  }

  // ── Idle: bank already connected (returning user) ──────────────────────────
  // Allow syncing regardless of plan — if they connected, they were Pro at the time.

  if (statusLoaded && bankConnected) {
    return (
      <div className="space-y-4">

        {/* Bank connected header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {institutionName ?? "Connected Bank"}
            </p>
            <span className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
              Connected
            </span>
          </div>
          {/* Disconnect */}
          {confirmDisconnect ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Disconnect?</span>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs font-medium text-red-400 disabled:opacity-50"
              >
                {disconnecting ? "…" : "Yes"}
              </button>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Disconnect
            </button>
          )}
        </div>

        <DateRangePicker value={from} onChange={setFrom} />

        <button
          onClick={handleBasiqSync}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          Sync transactions
        </button>

        {basiqStatus && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Last synced {new Date(basiqStatus.lastSynced).toLocaleString("en-AU", {
              day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
            })}
            {basiqStatus.result.inserted > 0 && ` · ${basiqStatus.result.inserted} imported`}
            {basiqStatus.result.flagged  > 0 && ` · ${basiqStatus.result.flagged} deductions`}
          </p>
        )}

        {/* Add another bank */}
        <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {addingBank ? (
            <div className="space-y-2 pt-3">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Add another bank account</p>
              <input
                type="tel"
                placeholder="Mobile number"
                value={addMobile}
                onChange={(e) => setAddMobile(e.target.value)}
                className="h-11 w-full rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#22C55E] transition-colors"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid transparent", color: "var(--text-primary)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddBank}
                  disabled={addConnecting || !addMobile.trim()}
                  className="flex flex-1 items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
                >
                  {addConnecting && <Spinner />}
                  {addConnecting ? "Connecting…" : "Connect bank"}
                </button>
                <button
                  onClick={() => { setAddingBank(false); setAddError(null); setAddMobile(""); }}
                  className="h-10 rounded-xl px-4 text-sm"
                  style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
              </div>
              {addError && (
                <p className="text-xs text-red-400">{addError}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAddingBank(true)}
              className="mt-3 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              + Add another bank account
            </button>
          )}
        </div>

      </div>
    );
  }

  // ── Idle: not connected ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Trust copy */}
      <TrustCopy />

      {/* Pro: real connection form */}
      {isPro ? (
        <div className="space-y-2">
          <input
            type="tel"
            placeholder="Mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="h-11 w-full rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#22C55E] transition-colors"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid transparent", color: "var(--text-primary)" }}
          />
          <button
            onClick={handleConnect}
            disabled={connecting || !mobile.trim()}
            className="flex w-full items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
          >
            {connecting && <Spinner />}
            {connecting ? "Connecting…" : "Connect bank securely"}
          </button>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Your bank sends a verification code to this number. Kashio never sees your login credentials.
          </p>
          {connectError && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-sm font-medium text-red-400">Connection failed</p>
              <p className="mt-0.5 text-sm text-red-400" style={{ opacity: 0.8 }}>{connectError}</p>
            </div>
          )}
        </div>
      ) : (
        /* Free: locked button → upgrade card */
        <div className="space-y-3">
          <button
            onClick={() => setShowUpgrade((v) => !v)}
            className="flex w-full items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border:          "1px solid rgba(255,255,255,0.09)",
              color:           "var(--text-primary)",
            }}
          >
            <LockIcon />
            Connect bank securely
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: "rgba(34,197,94,0.14)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              Pro
            </span>
          </button>

          {showUpgrade && <UpgradeCard cancelPath="/import" />}
        </div>
      )}

      {/* Demo bank — tertiary, always available */}
      <div className="pt-1">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          No bank account?{" "}
          <button
            onClick={handleDemoSync}
            className="underline underline-offset-2 transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            Try with sample data
          </button>
        </p>
      </div>

      {/* Demo last-synced status (if they've run it before) */}
      {statusLoaded && demoStatus && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Demo Bank</p>
            <div className="flex items-center gap-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Last synced {new Date(demoStatus.lastSynced).toLocaleString("en-AU", {
                  day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                })}
              </p>
              <button onClick={handleDemoSync} className="text-xs font-medium"
                style={{ color: "var(--violet-from)" }}>
                Sync again
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {[
              `${demoStatus.result.inserted} imported`,
              demoStatus.result.duplicates > 0 && `${demoStatus.result.duplicates} skipped`,
              demoStatus.result.flagged    > 0 && `${demoStatus.result.flagged} deduction${demoStatus.result.flagged !== 1 ? "s" : ""}`,
            ].filter(Boolean).join("  ·  ")}
          </p>
        </div>
      )}

    </div>
  );
}
