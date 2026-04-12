"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { validateCsv, type ValidRow, type InvalidRow, type RawRow } from "../../../lib/validateCsv";
import { remapColumns, type ColumnMapping } from "../../../lib/remapColumns";
import PreviewTable from "./PreviewTable";
import ColumnMapper from "./ColumnMapper";

type ImportResult = {
  inserted: number;   // new rows written to the database
  duplicates: number; // rows skipped because they already existed
  invalid: number;    // rows rejected before upload due to validation errors
  flagged: number;    // deduction candidates detected
  totalValue: number; // sum of flagged candidate amounts
};

async function saveTransactions(
  transactions: ValidRow[],
  fileName: string,
): Promise<{ inserted: number; duplicates: number; flagged: number; totalValue: number }> {
  const res = await fetch("/api/transactions/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions, fileName }),
  });
  if (!res.ok) {
    let message = "Failed to save transactions.";
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      // non-JSON error response — use default message
    }
    throw new Error(message);
  }
  const data = await res.json();
  return {
    inserted:   data.inserted   as number,
    duplicates: data.duplicates as number,
    flagged:    (data.flagged    as number) ?? 0,
    totalValue: (data.totalValue as number) ?? 0,
  };
}

const REQUIRED_COLUMNS = ["date", "description", "amount"];

type Result = {
  raw: RawRow[];
  valid: ValidRow[];
  invalid: InvalidRow[];
};

// Returns true if the first row of the file looks like a header row
// with the expected column names.
function hasMatchingHeaders(firstRow: string[]): boolean {
  const lower = firstRow.map((h) => h.trim().toLowerCase());
  return REQUIRED_COLUMNS.every((col) => lower.includes(col));
}

// Converts raw string arrays into RawRow objects using first row as headers.
function toMappedRows(rows: string[][], headers: string[]): RawRow[] {
  return rows.map((row) => {
    const obj: RawRow = {};
    headers.forEach((h, i) => {
      obj[h] = row[i]?.trim() ?? "";
    });
    return obj;
  });
}

