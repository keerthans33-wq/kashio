"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type ImportResult = {
  inserted: number;
  duplicates: number;
  invalid?: number;
  flagged: number;
  isDemo?: boolean;
};

function Spinner() {
  return (
    <svg
      className="inline-block h-4 w-4 animate-spin"
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

export default function ConnectBankSection() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Basiq redirects back to /import?connected=true after the user links their bank.
  const justConnected = searchParams.get("connected") === "true";

  // ── Demo bank sync state machine ────────────────────────────────────────────
  // idle → connecting → syncing → (importResult set) or failed
  type DemoPhase = "idle" | "connecting" | "syncing" | "failed";
  const [demoPhase, setDemoPhase]       = useState<DemoPhase>("idle");
  const [demoError, setDemoError]       = useState<string | null>(null);

  const [mobile, setMobile]             = useState("");
  const [connecting, setConnecting]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [importError, setImportError]   = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleDemo() {
    setDemoPhase("connecting");
    setDemoError(null);

    // Brief pause so "connecting" is visible — mirrors how real bank sync feels.
    await new Promise((r) => setTimeout(r, 900));

    setDemoPhase("syncing");

    try {
      const res = await fetch("/api/demo/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo sync failed.");
      // Success — the importResult state takes over rendering.
      setImportResult({ ...(data as ImportResult), isDemo: true });
      setDemoPhase("idle");
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Something went wrong.");
      setDemoPhase("failed");
    }
  }

  // Auto-fetch transactions as soon as we land back from Basiq.
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
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/basiq/transactions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import transactions.");
      setImportResult(data as ImportResult);
      // Remove ?connected=true from the URL now that we've handled it.
      router.replace("/import");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  // ── After import ────────────────────────────────────────────────────────────
  if (importResult) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            {importResult.isDemo ? "Demo sync complete" : "Bank connected successfully"}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="text-green-700 dark:text-green-400">
              {importResult.inserted} transaction{importResult.inserted !== 1 ? "s" : ""} imported
            </li>
            {importResult.duplicates > 0 && (
              <li className="text-gray-500 dark:text-gray-400">
                {importResult.duplicates} duplicate{importResult.duplicates !== 1 ? "s" : ""} skipped
              </li>
            )}
            {importResult.invalid > 0 && (
              <li className="text-yellow-700 dark:text-yellow-400">
                {importResult.invalid} transaction{importResult.invalid !== 1 ? "s" : ""} could not be read
              </li>
            )}
            {importResult.flagged > 0 && (
              <li className="text-violet-700 dark:text-violet-400">
                {importResult.flagged} possible deduction{importResult.flagged !== 1 ? "s" : ""} found
              </li>
            )}
          </ul>
        </div>
        {importResult.inserted > 0 || importResult.flagged > 0 ? (
          <a
            href="/review"
            className="inline-block rounded-md bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Go to Review →
          </a>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No new transactions to review.
          </p>
        )}
      </div>
    );
  }

  // ── Loading: fetching transactions after redirect back from Basiq ────────────
  if (importing) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
        <p className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-300">
          <Spinner />
          Fetching your transactions…
        </p>
      </div>
    );
  }

  // ── Import failed (shown after returning from Basiq if fetch errors) ─────────
  if (importError) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Import failed</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{importError}</p>
        </div>
        <button
          onClick={handleFetch}
          className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Waiting for auto-fetch to start (brief window between redirect and useEffect) ──
  if (justConnected) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
        <p className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-300">
          <Spinner />
          Bank connected — fetching transactions…
        </p>
      </div>
    );
  }

  // ── Default: Connect button ─────────────────────────────────────────────────
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
          disabled={connecting || demoLoading || !mobile.trim()}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {connecting && <Spinner />}
          {connecting ? "Connecting…" : "Connect Bank"}
        </button>
        <button
          onClick={handleDemo}
          disabled={demoPhase !== "idle" || connecting}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Connect Bank (Demo)
        </button>
      </div>

      {/* Demo sync status — shown while the demo is in progress or failed */}
      {demoPhase === "connecting" && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Spinner />
          Connecting to demo bank…
        </div>
      )}
      {demoPhase === "syncing" && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Spinner />
          Syncing transactions…
        </div>
      )}
      {demoPhase === "failed" && (
        <div className="space-y-2">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Sync failed</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{demoError}</p>
          </div>
          <button
            onClick={handleDemo}
            className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            Try again
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Enter your mobile and click <span className="font-medium">Connect Bank</span> to link your real bank via Basiq, or use <span className="font-medium">Connect Bank (Demo)</span> to try with sample data.
      </p>
      {connectError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection failed</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{connectError}</p>
        </div>
      )}
    </div>
  );
}
