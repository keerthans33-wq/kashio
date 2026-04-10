import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE } from "../../../lib/rules/categories";
import { ExportDetails } from "./ExportDetails";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

const HEADING: Record<string, string> = {
  employee:    "Your work deductions are ready",
  contractor:  "Your business expenses are ready",
  sole_trader: "Your business deductions are ready",
};

const SUBTITLE: Record<string, string> = {
  employee:    "Share this with your accountant or use it to complete your return.",
  contractor:  "Use this to reconcile your expenses and lodge your return.",
  sole_trader: "Ready to hand to your accountant or include in your tax return.",
};

const TOTAL_LABEL: Record<string, string> = {
  employee:    "Total work deductions",
  contractor:  "Total business expenses",
  sole_trader: "Total business deductions",
};

// Estimated saving label varies by user type:
// employees get a marginal-rate estimate; contractors/sole traders reduce taxable income
// so the framing is "tax reduction" rather than a rate-specific saving.
const SAVING_LABEL: Record<string, (saving: string) => string> = {
  employee:    (s) => `Estimated tax saving ~${s} at 32.5c marginal rate`,
  contractor:  (s) => `Reduces your taxable income — estimated saving ~${s}`,
  sole_trader: (s) => `Reduces your taxable income — estimated saving ~${s}`,
};

const TRUST_NOTE: Record<string, string> = {
  employee:    "Before you lodge, go through each item. Only expenses directly related to your job qualify.",
  contractor:  "Before you lodge, review each item. Only genuine business expenses are claimable — not personal costs.",
  sole_trader: "Before you lodge, check each item. Personal expenses mixed with business ones won't qualify.",
};

const EMPTY_HEADING: Record<string, string> = {
  employee:    "No work deductions confirmed yet",
  contractor:  "No business expenses confirmed yet",
  sole_trader: "No business deductions confirmed yet",
};

const EMPTY_CTA: Record<string, string> = {
  employee:    "Review deductions",
  contractor:  "Review expenses",
  sole_trader: "Review deductions",
};

export default async function Export() {
  const { id: userId, userType } = await requireUserWithType();
  const allowedCategories = (userType && CATEGORIES_BY_USER_TYPE[userType]) ?? ACTIVE_CATEGORIES;

  const confirmed = (await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED", userId },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  })).filter((c) => allowedCategories.includes(c.category));

  const allItems = confirmed.map((c) => ({
    id:          c.id,
    row:         mapExportRow(c),
    hasEvidence: c.hasEvidence,
  }));

  const detailItems = allItems.map((c) => ({
    id:       c.id,
    date:     c.row.date,
    merchant: c.row.merchant,
    category: c.row.category,
    amount:   c.row.amount,
  }));

  const total = allItems.reduce((sum, c) => sum + c.row.amount, 0);

  // Rough tax impact using the 32.5c marginal rate (applies $45k–$120k).
  // Displayed as an estimate only — not financial advice.
  const estimatedSaving = Math.round(total * 0.325);

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtRound = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-12">

      {confirmed.length === 0 ? (
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {(userType && EMPTY_HEADING[userType]) ?? "Nothing to export yet"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {userType === "contractor"
              ? "Confirm your business expenses in Review and they'll appear here."
              : "Confirm some deductions in Review and they'll appear here."}
          </p>
          <a
            href="/review"
            className="inline-block rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {(userType && EMPTY_CTA[userType]) ?? "Review deductions"}
          </a>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {userType ? HEADING[userType] ?? "Your deductions are ready" : "Your deductions are ready"}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {userType ? SUBTITLE[userType] ?? "Ready to download for tax time." : "Ready to download for tax time."}
            </p>
          </div>

          {/* Total */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 py-10 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {userType ? TOTAL_LABEL[userType] ?? "Total deductions" : "Total deductions"}
            </p>
            <p className="mt-3 text-6xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {fmt(total)}
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {confirmed.length} confirmed item{confirmed.length !== 1 ? "s" : ""}
            </p>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {userType && SAVING_LABEL[userType]
                ? SAVING_LABEL[userType](fmtRound(estimatedSaving))
                : `Estimated tax saving ~${fmtRound(estimatedSaving)} at 32.5c marginal rate`}
            </p>
          </div>

          {/* Item list */}
          <ExportDetails items={detailItems} />

          {/* Download */}
          <div>
            <ExportButton />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {userType ? TRUST_NOTE[userType] ?? "Before you lodge, take a quick look through the list above. You know your spending better than Kashio does." : "Before you lodge, take a quick look through the list above. You know your spending better than Kashio does."}
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              The ATO recommends keeping receipts for your records. Kashio is not a tax adviser. Check with your accountant if you're unsure about any claim.
            </p>
          </div>

        </div>
      )}
    </main>
  );
}
