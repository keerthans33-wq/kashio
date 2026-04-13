import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE } from "../../../lib/rules/categories";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

const SUBTITLE: Record<string, string> = {
  employee:    "Your confirmed deductions for this financial year, ready for your accountant or tax return.",
  contractor:  "Your confirmed expenses for this financial year, ready to reconcile and lodge.",
  sole_trader: "Your confirmed deductions for this financial year, ready for your accountant or tax return.",
};

const TOTAL_LABEL: Record<string, string> = {
  employee:    "Total deductions",
  contractor:  "Total expenses",
  sole_trader: "Total deductions",
};

const SAVING_LABEL: Record<string, (saving: string) => string> = {
  employee:    (s) => `~${s} estimated saving at 32.5c marginal rate`,
  contractor:  (s) => `~${s} estimated saving`,
  sole_trader: (s) => `~${s} estimated saving`,
};

const WFH_LABEL: Record<string, string> = {
  employee:    "Work from home",
  contractor:  "Home office",
  sole_trader: "Home office",
};

const EMPTY_CTA: Record<string, string> = {
  employee:    "Review deductions",
  contractor:  "Review expenses",
  sole_trader: "Review deductions",
};

export default async function Export() {
  const { id: userId, userType } = await requireUserWithType();
  const allowedCategories = (userType && CATEGORIES_BY_USER_TYPE[userType]) ?? ACTIVE_CATEGORIES;

  const [confirmedRaw, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { status: "CONFIRMED", userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "asc" } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  const { ytdHours: wfhYtdHours, ytdEst: wfhYtdEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);

  const confirmed = confirmedRaw.filter((c) => allowedCategories.includes(c.category));

  const allItems = confirmed.map((c) => ({
    id:  c.id,
    row: mapExportRow(c),
  }));

  const total           = allItems.reduce((sum, c) => sum + c.row.amount, 0);
  const estimatedSaving = Math.round(total * 0.325);

  const catTotals = new Map<string, number>();
  for (const item of allItems) {
    catTotals.set(item.row.category, (catTotals.get(item.row.category) ?? 0) + item.row.amount);
  }
  const categoryGroups = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, catTotal]) => ({
      cat,
      catTotal,
      items: allItems.filter((i) => i.row.category === cat),
    }));

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtRound = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  if (confirmed.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="text-[30px] font-bold" style={{ color: "var(--text-primary)" }}>
          Your tax summary is empty
        </h1>
        <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          {userType === "contractor"
            ? "Confirm your business expenses in Review and they'll appear in your summary."
            : "Confirm some deductions in Review and they'll appear in your summary."}
        </p>
        <a
          href="/review"
          className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          {(userType && EMPTY_CTA[userType]) ?? "Review deductions"}
        </a>
      </main>
    );
  }

  // TODO: replace with real DB lookup once payments are integrated
  const isPaid = false;

  const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest mb-3";

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">

      {/* 1. Title + subtitle */}
      <div className="mb-7">
        <h1 className="text-[30px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          Your tax summary
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {(userType && SUBTITLE[userType]) ?? "Everything you've confirmed this financial year."}
        </p>
      </div>

      {/* 2. Summary cards — always visible */}
      <div className={`mb-10 ${wfhYtdHours > 0 ? "grid grid-cols-2 gap-4" : ""}`}>

        {/* Total deductions */}
        <div
          className="rounded-xl px-5 py-5 flex flex-col gap-3"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)", minHeight: 190 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {(userType && TOTAL_LABEL[userType]) ?? "Total deductions"}
          </p>
          <div className="flex-1 flex flex-col justify-end gap-1">
            <p
              className={`font-bold tabular-nums leading-none ${wfhYtdHours > 0 ? "text-[28px]" : "text-[42px]"}`}
              style={{ color: "var(--text-primary)" }}
            >
              {fmtRound(total)}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {confirmed.length} item{confirmed.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
            ~{fmtRound(estimatedSaving)} tax saving
          </p>
        </div>

        {/* Home office — only when hours exist */}
        {wfhYtdHours > 0 && (
          <div
            className="rounded-xl px-5 py-5 flex flex-col gap-3"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)", minHeight: 190 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {(userType && WFH_LABEL[userType]) ?? "Home office"}
            </p>
            <div className="flex-1 flex flex-col justify-end gap-1">
              <p className="text-[28px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                ~{fmtRound(wfhYtdEst)}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {wfhYtdHours} hr{wfhYtdHours !== 1 ? "s" : ""} logged
              </p>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              67c/hr fixed rate
            </p>
          </div>
        )}
      </div>

      {isPaid ? (
        <>
          {/* 3. Category breakdown */}
          <div className="mb-10">
            <p className={sectionLabel} style={{ color: "var(--text-muted)" }}>Breakdown</p>
            <div className="space-y-6">
              {categoryGroups.map(({ cat, catTotal, items }) => (
                <div key={cat}>
                  {/* Category header */}
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {cat}
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {fmt(catTotal)}
                    </span>
                  </div>
                  {/* Items */}
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 py-2.5"
                        style={{ borderBottom: "1px solid var(--bg-elevated)" }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
                            {item.row.merchant}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {item.row.date}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                          {fmt(item.row.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="text-[17px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {fmt(total)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Download */}
          <ExportButton />
        </>
      ) : (
        <>
          {/* 3. Blurred breakdown preview */}
          <div className="mb-6 relative overflow-hidden rounded-xl" style={{ pointerEvents: "none", userSelect: "none" }}>
            <div style={{ filter: "blur(5px)", opacity: 0.45 }}>
              <p className={sectionLabel} style={{ color: "var(--text-muted)" }}>Breakdown</p>
              <div className="rounded-xl px-5 py-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
                {allItems.slice(0, 5).map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-4 ${i > 0 ? "mt-3" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm" style={{ color: "var(--text-secondary)" }}>
                        {item.row.merchant}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.row.date}</p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {fmt(item.row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Fade out towards bottom */}
            <div
              className="absolute inset-x-0 bottom-0 h-16"
              style={{ background: "linear-gradient(to bottom, transparent, var(--bg-app))" }}
            />
          </div>

          {/* 4. Paywall card */}
          <div
            className="mb-8 rounded-2xl px-6 py-7"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--violet-from)" }}
          >
            {/* Lock icon */}
            <div
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, var(--violet-from), var(--violet-to))" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-[20px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Unlock your tax summary
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              Get your full itemised breakdown and a downloadable report — ready to share with your accountant or lodge your return.
            </p>

            {/* What's included */}
            <ul className="mb-6 space-y-2">
              {[
                "Full itemised category breakdown",
                "Downloadable XLSX tax report",
                "Work from home hours summary",
                "Ready for your accountant",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--success)" }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            {/* Price */}
            <div className="mb-5 flex items-baseline gap-2">
              <span className="text-[34px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                $9
              </span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                one-time · this financial year
              </span>
            </div>

            {/* CTA */}
            <button
              className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
            >
              Unlock report
            </button>
          </div>
        </>
      )}

      {/* Footer notes */}
      <div
        className="mt-8 pt-6 space-y-1.5 text-center"
        style={{ borderTop: "1px solid var(--bg-elevated)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          The ATO recommends keeping receipts for your records.
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          Kashio is not a tax adviser. Check with your accountant before lodging.
        </p>
      </div>

    </main>
  );
}
