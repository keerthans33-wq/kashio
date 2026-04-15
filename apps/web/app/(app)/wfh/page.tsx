import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { WfhForm } from "./WfhForm";
import { deleteWfhEntry } from "./actions";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";

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

  return (
    <MobileScreen maxWidth="sm" as="main" padY={false} className="py-8 sm:py-10">

      {/* Header */}
      <FadeIn className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
            Work from home
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-muted)" }}>
            67¢/hr ATO fixed rate — log every day you work from home.
          </p>
        </div>
      </FadeIn>

      {/* Summary — this month */}
      {monthHours > 0 && (
        <FadeIn delay={0.06}>
          <div
            className="mt-5 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: "var(--bg-card)",
              border:          "1px solid var(--bg-border)",
              boxShadow:       "var(--shadow-card)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              {monthName}
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                    {monthHours}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    hr{monthHours !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>hours logged</p>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-bold tabular-nums leading-none" style={{ color: "#22C55E" }}>
                  ~${Math.round(monthEst)}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>est. deduction</p>
              </div>
            </div>
            {ytdHours > monthHours && (
              <p
                className="mt-3 pt-3 text-[11px]"
                style={{ color: "var(--text-muted)", borderTop: "1px solid var(--bg-border)" }}
              >
                Year to date: {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${Math.round(ytdEst)}
              </p>
            )}
          </div>
        </FadeIn>
      )}

      {/* Log form */}
      <FadeIn delay={monthHours > 0 ? 0.1 : 0.06}>
        <div
          className="mt-5 rounded-2xl px-5 py-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border:          "1px solid var(--bg-border)",
            boxShadow:       "var(--shadow-card)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Add entry
          </p>
          <WfhForm />
        </div>
      </FadeIn>

      {/* Entry log */}
      {entries.length > 0 && (
        <FadeIn delay={0.14}>
          <div className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Log
              </p>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {entries.length} day{entries.length !== 1 ? "s" : ""} · {totalHours} hr{totalHours !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border:          "1px solid var(--bg-border)",
                    boxShadow:       "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[13px] font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {new Date(entry.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </span>
                    {entry.note && (
                      <span className="truncate text-[12px]" style={{ color: "var(--text-muted)" }}>
                        {entry.note}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                      {entry.hours} hr{entry.hours !== 1 ? "s" : ""}
                    </span>
                    <form action={deleteWfhEntry.bind(null, entry.id)}>
                      <button
                        type="submit"
                        className="text-[12px] transition-colors duration-150 hover:text-red-400"
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
        </FadeIn>
      )}

      {/* ATO note */}
      <p className="mt-8 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
        The ATO requires a record of actual hours to use the 67¢/hr fixed rate.
      </p>

    </MobileScreen>
  );
}