export default function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);

  function reset() {
    setFileError(null);
    setParseError(null);
    setRawRows(null);
    setResult(null);
    setImportResult(null);
    setImportError(null);
  }

  async function handleImport() {
    if (!result || result.valid.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const { inserted, duplicates, flagged, totalValue } = await saveTransactions(result.valid, file?.name ?? "unknown.csv");
      setImportResult({ inserted, duplicates, invalid: result.invalid.length, flagged, totalValue });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    reset();
  }

  function runValidation(rows: RawRow[], headers: string[], rowOffset = 2) {
    const { valid, invalid, columnError } = validateCsv(rows, headers, rowOffset);

    if (columnError) {
      setParseError(columnError);
      setResult(null);
      return;
    }

    setResult({ raw: rows, valid, invalid });
  }

  function handleUpload() {
    if (!file) {
      setFileError("Please select a CSV file before uploading.");
      return;
    }

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      error(err) {
        setParseError(`Could not read file: ${err.message}`);
      },
      complete(results) {
        if (results.errors.length > 0) {
          const shown = results.errors.slice(0, 5);
          const msgs = shown
            .map((e) => `row ${e.row ?? "?"}: ${e.message}`)
            .join("; ");
          const suffix = results.errors.length > 5 ? ` (and ${results.errors.length - 5} more)` : "";
          setParseError(`Could not read file: ${msgs}${suffix}`);
          return;
        }

        const allRows = results.data;
        if (allRows.length === 0) {
          setParseError("The file has no rows.");
          return;
        }

        const firstRow = allRows[0];

        if (hasMatchingHeaders(firstRow)) {
          // First row is a valid header row — use it directly
          const headers = firstRow.map((h) => h.trim().toLowerCase());
          const dataRows = toMappedRows(allRows.slice(1), headers);
          runValidation(dataRows, headers);
        } else {
          // No matching headers — show column mapper
          setRawRows(allRows);
        }
      },
    });
  }

  function handleMappingConfirmed(mapping: ColumnMapping, skipFirstRow: boolean) {
    if (!rawRows) return;
    const dataRows = skipFirstRow ? rawRows.slice(1) : rawRows;
    const remapped = remapColumns(dataRows, mapping);
    // rowOffset: 2 when first row was a header, 1 when all rows are data
    runValidation(remapped, REQUIRED_COLUMNS, skipFirstRow ? 2 : 1);
    setRawRows(null);
  }

  const noUsableRows = result && result.valid.length === 0;
  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  // ── Completion card — replaces the entire uploader once import is done ──────
  if (importResult !== null) {
    const noneAdded = importResult.inserted === 0 && importResult.duplicates > 0;
    return (
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {noneAdded ? "Already up to date" : "Import complete"}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
              {noneAdded
                ? `${importResult.duplicates} transaction${importResult.duplicates !== 1 ? "s" : ""} already saved. Nothing new to add.`
                : <>
                    {importResult.inserted} transaction{importResult.inserted !== 1 ? "s" : ""} added
                    {importResult.duplicates > 0 && <> · {importResult.duplicates} skipped</>}
                    {importResult.invalid > 0 && <> · {importResult.invalid} rejected</>}
                  </>
              }
            </p>
          </div>
        </div>

        {/* Deduction summary */}
        {importResult.flagged > 0 && (
          <div className="px-5 py-4" style={{ borderTop: "1px solid var(--bg-elevated)" }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Potential deductions found
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {importResult.totalValue > 0 ? fmt(importResult.totalValue) : `${importResult.flagged} items`}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
              {importResult.flagged} candidate{importResult.flagged !== 1 ? "s" : ""} flagged. Review them to confirm which apply to you.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-3" style={{ borderTop: "1px solid var(--bg-elevated)" }}>
          <a
            href="/review"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
            style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
          >
            Review deductions →
          </a>
          <button
            type="button"
            onClick={reset}
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tertiary: CSV upload */}
      <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Upload a CSV</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg px-4 py-2 text-xs font-medium transition-colors duration-150"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            Choose file
          </button>
          <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {file ? file.name : "No file chosen"}
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {fileError && <p className="mt-2 text-xs text-red-400">{fileError}</p>}

        {file && (
          <button
            type="button"
            onClick={handleUpload}
            className="mt-3 rounded-lg px-4 py-2 text-xs font-medium transition-colors duration-150"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            Preview CSV
          </button>
        )}

        {parseError && (
          <div className="mt-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-xs font-medium text-red-400">Could not read file</p>
            <p className="mt-0.5 text-xs text-red-400" style={{ opacity: 0.8 }}>{parseError}</p>
          </div>
        )}

        {noUsableRows && (
          <div className="mt-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-xs font-medium text-red-400">No valid transactions found</p>
            <p className="mt-0.5 text-xs text-red-400" style={{ opacity: 0.8 }}>
              Every row was skipped. Check the errors below and fix your CSV.
            </p>
          </div>
        )}

        {result && !noUsableRows && (
          <div className="mt-3 space-y-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {result.valid.length} transaction{result.valid.length !== 1 ? "s" : ""} ready to import
              {result.invalid.length > 0 && (
                <span className="ml-2" style={{ color: "#F59E0B" }}>
                  · {result.invalid.length} row{result.invalid.length !== 1 ? "s" : ""} skipped
                </span>
              )}
            </p>

            {result.invalid.length > 0 && (
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="text-xs font-medium" style={{ color: "#F59E0B" }}>
                  {result.invalid.length} row{result.invalid.length !== 1 ? "s" : ""} rejected
                </p>
                <ul className="mt-1.5 space-y-1">
                  {(showAllErrors ? result.invalid : result.invalid.slice(0, 3)).map((row) => (
                    <li key={row.rowNumber} className="text-xs" style={{ color: "#F59E0B", opacity: 0.8 }}>
                      Row {row.rowNumber}: {row.reason}
                    </li>
                  ))}
                </ul>
                {result.invalid.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllErrors((v) => !v)}
                    className="mt-1.5 text-xs"
                    style={{ color: "#F59E0B" }}
                  >
                    {showAllErrors ? "Show less" : `Show ${result.invalid.length - 3} more`}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
            >
              {importing ? "Importing…" : `Import ${result.valid.length} transaction${result.valid.length !== 1 ? "s" : ""}`}
            </button>

            {importError && <p className="text-xs text-red-400">{importError}</p>}
          </div>
        )}
      </div>

      {rawRows && (
        <ColumnMapper rows={rawRows} onConfirm={handleMappingConfirmed} />
      )}

      {result && !noUsableRows && (
        <PreviewTable rows={result.valid} />
      )}
    </div>
  );
}
