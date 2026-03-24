"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { validateCsv, type ValidRow, type InvalidRow, type RawRow } from "../../../lib/validateCsv";
import { remapColumns, type ColumnMapping } from "../../../lib/remapColumns";
import PreviewTable from "./PreviewTable";
import ColumnMapper from "./ColumnMapper";

async function saveTransactions(transactions: ValidRow[]): Promise<number> {
  const res = await fetch("/api/transactions/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to save transactions.");
  }
  const data = await res.json();
  return data.imported as number;
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
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setFileError(null);
    setParseError(null);
    setRawRows(null);
    setResult(null);
    setImportedCount(null);
    setImportError(null);
  }

  async function handleImport() {
    if (!result || result.valid.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const count = await saveTransactions(result.valid);
      setImportedCount(count);
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

  function runValidation(rows: RawRow[], headers: string[]) {
    const { valid, invalid, columnError } = validateCsv(rows, headers);

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
          const first = results.errors[0];
          setParseError(`Could not read file: ${first.message} (row ${first.row ?? "unknown"})`);
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

  function handleMappingConfirmed(mapping: ColumnMapping) {
    if (!rawRows) return;
    const remapped = remapColumns(rawRows, mapping);
    runValidation(remapped, REQUIRED_COLUMNS);
    setRawRows(null);
  }

  const noUsableRows = result && result.valid.length === 0;

  return (
    <div className="mt-8">
      <div className="max-w-md">
        <label className="block text-sm font-medium text-gray-700">
          Bank CSV file
        </label>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Choose file
          </button>
          <span className="text-sm text-gray-500">
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
          className="mt-4 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Upload
        </button>

        {parseError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">Could not read file</p>
            <p className="mt-1 text-sm text-red-600">{parseError}</p>
          </div>
        )}

        {noUsableRows && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">No valid transactions found</p>
            <p className="mt-1 text-sm text-red-600">
              Every row in this file was skipped. Check the errors below and fix your CSV.
            </p>
          </div>
        )}

        {result && !noUsableRows && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{result.valid.length}</span> valid row{result.valid.length !== 1 ? "s" : ""} ready to import
              {result.invalid.length > 0 && (
                <span className="text-yellow-700">, {result.invalid.length} skipped</span>
              )}.
            </p>

            {result.invalid.length > 0 && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-medium text-yellow-800">
                  {result.invalid.length} row{result.invalid.length !== 1 ? "s" : ""} skipped
                </p>
                <ul className="mt-2 space-y-1">
                  {result.invalid.map((row) => (
                    <li key={row.rowNumber} className="text-sm text-yellow-700">
                      Row {row.rowNumber}: {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importedCount !== null ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  {importedCount} transaction{importedCount !== 1 ? "s" : ""} imported successfully.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${result.valid.length} transaction${result.valid.length !== 1 ? "s" : ""}`}
              </button>
            )}

            {importError && (
              <p className="text-sm text-red-600">{importError}</p>
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
