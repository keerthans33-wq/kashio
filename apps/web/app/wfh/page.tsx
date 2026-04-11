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
      subtitle:         "Record the days you work from home. The ATO's fixed-rate method requires a log of actual hours — this helps you track your home office hours throughout the year.",
      estLabel:         "estimated home office deduction",
      monthZeroMsg:     (month: string) => `No home office hours logged for ${month} yet. Add a day next time you work from home.`,
      logEmptyMsg:      "No entries yet. Add your first home-based work day above.",
    };
  }
  // employee (default)
  return {
    subtitle:         "Record the days you work from home. The ATO's fixed-rate method requires a log showing actual hours worked — this helps you keep track throughout the year.",
    estLabel:         "estimated work-from-home deduction",
    monthZeroMsg:     (month: string) => `No WFH hours logged for ${month} yet. Add a day next time you work from home.`,
    logEmptyMsg:      "No entries yet. Add your first work from home day above.",
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
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Work from home log
      </h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        {copy.subtitle}
      </p>

      {monthHours > 0 ? (
        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {monthHours}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              hr{monthHours !== 1 ? "s" : ""} in {monthName}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            ~${monthEst.toFixed(2)} {copy.estLabel} at 67c/hr (ATO fixed-rate)
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            The 67c rate is set by the ATO — how much tax you save depends on your marginal rate.
          </p>
          {ytdHours > monthHours && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Year to date: {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${ytdEst.toFixed(2)}
            </p>
          )}
        </div>
      ) : entries.length > 0 ? (
        // Returning user — has past entries but nothing logged this month yet
        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
          {copy.monthZeroMsg(monthName)}
        </p>
      ) : null /* First visit — log section below already shows the empty state */}

      <WfhForm />

      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Log</h2>
          {entries.length > 0 && (
            <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
              {entries.length} day{entries.length !== 1 ? "s" : ""} · {totalHours} hr{totalHours !== 1 ? "s" : ""} · ~${totalEst}
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {copy.logEmptyMsg}
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="tabular-nums text-gray-900 dark:text-gray-100">
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {entry.note && (
                    <span className="text-gray-400 dark:text-gray-500">{entry.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    {entry.hours} hr{entry.hours !== 1 ? "s" : ""}
                  </span>
                  <form action={deleteWfhEntry.bind(null, entry.id)}>
                    <button
                      type="submit"
                      className="text-xs text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500 transition-colors"
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

      <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
        The ATO requires a record of actual hours worked from home to use the 67c fixed-rate method.
      </p>
    </main>
  );
}
