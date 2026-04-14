/**
 * Smart CSV column detection.
 *
 * Strategy (in order):
 *  1. Scan headers (if present) against known bank aliases.
 *  2. Handle split debit/credit columns (CommBank, Westpac, etc.).
 *  3. Fall back to content scoring — analyse actual cell values.
 *  4. Return null only when truly ambiguous (ColumnMapper shown as last resort).
 */

import { parseDate, parseAmount } from "./importRules";
import type { ColumnMapping } from "./remapColumns";

// ── Aliases ────────────────────────────────────────────────────────────────

const DATE_ALIASES = [
  "date", "transaction date", "trans date", "trans. date", "value date",
  "posted date", "effective date", "tran date", "settlement date",
  "processing date", "settled date", "booking date",
];

const DESC_ALIASES = [
  "description", "desc", "narrative", "details", "memo", "payee",
  "reference", "narration", "particulars", "transaction description",
  "transaction details", "trans description", "statement description",
  "transaction narrative", "transaction", "merchant", "transaction type",
  "transaction detail",
];

const AMOUNT_ALIASES = [
  "amount", "value", "transaction amount", "amt", "net amount",
  "transaction value",
];

const DEBIT_ALIASES = [
  "debit", "debit amount", "withdrawals", "withdrawal", "dr",
  "money out", "debit(aud)",
];

const CREDIT_ALIASES = [
  "credit", "credit amount", "deposits", "deposit", "cr",
  "money in", "credit(aud)",
];

function matches(header: string, aliases: string[]): boolean {
  const h = header.trim().toLowerCase();
  return aliases.some((a) => h === a || h.startsWith(a + " ") || h.endsWith(" " + a) || h.includes(a));
}

// ── Content scoring ────────────────────────────────────────────────────────

function scoreColumn(values: string[]) {
  const sample = values.filter((v) => v?.trim()).slice(0, 20);
  if (!sample.length) return { dateScore: 0, amountScore: 0, avgLen: 0 };
  const dateHits   = sample.filter((v) => parseDate(v) !== null).length;
  const amountHits = sample.filter((v) => {
    const n = parseAmount(v);
    return n !== null && v.trim() !== "";
  }).length;
  const avgLen = sample.reduce((s, v) => s + v.trim().length, 0) / sample.length;
  return {
    dateScore:   dateHits   / sample.length,
    amountScore: amountHits / sample.length,
    avgLen,
  };
}

// ── Result types ────────────────────────────────────────────────────────────

/** Standard single-amount mapping */
export type MappedResult = {
  kind:         "mapped";
  mapping:      ColumnMapping;
  skipFirstRow: boolean;
};

/** Split debit / credit columns — caller merges before validation */
export type DebitCreditResult = {
  kind:         "debit_credit";
  dateCol:      number;
  descCol:      number;
  debitCol:     number;
  creditCol:    number;
  skipFirstRow: boolean;
};

export type DetectResult = MappedResult | DebitCreditResult | null;

// ── Main detector ───────────────────────────────────────────────────────────

export function detectColumns(rows: string[][]): DetectResult {
  if (!rows.length || !rows[0]?.length) return null;

  const colCount = rows[0].length;
  const firstRow = rows[0].map((h) => h?.trim() ?? "");

  // Decide whether the first row looks like a header row:
  // it looks like a header if ≥1 cell matches a known alias
  const allAliases = [
    ...DATE_ALIASES, ...DESC_ALIASES, ...AMOUNT_ALIASES,
    ...DEBIT_ALIASES, ...CREDIT_ALIASES,
  ];
  const hasHeaderRow = firstRow.some((h) =>
    allAliases.some((a) => h.toLowerCase().includes(a))
  );

  // ── 1. Header-name matching ──────────────────────────────────────────────
  if (hasHeaderRow) {
    let dateCol = -1, descCol = -1, amountCol = -1;
    let debitCol = -1, creditCol = -1;

    for (let i = 0; i < firstRow.length; i++) {
      const h = firstRow[i];
      if (dateCol   === -1 && matches(h, DATE_ALIASES))   dateCol   = i;
      if (descCol   === -1 && matches(h, DESC_ALIASES))   descCol   = i;
      if (amountCol === -1 && matches(h, AMOUNT_ALIASES)) amountCol = i;
      if (debitCol  === -1 && matches(h, DEBIT_ALIASES))  debitCol  = i;
      if (creditCol === -1 && matches(h, CREDIT_ALIASES)) creditCol = i;
    }

    // Standard: single amount column
    if (
      dateCol !== -1 && descCol !== -1 && amountCol !== -1 &&
      new Set([dateCol, descCol, amountCol]).size === 3
    ) {
      return { kind: "mapped", mapping: { date: dateCol, description: descCol, amount: amountCol }, skipFirstRow: true };
    }

    // Split debit/credit (e.g. CommBank, Westpac)
    if (dateCol !== -1 && descCol !== -1 && debitCol !== -1 && creditCol !== -1) {
      return { kind: "debit_credit", dateCol, descCol, debitCol, creditCol, skipFirstRow: true };
    }

    // Partial header match — fall through to content scoring on data rows
  }

  // ── 2. Content-based scoring ─────────────────────────────────────────────
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  if (!dataRows.length) return null;

  const scores = Array.from({ length: colCount }, (_, i) => ({
    index: i,
    ...scoreColumn(dataRows.map((r) => r[i] ?? "")),
  }));

  // Date column: highest date score, must be > 50%
  const dateCand = scores
    .filter((c) => c.dateScore > 0.5)
    .sort((a, b) => b.dateScore - a.dateScore)[0];

  // Amount column: highest amount score, must be > 50%, not the date column
  const amountCand = scores
    .filter((c) => c.index !== dateCand?.index && c.amountScore > 0.5)
    .sort((a, b) => b.amountScore - a.amountScore)[0];

  // Description column: longest non-numeric, non-date text
  const descCand = scores
    .filter(
      (c) =>
        c.index !== dateCand?.index &&
        c.index !== amountCand?.index &&
        c.dateScore < 0.3 &&
        c.amountScore < 0.3 &&
        c.avgLen > 3,
    )
    .sort((a, b) => b.avgLen - a.avgLen)[0];

  if (!dateCand || !amountCand || !descCand) return null;

  return {
    kind:         "mapped",
    mapping:      { date: dateCand.index, description: descCand.index, amount: amountCand.index },
    skipFirstRow: hasHeaderRow,
  };
}

// ── Debit/credit merger ─────────────────────────────────────────────────────

/**
 * Converts split debit/credit rows into unified RawRow objects.
 * Debit = money out (stored as negative), credit = money in (positive).
 */
export function mergeDebitCredit(
  rows: string[][],
  result: DebitCreditResult,
): { date: string; description: string; amount: string }[] {
  const dataRows = result.skipFirstRow ? rows.slice(1) : rows;
  return dataRows
    .filter((row) => row.some((v) => v?.trim()))
    .map((row) => {
      const debitRaw  = row[result.debitCol]?.trim()  ?? "";
      const creditRaw = row[result.creditCol]?.trim() ?? "";
      const debit     = parseAmount(debitRaw)  ?? 0;
      const credit    = parseAmount(creditRaw) ?? 0;
      // Credit = positive (money in), debit = negative (money out)
      const amount = credit !== 0 ? credit : debit !== 0 ? -Math.abs(debit) : 0;
      return {
        date:        row[result.dateCol]?.trim() ?? "",
        description: row[result.descCol]?.trim() ?? "",
        amount:      String(amount),
      };
    });
}
