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
      <div className="mt-8 max-w-md rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs dark:bg-green-900/40 dark:text-green-400">
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {noneAdded ? "Already up to date" : "Import complete"}
            </p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {noneAdded
                ? `${importResult.duplicates} transaction${importResult.duplicates !== 1 ? "s" : ""} already saved — nothing new to add.`
                : <>
                    {importResult.inserted} transaction{importResult.inserted !== 1 ? "s" : ""} added
                    {importResult.duplicates > 0 && <> · {importResult.duplicates} skipped</>}
                    {importResult.invalid > 0 && <> · {importResult.invalid} rejected</>}
                  </>
              }
            </p>
          </div>
        </div>

        {/* Deduction summary — only shown when candidates were found */}
        {importResult.flagged > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Potential deductions found
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {importResult.totalValue > 0 ? fmt(importResult.totalValue) : `${importResult.flagged} items`}
            </p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {importResult.flagged} candidate{importResult.flagged !== 1 ? "s" : ""} flagged — review them to confirm which ones apply to you.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 flex flex-wrap items-center gap-3">
          {importResult.flagged > 0 ? (
            <a
              href="/review"
              className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Review deductions →
            </a>
          ) : importResult.inserted > 0 ? (
            <a
              href="/transactions"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900"
            >
              View transactions →
            </a>
          ) : (
            <a
              href="/review"
              className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Go to Review →
            </a>
          )}
          <button
            type="button"
            onClick={reset}
            className="text-sm text-gray-400 hover:underline dark:text-gray-500"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Choose file
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
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

        {fileError && (
          <p className="mt-3 text-sm text-red-600">{fileError}</p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          className="mt-4 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Preview CSV
        </button>

        {parseError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Could not read file</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{parseError}</p>
          </div>
        )}

        {noUsableRows && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">No valid transactions found</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Every row in this file was skipped. Check the errors below and fix your CSV.
            </p>
          </div>
        )}

        {result && !noUsableRows && (
          <div className="mt-4 space-y-3">

            {/* Pre-import summary */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {result.valid.length} transaction{result.valid.length !== 1 ? "s" : ""} ready to import
              {result.invalid.length > 0 && <span className="ml-2 text-yellow-600 dark:text-yellow-400">· {result.invalid.length} row{result.invalid.length !== 1 ? "s" : ""} skipped</span>}
            </p>

            {/* Invalid row details */}
            {result.invalid.length > 0 && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  {result.invalid.length} row{result.invalid.length !== 1 ? "s" : ""} rejected
                </p>
                <ul className="mt-2 space-y-1">
                  {result.invalid.map((row) => (
                    <li key={row.rowNumber} className="text-sm text-yellow-700 dark:text-yellow-400">
                      Row {row.rowNumber}: {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              {importing ? "Importing…" : `Import ${result.valid.length} transaction${result.valid.length !== 1 ? "s" : ""}`}
            </button>

            {importError && (
              <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
            )}
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
