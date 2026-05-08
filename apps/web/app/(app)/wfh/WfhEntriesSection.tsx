"use client";

import { useOptimistic, useTransition } from "react";
import { WfhForm } from "./WfhForm";
import { addWfhEntry, deleteWfhEntry } from "./actions";

type Entry = {
  id:    string;
  date:  string;
  hours: number;
  note:  string | null;
};

type OptimisticEntry = Entry & { pending?: true };

export function WfhEntriesSection({
  initialEntries,
  totalHours,
}: {
  initialEntries: Entry[];
  totalHours:     number;
}) {
  const [isPending, startTransition] = useTransition();
  const [entries, addOptimistic] = useOptimistic<OptimisticEntry[], OptimisticEntry>(
    initialEntries,
    (state, newEntry) =>
      [newEntry, ...state].sort((a, b) => b.date.localeCompare(a.date)),
  );

  const entryCount = entries.length;
  const totalHrs   = entries.reduce((s, e) => s + e.hours, 0);

  function handleAdd(
    date: string,
    hours: number,
    note: string,
  ): Promise<{ error: string } | undefined> {
    const optimistic: OptimisticEntry = {
      id:      `opt-${Date.now()}`,
      date,
      hours,
      note:    note || null,
      pending: true,
    };

    // React 19: startTransition accepts async callbacks.
    // Wrap in a Promise so WfhForm can await the result for error display.
    return new Promise((resolve) => {
      startTransition(async () => {
        addOptimistic(optimistic);
        const result = await addWfhEntry(date, hours, note);
        resolve(result);
      });
    });
  }

  if (entryCount === 0) {
    return <WfhForm onSubmit={handleAdd} />;
  }

  return (
    <>
      <WfhForm onSubmit={handleAdd} />

      <div className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Log
          </p>
          <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            {entryCount} day{entryCount !== 1 ? "s" : ""} · {totalHrs} hr{totalHrs !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-opacity duration-200"
              style={{
                backgroundColor: "var(--bg-card)",
                border:          "1px solid var(--bg-border)",
                boxShadow:       "0 1px 2px rgba(0,0,0,0.3)",
                opacity:         entry.pending ? 0.55 : 1,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="text-[13px] font-medium tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {new Date(entry.date + "T12:00:00").toLocaleDateString("en-AU", {
                    day:   "numeric",
                    month: "short",
                  })}
                </span>
                {entry.note && (
                  <span className="truncate text-[12px]" style={{ color: "var(--text-muted)" }}>
                    {entry.note}
                  </span>
                )}
                {entry.pending && (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    saving…
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-[13px] tabular-nums font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {entry.hours} hr{entry.hours !== 1 ? "s" : ""}
                </span>
                {!entry.pending && (
                  <form action={deleteWfhEntry.bind(null, entry.id)}>
                    <button
                      type="submit"
                      className="text-[12px] transition-colors duration-150 hover:text-red-400"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
