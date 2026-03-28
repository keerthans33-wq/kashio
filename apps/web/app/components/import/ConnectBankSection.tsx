"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type ImportResult = {
  inserted: number;
  duplicates: number;
  invalid: number;
  flagged: number;
};

export default function ConnectBankSection() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Basiq redirects back to /import?connected=true after the user links their bank.
  const justConnected = searchParams.get("connected") === "true";

  const [connecting, setConnecting]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [importError, setImportError]   = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

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
        body: JSON.stringify({ redirectPath: "/import" }),
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
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-medium text-gray-800 dark:text-gray-200">Bank import complete</p>
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

  // ── Fetching after redirect back from Basiq ─────────────────────────────────
  if (justConnected || importing) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            {importing ? "Fetching your transactions…" : "Bank connected — fetching transactions…"}
          </p>
        </div>
        {importError && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
            <button
              onClick={handleFetch}
              className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Default: Connect button ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {connecting ? "Opening bank connection…" : "Connect Bank"}
      </button>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Powered by Basiq · read-only access · your banking password is never shared with Kashio
      </p>
      {connectError && (
        <p className="text-sm text-red-600 dark:text-red-400">{connectError}</p>
      )}
    </div>
  );
}
