"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSyncState } from "../../../lib/syncState";
import type { SyncResult } from "../../../lib/syncState";
import { createDemoBankProvider, createBasiqProvider } from "../../../lib/providers";
import type { StoredSyncStatus } from "../../../lib/providers";
import { supabase } from "../../../lib/supabase";

// ── Date range options (Australian FY) ───────────────────────────────────────

const DATE_OPTIONS = (() => {
  const now = new Date();
  // Australian FY runs 1 Jul – 30 Jun; base year = year the current FY started.
  const base = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const rolling = new Date(now);
  rolling.setFullYear(rolling.getFullYear() - 1);
  return [
    { label: `This financial year (1 Jul ${base})`,      value: `${base}-07-01` },
    { label: `Last financial year (1 Jul ${base - 1})`,  value: `${base - 1}-07-01` },
    { label: "Last 12 months",                           value: rolling.toISOString().split("T")[0] },
  ];
})();

// ── Shared sub-components ─────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="inline-block h-4 w-4 shrink-0 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function DateRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Date range</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#22C55E] transition-colors appearance-none cursor-pointer"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid transparent",
          color: "var(--text-primary)",
        }}
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

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

  const noneAdded = result.inserted === 0 && result.duplicates > 0;

  if (noneAdded) {
    return (
      <div className="rounded-xl px-5 py-5 space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>✓</span>
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
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>✓</span>
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

      <div className="px-5 pb-5 flex items-center gap-4" style={result.flagged > 0 ? { borderTop: "1px solid var(--bg-elevated)", paddingTop: "1.25rem" } : {}}>
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

export default function ConnectBankSection() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justConnected = searchParams.get("connected") === "true";

  const syncState = useSyncState();

  // Session & connection
  const [userId, setUserId]               = useState("anon");
  const [email, setEmail]                 = useState("");
  const [bankConnected, setBankConnected] = useState(false);
  const [statusLoaded, setStatusLoaded]   = useState(false);

  // Date range — defaults to current FY
  const [from, setFrom] = useState(DATE_OPTIONS[0].value);

  // Mobile (first-time connect)
  const [mobile, setMobile]             = useState("");
  const [connecting, setConnecting]     = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Stored sync statuses (for "last synced" display in idle state)
  const [demoStatus, setDemoStatus]   = useState<StoredSyncStatus | null>(null);
  const [basiqStatus, setBasiqStatus] = useState<StoredSyncStatus | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid   = session?.user?.id    ?? "anon";
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
        }
      } catch { /* ignore — default stays false */ }

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
      // Strip ?connected=true from URL without reloading
      if (justConnected) router.replace("/import");
    } catch (err) {
      syncState.setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/basiq/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/import", mobile, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start bank connection.");
      window.location.href = data.authLink;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Something went wrong.");
      setConnecting(false);
    }
  }

  // ── Active sync states ─────────────────────────────────────────────────────

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

  // ── Idle: post-connect redirect ────────────────────────────────────────────

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

  if (statusLoaded && bankConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Connected Bank</p>
          <span className="rounded px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
            Connected
          </span>
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
      </div>
    );
  }

  // ── Idle: not connected ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Primary: sample data */}
      <div>
        <button
          onClick={handleDemoSync}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          Try with sample data
        </button>
        <p className="mt-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          No bank account needed — loads sample transactions instantly.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-elevated)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>or connect your bank</span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-elevated)" }} />
      </div>

      {/* Real bank */}
      <div className="space-y-2">
        <input
          type="tel"
          placeholder="Mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="h-11 w-full rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#22C55E] transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid transparent",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={handleConnect}
          disabled={connecting || !mobile.trim()}
          className="flex w-full items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          {connecting && <Spinner />}
          {connecting ? "Connecting…" : "Connect bank"}
        </button>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Your bank sends a verification code to this number.
        </p>
      </div>

      {/* Demo last-synced status (only if they've run demo before) */}
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
              <button onClick={handleDemoSync} className="text-xs font-medium" style={{ color: "var(--violet-from)" }}>
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

      {connectError && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm font-medium text-red-400">Connection failed</p>
          <p className="mt-0.5 text-sm text-red-400" style={{ opacity: 0.8 }}>{connectError}</p>
        </div>
      )}
    </div>
  );
}
