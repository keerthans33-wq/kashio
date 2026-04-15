"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSyncState } from "../../../lib/syncState";
import type { SyncResult } from "../../../lib/syncState";
import { createDemoBankProvider } from "../../../lib/providers";
import type { BankProvider, StoredSyncStatus } from "../../../lib/providers";
import { supabase } from "../../../lib/supabase";

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

// Shows source name, last synced time, and result stats.
// Accepts generic props so it can be reused for any sync provider.
function SyncStatusSection({
  source,
  connected,
  lastSynced,
  result,
  onSync,
}: {
  source: string;
  connected: boolean;
  lastSynced: Date;
  result: SyncResult;
  onSync: () => void;
}) {
  const time = lastSynced.toLocaleString("en-AU", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

  const stats = [
    `${result.inserted} imported`,
    result.duplicates > 0 && `${result.duplicates} skipped`,
    result.flagged > 0 && `${result.flagged} deduction${result.flagged !== 1 ? "s" : ""}`,
  ].filter(Boolean).join("  ·  ");

  return (
    <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{source}</p>
          {connected && (
            <span className="rounded px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Last synced {time}</p>
          <button onClick={onSync} className="text-xs font-medium" style={{ color: "var(--violet-from)" }}>
            Sync again
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{stats}</p>
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

function SyncSuccess({ result, onSync }: { result: SyncResult; onSync: () => void }) {
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
        <button onClick={onSync} className="text-sm" style={{ color: "var(--text-muted)" }}>Sync again</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>

      {/* Status row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>✓</span>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Sync complete</p>
        </div>
        <p className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          {result.inserted} imported{result.duplicates > 0 ? ` · ${result.duplicates} skipped` : ""}
        </p>
      </div>

      {/* Money — main focus */}
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

      {/* Actions */}
      <div className="px-5 pb-5 flex items-center gap-4" style={result.flagged > 0 ? { borderTop: "1px solid var(--bg-elevated)", paddingTop: "1.25rem" } : {}}>
        <a
          href="/review"
          className="flex-1 rounded-xl py-3 text-center text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          Review deductions
        </a>
        <button onClick={onSync} className="shrink-0 text-sm" style={{ color: "var(--text-muted)" }}>
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
        <p className="text-sm font-medium text-red-400">
          Sync didn&apos;t complete
        </p>
        <p className="mt-1 text-sm text-red-400" style={{ opacity: 0.8 }}>
          Your transactions weren&apos;t imported. Nothing was saved.
        </p>
        {message && (
          <p className="mt-2 text-xs font-mono break-all text-red-400" style={{ opacity: 0.7 }}>
            {message}
          </p>
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

  const [storedStatus, setStoredStatus] = useState<StoredSyncStatus | null>(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [demoProvider, setDemoProvider] = useState<BankProvider>(() => createDemoBankProvider("anon"));
  const [providerReady, setProviderReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id ?? "anon";
      const provider = createDemoBankProvider(userId);
      setDemoProvider(provider);
      setStoredStatus(provider.loadStatus());
      setIsConnected(provider.isConnected());
      setProviderReady(true);
    });
  }, []);

  const demo = useSyncState();

  const [mobile, setMobile]             = useState("");
  const [connecting, setConnecting]     = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleSync(provider: BankProvider) {
    demo.setConnecting();
    await new Promise((r) => setTimeout(r, 900));
    demo.setSyncing();
    try {
      const result = await provider.sync();
      provider.saveStatus(result);
      setStoredStatus(provider.loadStatus());
      setIsConnected(provider.isConnected());
      demo.setSuccess(result);
    } catch (err) {
      demo.setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // Auto-fetch transactions when landing back from Basiq.
  useEffect(() => {
    if (justConnected) handleFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/basiq/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/import", mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start bank connection.");
      window.location.href = data.authLink;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Something went wrong.");
      setConnecting(false);
    }
  }

  async function handleFetch() {
    // Called after Basiq redirect — no connecting pause needed, already connected.
    demo.setSyncing();
    try {
      const res = await fetch("/api/basiq/transactions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import transactions.");
      demoProvider.saveStatus(data);
      setStoredStatus(demoProvider.loadStatus());
      setIsConnected(demoProvider.isConnected());
      demo.setSuccess(data);
      router.replace("/import");
    } catch (err) {
      demo.setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // ── Active sync states take over the section entirely ────────────────────────

  if (demo.sync.status === "connecting") {
    return <SyncInProgress label="Connecting…" detail="This will only take a moment." />;
  }

  if (demo.sync.status === "syncing" || justConnected) {
    return <SyncInProgress label="Importing transactions…" detail="This will only take a moment." />;
  }

  if (demo.sync.status === "success") {
    return <SyncSuccess result={demo.sync.result} onSync={() => handleSync(demoProvider)} />;
  }

  if (demo.sync.status === "error") {
    return <SyncFailed message={demo.sync.message} onRetry={() => handleSync(demoProvider)} />;
  }

  // ── Idle ──────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Primary: sample data */}
      <div>
        <button
          onClick={() => handleSync(demoProvider)}
          disabled={connecting}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
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

      {/* Secondary: real bank */}
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

      {providerReady && storedStatus && (
        <SyncStatusSection
          source={demoProvider.name}
          connected={isConnected}
          lastSynced={new Date(storedStatus.lastSynced)}
          result={storedStatus.result}
          onSync={() => handleSync(demoProvider)}
        />
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
