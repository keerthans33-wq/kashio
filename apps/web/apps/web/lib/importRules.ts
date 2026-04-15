/**
 * Shared import rules used by both the client (validateCsv.ts) and the server (route.ts).
 *
 * Keeping these in one place means both layers always apply the same rules —
 * there is no risk of the client accepting something the server rejects, or vice versa.
 */

/**
 * Parses an amount string into a number.
 *
 * Accepts values like "-42.50", "$120.00", "1,234.56".
 * Returns null if the value cannot be parsed as a finite number.
 */
export function parseAmount(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses a date string and returns it normalized to YYYY-MM-DD.
 *
 * Accepts DD/MM/YYYY (common Australian bank format) and YYYY-MM-DD.
 * Also validates that the date is a real calendar date (e.g. rejects 31/02/2024).
 * Returns null if the format is unrecognised or the date is impossible.
 */
export function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  // DD/MM/YYYY — used by Australian banks like CommBank
  const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const day = dmy[1], month = dmy[2], year = dmy[3];
    const d = Number(day), m = Number(month), y = Number(year);
    const date = new Date(y, m - 1, d);
    const isReal = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    return isReal ? `${year}-${month}-${day}` : null;
  }

  // YYYY-MM-DD — ISO 8601
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = ymd[1], month = ymd[2], day = ymd[3];
    const y = Number(year), m = Number(month), d = Number(day);
    const date = new Date(y, m - 1, d);
    const isReal = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    return isReal ? `${year}-${month}-${day}` : null;
  }

  return null;
}
