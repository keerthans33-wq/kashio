import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requireUserWithType } from "../../lib/auth";
import { calcWfhSummary } from "../../lib/wfhSummary";
import { WfhForm } from "./WfhForm";
import { deleteWfhEntry } from "./actions";

export const dynamic = "force-dynamic";

function wfhCopy(userType: string | null) {
  if (userType === "contractor" || userType === "sole_trader") {
    return {
      subtitle:    "Record the days you work from home. The ATO's fixed-rate method requires a log of actual hours — this helps you track your home office hours throughout the year.",
      estLabel:    "estimated home office deduction",
      monthZeroMsg: (month: string) => `No home office hours logged for ${month} yet.`,
      logEmptyMsg: "No entries yet. Add your first home-based work day above.",
    };
  }
  return {
    subtitle:    "Record the days you work from home. The ATO's fixed-rate method requires a log showing actual hours worked — this helps you keep track throughout the year.",
    estLabel:    "estimated work-from-home deduction",
    monthZeroMsg: (month: string) => `No WFH hours logged for ${month} yet.`,
    logEmptyMsg: "No entries yet. Add your first work from home day above.",
  };
}

export default async function WfhLog() {
  let userId: string;
  let userType: string | null = null;
  try {
    ({ id: userId, userType } = await requireUserWithType());
  } catch {
    redirect("/login");
  }

  const copy = wfhCopy(userType);

  const entries = await db.wfhLog.findMany({
    where:   { userId },
    orderBy: { date: "desc" },
  });

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const { monthHours, monthEst, ytdHours, ytdEst, monthName } = calcWfhSummary(entries);
  const totalEst = (totalHours * 0.67).toFixed(2);

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">

      <h1 className="text-[30px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
        Work from home log
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
        {copy.subtitle}
      </p>

      {/* Monthly stat */}
      {monthHours > 0 ? (
        <div className="mt-6 rounded-xl px-5 py-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{monthHours}</span>
            <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
              hr{monthHours !== 1 ? "s" : ""} in {monthName}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            ~${monthEst.toFixed(2)} {copy.estLabel} at 67c/hr (ATO fixed-rate)
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            The 67c rate is set by the ATO — how much tax you save depends on your marginal rate.
          </p>
          {ytdHours > monthHours && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              Year to date: {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${ytdEst.toFixed(2)}
            </p>
          )}
        </div>
      ) : entries.length > 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
          {copy.monthZeroMsg(monthName)}
        </p>
      ) : null}

      <WfhForm />

      {/* Log */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Log</h2>
          {entries.length > 0 && (
            <span className="text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>
              {entries.length} day{entries.length !== 1 ? "s" : ""} · {totalHours} hr{totalHours !== 1 ? "s" : ""} · ~${totalEst}
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {copy.logEmptyMsg}
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}
              >
                <div className="flex items-center gap-4">
                  <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {entry.note && (
                    <span style={{ color: "var(--text-muted)" }}>{entry.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
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
        )}
      </div>

      <p className="mt-10 text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
        The ATO requires a record of actual hours worked from home to use the 67c fixed-rate method.
      </p>
    </main>
  );
}
