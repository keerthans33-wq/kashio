"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type ImportResult = {
  inserted: number;
  duplicates: number;
  invalid: number;
  flagged: number;
};

export default function ConnectFlow() {
  const searchParams = useSearchParams();

  // Basiq redirects back here with ?connected=true after the user links their bank.
  const justConnected = searchParams.get("connected") === "true";

  const [mobile, setMobile]             = useState("");
  const [connecting, setConnecting]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [importError, setImportError]   = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/basiq/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/connect", mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start bank connection.");
      window.location.href = data.authLink;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Something went wrong.");
      setConnecting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/basiq/transactions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import transactions.");
      setImportResult(data as ImportResult);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  // ── Step 3: Import complete ─────────────────────────────────────────────────
  if (importResult) {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-medium text-gray-800 dark:text-gray-200">Import complete</p>
          <ul className="mt-2 space-y-1">
            <li className="text-green-700 dark:text-green-400">{importResult.inserted} transactions imported</li>
            {importResult.duplicates > 0 && (
              <li className="text-gray-500 dark:text-gray-400">{importResult.duplicates} duplicates skipped</li>
            )}
            {importResult.invalid > 0 && (
              <li className="text-yellow-700 dark:text-yellow-400">{importResult.invalid} rows could not be mapped</li>
            )}
            <li className="text-violet-700 dark:text-violet-400">{importResult.flagged} possible deductions found</li>
          </ul>
        </div>
        <a
          href="/review"
          className="inline-block rounded-md bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Go to Review →
        </a>
      </div>
    );
  }

  // ── Step 2: Bank connected — fetch transactions ─────────────────────────────
  if (justConnected) {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Bank connected successfully.
          </p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            Click below to fetch your transactions and scan them for possible deductions.
          </p>
        </div>

        <button
          onClick={handleImport}
          disabled={importing}
          className="rounded-md bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {importing ? "Fetching transactions…" : "Fetch my transactions"}
        </button>

        {importError && (
          <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
        )}
      </div>
    );
  }

  // ── Step 1: Connect your bank ───────────────────────────────────────────────
  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-row items-center gap-2">
        <input
          type="tel"
          placeholder="Mobile number (e.g. 0412 345 678)"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          onClick={handleConnect}
          disabled={connecting || !mobile.trim()}
          className="rounded-md bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {connecting ? "Opening bank connection…" : "Connect your bank"}
        </button>
      </div>

      {connectError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection failed</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{connectError}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Your mobile number is sent to Basiq to verify your identity · read-only access · your credentials are never shared with Kashio
      </p>
    </div>
  );
}
