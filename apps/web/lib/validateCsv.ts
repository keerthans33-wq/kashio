const REQUIRED_COLUMNS = ["date", "description", "amount"] as const;

const DATE_FORMATS = [
  /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
  /^\d{4}-\d{2}-\d{2}$/,   // YYYY-MM-DD
];

export type RawRow = { [key: string]: string };

export type ValidRow = {
  date: string;
  description: string;
  amount: string;
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

function isRealDate(value: string): boolean {
  // Parse DD/MM/YYYY
  const dmy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }

  // Parse YYYY-MM-DD
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd.map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }

  return false;
}

function parseAmount(value: string): number | null {
  // Strip currency symbols and commas before parsing
  const cleaned = value.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function isEffectivelyEmpty(row: RawRow): boolean {
  return Object.values(row).every((v) => !v?.trim());
}

// headers: column names from the parser (meta.fields), not derived from row data
export function validateCsv(rows: RawRow[], headers: string[]): ValidationResult {
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
    const rowNumber = index + 2; // +2: row 1 is header

    if (isEffectivelyEmpty(row)) return; // silently skip blank rows

    const { date, description, amount } = row;

    if (!date?.trim()) {
      invalid.push({ rowNumber, reason: "Missing date." });
      return;
    }

    if (!DATE_FORMATS.some((fmt) => fmt.test(date.trim()))) {
      invalid.push({
        rowNumber,
        reason: `Invalid date "${date}". Use DD/MM/YYYY or YYYY-MM-DD.`,
      });
      return;
    }

    if (!isRealDate(date.trim())) {
      invalid.push({
        rowNumber,
        reason: `Impossible date "${date}". Check the day and month values.`,
      });
      return;
    }

    if (!amount?.trim()) {
      invalid.push({ rowNumber, reason: "Missing amount." });
      return;
    }

    if (parseAmount(amount) === null) {
      invalid.push({
        rowNumber,
        reason: `Invalid amount "${amount}". Must be a number like -42.50 or 120.00.`,
      });
      return;
    }

    if (!description?.trim()) {
      invalid.push({ rowNumber, reason: "Missing description." });
      return;
    }

    valid.push({
      date: date.trim(),
      description: description.trim(),
      amount: amount.replace(/[$,]/g, "").trim(),
    });
  });

  return { valid, invalid, columnError: null };
}
