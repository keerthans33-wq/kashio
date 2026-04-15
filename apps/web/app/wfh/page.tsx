import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requireUserWithType } from "../../lib/auth";
import { calcWfhSummary } from "../../lib/wfhSummary";
import { WfhForm } from "./WfhForm";
import { deleteWfhEntry } from "./actions";
import { Button } from "@/components/ui/button";
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
  const totalEst = (totalHours * 0.67).toFixed(2);

  return (
    <MobileScreen maxWidth="md" as="main">

      {/* 1. Title */}
      <FadeIn className="flex items-start justify-between gap-4">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
          Work from home
        </h1>
        {entries.length > 0 && (
          <Button asChild size="sm">
            <Link href="/export">Export →</Link>
          </Button>
        )}
      </FadeIn>

      {/* 2. Subtitle */}
      <FadeIn delay={0.06}>
      <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
        Track hours you work from home. The ATO's 67c fixed-rate method requires a log of actual hours.
      </p>
      </FadeIn>

      {/* 3. Monthly summary */}
      {monthHours > 0 ? (
        <FadeIn delay={0.1} className="mt-6">
          <div className="grid grid-cols-2 gap-4">

            {/* Hours */}
            <div
              className="rounded-2xl px-4 py-5 flex flex-col justify-between"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)", minHeight: 118 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {monthName}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[36px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                  {monthHours}
                </span>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  hr{monthHours !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Est. deduction */}
            <div
              className="rounded-2xl px-4 py-5 flex flex-col justify-between"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)", minHeight: 118 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Est. deduction
              </p>
              <div className="mt-3">
                <span className="text-[36px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                  ~${Math.round(monthEst)}
                </span>
              </div>
            </div>

          </div>

          {ytdHours > monthHours && (
            <p className="mt-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
              Year to date: {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${ytdEst.toFixed(2)}
            </p>
          )}
        </FadeIn>
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
                className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {entry.note && (
                    <span className="truncate text-[13px]" style={{ color: "var(--text-muted)" }}>{entry.note}</span>
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

    </MobileScreen>
  );
}
