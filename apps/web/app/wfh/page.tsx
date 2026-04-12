import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requireUserWithType } from "../../lib/auth";
import { calcWfhSummary } from "../../lib/wfhSummary";
import { WfhForm } from "./WfhForm";
import { deleteWfhEntry } from "./actions";

export const dynamic = "force-dynamic";

export default async function WfhLog() {
  let userId: string;
  try {
    ({ id: userId } = await requireUserWithType());
  } catch {
    redirect("/login");
  }

  const entries = await db.wfhLog.findMany({
    where:   { userId },
    orderBy: { date: "desc" },
  });

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const { monthHours, monthEst, ytdHours, ytdEst, monthName } = calcWfhSummary(entries);
  const totalEst = (totalHours * 0.67).toFixed(2);

  return (
    <main
      className="mx-auto max-w-lg px-5 py-10 sm:py-14"
      style={{ backgroundColor: "var(--bg-app)" }}
    >

      {/* 1. Title */}
      <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
        Work from home
      </h1>

      {/* 2. Subtitle */}
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        Track hours you work from home. The ATO's 67c fixed-rate method requires a log of actual hours.
      </p>

      {/* 3. Monthly summary */}
      {monthHours > 0 ? (
        <div
          className="mt-6 rounded-xl px-5 py-5"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            {monthName}
          </p>
          <div className="flex items-end gap-3">
            <span className="text-[42px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
              {monthHours}
            </span>
            <span className="text-base mb-1" style={{ color: "var(--text-secondary)" }}>
              hr{monthHours !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
            ~${monthEst.toFixed(2)}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            estimated deduction · 67c/hr ATO fixed-rate
          </p>
          {ytdHours > monthHours && (
            <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--bg-elevated)", paddingTop: "0.75rem" }}>
              Year to date: {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${ytdEst.toFixed(2)}
            </p>
          )}
        </div>
      ) : entries.length > 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
          No hours logged for {monthName} yet.
        </p>
      ) : null}

      {/* 4 + 5. Form + Add entry button */}
      <div className="mt-8">
        <WfhForm />
      </div>

      {/* 6. Log */}
      {entries.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Log
            </h2>
            <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {entries.length} day{entries.length !== 1 ? "s" : ""} · {totalHours} hr{totalHours !== 1 ? "s" : ""} · ~${totalEst}
            </span>
          </div>

          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {entry.note && (
                    <span className="truncate text-sm" style={{ color: "var(--text-muted)" }}>{entry.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {entry.hours} hr{entry.hours !== 1 ? "s" : ""}
                  </span>
                  <form action={deleteWfhEntry.bind(null, entry.id)}>
                    <button
                      type="submit"
                      className="text-xs transition-colors duration-150 hover:text-red-400"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. ATO note */}
      <p className="mt-10 text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
        The ATO requires a record of actual hours worked from home to use the 67c fixed-rate method.
      </p>

    </main>
  );
}
