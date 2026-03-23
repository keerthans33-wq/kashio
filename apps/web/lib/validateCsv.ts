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

export function validateCsv(rows: RawRow[]): ValidationResult {
  // Check required columns exist using first row
  if (rows.length === 0) {
    return { valid: [], invalid: [], columnError: "The file has no rows." };
  }

  const columns = Object.keys(rows[0]);
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));

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
    const rowNumber = index + 2; // +2 because row 1 is the header
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

    if (!amount?.trim()) {
      invalid.push({ rowNumber, reason: "Missing amount." });
      return;
    }

    if (isNaN(Number(amount.trim()))) {
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

    valid.push({ date: date.trim(), description: description.trim(), amount: amount.trim() });
  });

  return { valid, invalid, columnError: null };
}
