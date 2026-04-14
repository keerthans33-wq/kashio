"use client";

import { useState, useEffect, useCallback } from "react";

type TransactionSource = "CSV" | "DEMO_BANK" | "BASIQ";

type Batch = {
  id: string;
  fileName: string;
  insertedCount: number;
  source: TransactionSource;
  createdAt: string;
};

function SourceBadge({ source }: { source: TransactionSource }) {
  const label = source === "DEMO_BANK" ? "Demo Bank" : source === "BASIQ" ? "Bank" : "CSV";
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
    >
      {label}
    </span>
  );
}

export default function ImportedBatches() {
  const [batches, setBatches]       = useState<Batch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/batches");
      if (res.ok) setBatches(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClearAll() {
    setClearingAll(true);
    setError(null);
    try {
      const res = await fetch("/api/batches", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBatches([]);
      Object.keys(localStorage)
        .filter((k) => k.startsWith("kashio:demo-sync-status:"))
        .forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    } catch {
      setError("Failed to clear all imports. Try again.");
    } finally {
      setClearingAll(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete.");
      setBatches((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError("Failed to clear that import. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return null;
  if (batches.length === 0) return null;

  return (
    <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--bg-elevated)" }}>

      <div className="flex items-center justify-between gap-4 mb-3">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Previously imported
        </p>
        <button
          onClick={handleClearAll}
          disabled={clearingAll || deleting !== null}
          className="text-xs font-medium disabled:opacity-40"
          style={{ color: "rgba(239,68,68,0.8)" }}
        >
          {clearingAll ? "Clearing…" : "Clear all"}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-elevated)" }}>
        {batches.map((batch, i) => (
          <div
            key={batch.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
            style={{
              backgroundColor: "var(--bg-card)",
              borderTop: i > 0 ? "1px solid var(--bg-elevated)" : undefined,
            }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {batch.fileName}
                </p>
                <SourceBadge source={batch.source} />
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {batch.insertedCount} transaction{batch.insertedCount !== 1 ? "s" : ""} ·{" "}
                {new Date(batch.createdAt).toLocaleDateString("en-AU", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => handleDelete(batch.id)}
              disabled={deleting === batch.id}
              className="shrink-0 text-xs font-medium disabled:opacity-40"
              style={{ color: "rgba(239,68,68,0.8)" }}
            >
              {deleting === batch.id ? "Clearing…" : "Clear"}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
