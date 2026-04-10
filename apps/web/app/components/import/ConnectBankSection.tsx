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
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{source}</p>
          {connected && (
            <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">Last synced {time}</p>
          <button
            onClick={onSync}
            className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            Sync again
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stats}</p>
    </div>
  );
}

function SyncInProgress({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2.5">
        <Spinner />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      </div>
      <p className="mt-1.5 pl-[26px] text-sm text-gray-400 dark:text-gray-500">{detail}</p>
    </div>
  );
}

function SyncSuccess({ result, onSync }: { result: SyncResult; onSync: () => void }) {
  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const noneAdded = result.inserted === 0 && result.duplicates > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">

      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs dark:bg-green-900/40 dark:text-green-400">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {noneAdded ? "Already up to date" : "Sync complete"}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {noneAdded
              ? `${result.duplicates} transaction${result.duplicates !== 1 ? "s" : ""} already saved. Nothing new to add.`
              : <>
                  {result.inserted} transaction{result.inserted !== 1 ? "s" : ""} imported
                  {result.duplicates > 0 && <> · {result.duplicates} skipped</>}
                  {(result.invalid ?? 0) > 0 && <> · {result.invalid} unreadable</>}
                </>
            }
          </p>
        </div>
      </div>

      {/* Deduction summary */}
      {result.flagged > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Potential deductions found
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {result.totalValue ? fmt(result.totalValue) : `${result.flagged} items`}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {result.flagged} candidate{result.flagged !== 1 ? "s" : ""} flagged. Review them to confirm which ones apply to you.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 flex flex-wrap items-center gap-3">
        {result.flagged > 0 ? (
          <a href="/review" className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Review deductions →
          </a>
        ) : result.inserted > 0 ? (
          <a href="/transactions" className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
            View transactions →
          </a>
        ) : (
          <a href="/review" className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Go to Review →
          </a>
        )}
        <button onClick={onSync} className="text-sm text-gray-400 hover:underline dark:text-gray-500">
          Sync again
        </button>
      </div>
    </div>
  );
}

function SyncFailed({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Sync didn&apos;t complete
        </p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Your transactions weren&apos;t imported. Nothing was saved.
        </p>
        {message && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-500 font-mono break-all">
            {message}
          </p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
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
    <div className="space-y-5">

      {/* Primary: demo path */}
      <div>
        <button
          onClick={() => handleSync(demoProvider)}
          disabled={connecting}
          className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Try with sample data
        </button>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          No bank account needed. Loads sample transactions so you can try the full flow.
        </p>
      </div>

      {/* Secondary: real bank */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Or connect your real bank</p>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <input
            type="tel"
            placeholder="Mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-44 rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <button
            onClick={handleConnect}
            disabled={connecting || !mobile.trim()}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {connecting && <Spinner />}
            {connecting ? "Connecting…" : "Connect"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection failed</p>
          <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">{connectError}</p>
        </div>
      )}
    </div>
  );
}
