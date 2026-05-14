// Parser for ANZ Internet Banking JSON transaction exports.
//
// ANZ allows customers to export their transaction history as a JSON file.
// This parser normalises those exports into the same ValidRow shape that the
// CSV pipeline produces, so the rest of the import flow (duplicate detection,
// deduction rules, DB insert) can run unchanged.
//
// Accepted formats:
//   - Array directly:             [{ date, amount, description, ... }, ...]
//   - Wrapped object:             { transactions: [...] }
//
// Required fields per transaction: date, amount, description
// Optional fields (safely ignored if absent): transactionType, balance, reference

import { parseDate, parseAmount } from "../../importRules";
import type { ValidRow, InvalidRow } from "../../validateCsv";

export type AnzParseResult = {
  valid:   ValidRow[];
  invalid: InvalidRow[];
  error?:  string;   // top-level structural error — shown instead of the row list
};

type RawTx = Record<string, unknown>;

// Reads a field by trying multiple key casings.
function pick(tx: RawTx, ...keys: string[]): unknown {
  for (const k of keys) if (k in tx) return tx[k];
  return undefined;
}

export function parseAnzJson(raw: unknown): AnzParseResult {
  // ── 1. Unwrap top-level structure ──────────────────────────────────────────
  let items: unknown[];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as RawTx).transactions)
  ) {
    items = (raw as { transactions: unknown[] }).transactions;
  } else {
    return {
      valid:   [],
      invalid: [],
      error:
        "File doesn't look like an ANZ transaction export. " +
        "Expected a JSON array or an object with a \"transactions\" array.",
    };
  }

  if (items.length === 0) {
    return { valid: [], invalid: [], error: "No transactions found in this file." };
  }

  // ── 2. Parse each transaction ──────────────────────────────────────────────
  const valid:   ValidRow[]   = [];
  const invalid: InvalidRow[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const rowNumber = idx + 1;
    const item = items[idx];

    if (typeof item !== "object" || item === null) {
      invalid.push({ rowNumber, reason: "Malformed transaction — expected an object." });
      continue;
    }

    const tx = item as RawTx;

    // ── Date ────────────────────────────────────────────────────────────────
    const rawDate = pick(tx, "date", "Date", "DATE", "transactionDate", "valueDate");
    const date = parseDate(rawDate);
    if (!date) {
      invalid.push({
        rowNumber,
        reason: `Invalid or missing date: "${rawDate ?? ""}".`,
      });
      continue;
    }

    // ── Description ─────────────────────────────────────────────────────────
    const rawDesc = pick(tx, "description", "Description", "details", "Details", "narrative", "Narrative");
    if (typeof rawDesc !== "string" || !rawDesc.trim()) {
      invalid.push({ rowNumber, reason: "Missing or empty description." });
      continue;
    }
    const description = rawDesc.trim();

    // ── Amount ──────────────────────────────────────────────────────────────
    const rawAmount = pick(tx, "amount", "Amount", "value", "Value");
    let amount: number | null = null;

    if (typeof rawAmount === "number") {
      amount = rawAmount;
    } else if (typeof rawAmount === "string") {
      amount = parseAmount(rawAmount);
    }

    if (amount === null || !Number.isFinite(amount)) {
      invalid.push({
        rowNumber,
        reason: `Invalid or missing amount: "${rawAmount ?? ""}".`,
      });
      continue;
    }

    // ── Sign normalisation ───────────────────────────────────────────────────
    // ANZ sometimes exports debits as positive numbers with transactionType:"Debit".
    // Our convention is negative = money out, positive = money in.
    const rawType = pick(tx, "transactionType", "TransactionType", "type", "Type");
    if (typeof rawType === "string") {
      const t = rawType.toLowerCase().trim();
      if (t === "debit"  && amount > 0) amount = -amount;
      if (t === "credit" && amount < 0) amount =  Math.abs(amount);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[ANZ JSON] row ${rowNumber}: ${date} | ${amount} | ${description}`);
    }

    valid.push({ date, description, amount });
  }

  return { valid, invalid };
}
