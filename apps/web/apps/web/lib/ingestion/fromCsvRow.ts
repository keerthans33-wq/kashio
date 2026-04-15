// Maps a single raw CSV row (unknown shape from the client) into an IngestionRow.
//
// Error contract: FAIL FAST — returns a typed error for any invalid row.
// The CSV route surfaces these errors to the user so they can fix their file.
// This differs from the Basiq adapter, which silently drops unmappable rows
// (the user can't edit Basiq data, so errors there are not actionable).

import { parseDate } from "../importRules";
import { normalizeMerchant } from "../normalizeMerchant";
import type { IngestionRow } from "./types";

export type CsvRowError = { field: string; message: string };

export function fromCsvRow(
  raw: unknown,
): { row: IngestionRow; error: null } | { row: null; error: CsvRowError } {
  if (typeof raw !== "object" || raw === null) {
    return { row: null, error: { field: "row", message: "Invalid transaction format." } };
  }

  const { date, description, amount } = raw as Record<string, unknown>;

  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return {
      row: null,
      error: { field: "date", message: `Invalid date: "${date}". Expected YYYY-MM-DD or DD/MM/YYYY.` },
    };
  }

  if (typeof description !== "string" || !description.trim()) {
    return { row: null, error: { field: "description", message: "Missing or empty description." } };
  }

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return { row: null, error: { field: "amount", message: `Invalid amount: "${amount}".` } };
  }

  const trimmedDescription = description.trim();
  return {
    row: {
      date: parsedDate,
      description: trimmedDescription,
      normalizedMerchant: normalizeMerchant(trimmedDescription),
      amount,
    },
    error: null,
  };
}
