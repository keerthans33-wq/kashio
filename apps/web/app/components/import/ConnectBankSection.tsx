"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSyncState } from "../../../lib/syncState";
import type { SyncResult } from "../../../lib/syncState";
import { demoBankProvider } from "../../../lib/providers";
import type { BankProvider, StoredSyncStatus } from "../../../lib/providers";

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
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 dark:border-green-800 dark:bg-green-900/20">
        <p className="text-sm font-medium text-green-800 dark:text-green-300">Demo Bank — sync complete</p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xl font-semibold text-green-800 dark:text-green-200">{result.inserted}</p>
            <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">imported</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">{result.duplicates}</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">skipped</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-violet-600 dark:text-violet-400">{result.flagged}</p>
            <p className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">deductions</p>
          </div>
        </div>

        {(result.invalid ?? 0) > 0 && (
          <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            {result.invalid} transaction{result.invalid !== 1 ? "s" : ""} could not be read
          </p>
        )}
      </div>

      <div className="space-y-2">
        {result.flagged > 0 && (
          <div>
            <a
              href="/review"
              className="inline-block rounded-md bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Review {result.flagged} deduction{result.flagged !== 1 ? "s" : ""} →
            </a>
          </div>
        )}
        {result.inserted > 0 && (
          <div className="flex items-center gap-4">
            <a
              href="/transactions"
              className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              View imported transactions →
            </a>
            <button
              onClick={onSync}
              className="text-sm text-gray-400 hover:underline dark:text-gray-500"
            >
              Sync again
            </button>
          </div>
        )}
        {result.inserted === 0 && result.flagged === 0 && (
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">No new transactions — already up to date.</p>
            <button
              onClick={onSync}
              className="text-sm text-gray-400 hover:underline dark:text-gray-500"
            >
              Sync again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SyncFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Sync didn&apos;t complete
        </p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Your transactions weren&apos;t imported. Nothing was saved.
        </p>
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

  useEffect(() => {
    setStoredStatus(demoBankProvider.loadStatus());
    setIsConnected(demoBankProvider.isConnected());
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
      demoBankProvider.saveStatus(data);
      setStoredStatus(demoBankProvider.loadStatus());
      setIsConnected(demoBankProvider.isConnected());
      demo.setSuccess(data);
      router.replace("/import");
    } catch (err) {
      demo.setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // ── Active sync states take over the section entirely ────────────────────────

  if (demo.sync.status === "connecting") {
    return <SyncInProgress label="Connecting to Demo Bank…" detail="Setting up the sample data connection." />;
  }

  if (demo.sync.status === "syncing" || justConnected) {
    return <SyncInProgress label="Syncing transactions…" detail="Fetching sample transactions from Demo Bank." />;
  }

  if (demo.sync.status === "success") {
    return <SyncSuccess result={demo.sync.result} onSync={() => handleSync(demoBankProvider)} />;
  }

  if (demo.sync.status === "error") {
    return <SyncFailed onRetry={() => handleSync(demoBankProvider)} />;
  }

  // ── Idle ──────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex flex-row flex-wrap items-center gap-2">
        <input
          type="tel"
          placeholder="Your mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-52 rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          onClick={handleConnect}
          disabled={connecting || !mobile.trim()}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {connecting && <Spinner />}
          {connecting ? "Connecting…" : "Connect Bank"}
        </button>
        <button
          onClick={() => handleSync(demoBankProvider)}
          disabled={connecting}
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Connect Bank (Demo)
        </button>
      </div>

      {storedStatus && (
        <SyncStatusSection
          source={demoBankProvider.name}
          connected={isConnected}
          lastSynced={new Date(storedStatus.lastSynced)}
          result={storedStatus.result}
          onSync={() => handleSync(demoBankProvider)}
        />
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        <span className="font-medium">Connect Bank (Demo)</span> loads sample transactions so you can try the full flow — no real bank account needed.
      </p>

      {connectError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection failed</p>
          <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">{connectError}</p>
        </div>
      )}
    </div>
  );
}
