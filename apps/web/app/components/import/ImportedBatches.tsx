"use client";

import { useState, useEffect, useCallback } from "react";

type Batch = {
  id: string;
  fileName: string;
  insertedCount: number;
  createdAt: string;
};

export default function ImportedBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mt-10 border-t border-gray-100 pt-8 dark:border-gray-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Previously imported</h2>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Clear a file to remove all its transactions and deduction candidates from the database.
          </p>
        </div>
        <button
          onClick={handleClearAll}
          disabled={clearingAll || deleting !== null}
          className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {clearingAll ? "Clearing…" : "Clear all"}
        </button>
      </div>

      <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        {batches.map((batch) => (
          <li key={batch.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {batch.fileName}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                {batch.insertedCount} transaction{batch.insertedCount !== 1 ? "s" : ""} ·{" "}
                {new Date(batch.createdAt).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => handleDelete(batch.id)}
              disabled={deleting === batch.id}
              className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {deleting === batch.id ? "Clearing…" : "Clear"}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
