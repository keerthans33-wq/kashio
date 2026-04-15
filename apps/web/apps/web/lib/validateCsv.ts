import { parseAmount, parseDate } from "./importRules";

const REQUIRED_COLUMNS = ["date", "description", "amount"] as const;

export type RawRow = { [key: string]: string };

export type ValidRow = {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // parsed float, negative = debit
};

export type InvalidRow = {
  rowNumber: number;
  reason: string;
};

export type ValidationResult = {
  valid: ValidRow[];
  invalid: InvalidRow[];
  columnError: string | null;
};

function isEffectivelyEmpty(row: RawRow): boolean {
  return Object.values(row).every((v) => !v?.trim());
}

// headers: column names from the parser (meta.fields), not derived from row data
// rowOffset: file row number of the first data row (2 when a header row was consumed, 1 for headerless)
export function validateCsv(rows: RawRow[], headers: string[], rowOffset = 2): ValidationResult {
  if (rows.length === 0) {
    return { valid: [], invalid: [], columnError: "The file has no rows." };
  }

  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingColumns.length > 0) {
    return {
      valid: [],
      invalid: [],
      columnError: `Missing required column${missingColumns.length > 1 ? "s" : ""}: ${missingColumns.join(", ")}. Expected: date, description, amount.`,
    };
  }

  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + rowOffset;

    if (isEffectivelyEmpty(row)) return;

    const { date: rawDate, description, amount: rawAmount } = row;

    if (!rawDate?.trim()) {
      invalid.push({ rowNumber, reason: "Missing date." });
      return;
    }

    const date = parseDate(rawDate);
    if (!date) {
      invalid.push({
        rowNumber,
        reason: `Invalid date "${rawDate}". Use DD/MM/YYYY or YYYY-MM-DD.`,
      });
      return;
    }

    if (!rawAmount?.trim()) {
      invalid.push({ rowNumber, reason: "Missing amount." });
      return;
    }

    const amount = parseAmount(rawAmount);
    if (amount === null) {
      invalid.push({
        rowNumber,
        reason: `Invalid amount "${rawAmount}". Must be a number like -42.50 or 120.00.`,
      });
      return;
    }

    if (!description?.trim()) {
      invalid.push({ rowNumber, reason: "Missing description." });
      return;
    }

    valid.push({
      date,
      description: description.trim(),
      amount,
    });
  });

  return { valid, invalid, columnError: null };
}
