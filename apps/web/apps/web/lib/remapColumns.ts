import type { RawRow } from "./validateCsv";

export type ColumnMapping = {
  date: number;
  description: number;
  amount: number;
};

// Takes raw string rows (no headers) and a column mapping,
// returns RawRow objects ready for validateCsv.
export function remapColumns(rows: string[][], mapping: ColumnMapping): RawRow[] {
  return rows.map((row) => ({
    date: row[mapping.date]?.trim() ?? "",
    description: row[mapping.description]?.trim() ?? "",
    amount: row[mapping.amount]?.trim() ?? "",
  }));
}
