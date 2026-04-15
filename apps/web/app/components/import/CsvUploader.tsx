"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { validateCsv, type ValidRow, type InvalidRow, type RawRow } from "../../../lib/validateCsv";
import { remapColumns, type ColumnMapping } from "../../../lib/remapColumns";
import { detectColumns, mergeDebitCredit } from "../../../lib/detectColumns";
import PreviewTable from "./PreviewTable";
import ColumnMapper from "./ColumnMapper";
import BankCsvInstructions from "./BankCsvInstructions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportResult = {
  inserted:   number;
  duplicates: number;
  invalid:    number;
  flagged:    number;
  totalValue: number;
};

type Result = {
  raw:     RawRow[];
  valid:   ValidRow[];
  invalid: InvalidRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveTransactions(
  transactions: ValidRow[],
  fileName: string,
): Promise<{ inserted: number; duplicates: number; flagged: number; totalValue: number }> {
  const res = await fetch("/api/transactions/import", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ transactions, fileName }),
  });
  if (!res.ok) {
    let message = "Failed to save transactions.";
    try { const d = await res.json(); message = d.error ?? message; } catch {}
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file,            setFile]            = useState<File | null>(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const [fileError,       setFileError]       = useState<string | null>(null);
  const [parseError,      setParseError]      = useState<string | null>(null);
  const [rawRows,         setRawRows]         = useState<string[][] | null>(null);
  const [result,          setResult]          = useState<Result | null>(null);
  const [importing,       setImporting]       = useState(false);
  const [importResult,    setImportResult]    = useState<ImportResult | null>(null);
  const [importError,     setImportError]     = useState<string | null>(null);
  const [showAllErrors,   setShowAllErrors]   = useState(false);
  const [showInstructions,setShowInstructions]= useState(false);

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  function reset() {
    setFileError(null);
    setParseError(null);
    setRawRows(null);
    setResult(null);
    setImportResult(null);
    setImportError(null);
    setShowAllErrors(false);
  }

  function runValidation(rows: RawRow[], headers: string[], rowOffset = 2) {
    const { valid, invalid, columnError } = validateCsv(rows, headers, rowOffset);
    if (columnError) { setParseError(columnError); setResult(null); return; }
    setResult({ raw: rows, valid, invalid });
  }

  // ── CSV parsing ────────────────────────────────────────────────────────────
  //
  // TODO (1/3 — CSV Parser): processFile() is the single entry point for all
  // CSV parsing. The current pipeline is:
  //   1. PapaParse reads the raw file into string[][]
  //   2. detectColumns() auto-maps columns (date / amount / description)
  //   3. remapColumns() normalises rows to { date, description, amount }
  //   4. validateCsv() parses and validates each row
  //
  // To support a new bank format: add an alias or heuristic to
  // lib/detectColumns.ts — no changes needed here.
  // To swap the parser entirely: replace the Papa.parse block below with
  // your own reader and call runValidation() with the normalised rows.
  //
  function processFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please upload a .csv file.");
      return;
    }
    Papa.parse<string[]>(f, {
      header:         false,
      skipEmptyLines: true,
      error(err) { setParseError(`Could not read file: ${err.message}`); },
      complete(results) {
        if (results.errors.length > 0) {
          const msgs = results.errors.slice(0, 5).map((e) => `row ${e.row ?? "?"}: ${e.message}`).join("; ");
          const suffix = results.errors.length > 5 ? ` (and ${results.errors.length - 5} more)` : "";
          setParseError(`Could not read file: ${msgs}${suffix}`);
          return;
        }
        const allRows = results.data;
        if (allRows.length === 0) { setParseError("The file has no rows."); return; }

        const detected = detectColumns(allRows);

        if (detected?.kind === "mapped") {
          // Auto-mapped — no user intervention needed
          const dataRows = detected.skipFirstRow ? allRows.slice(1) : allRows;
          const mapped = remapColumns(dataRows, detected.mapping);
          runValidation(mapped, ["date", "description", "amount"], detected.skipFirstRow ? 2 : 1);

        } else if (detected?.kind === "debit_credit") {
          // Split debit/credit columns — merge then validate
          const merged = mergeDebitCredit(allRows, detected);
          runValidation(merged, ["date", "description", "amount"], detected.skipFirstRow ? 2 : 1);

        } else {
          // Truly ambiguous — fall back to manual ColumnMapper
          setRawRows(allRows);
        }
      },
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    reset();
    if (!f) return;
    setFile(f);
    processFile(f);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    reset();
    setFile(f);
    processFile(f);
  }

  function handleMappingConfirmed(mapping: ColumnMapping, skipFirstRow: boolean) {
    if (!rawRows) return;
    const dataRows = skipFirstRow ? rawRows.slice(1) : rawRows;
    const remapped = remapColumns(dataRows, mapping);
    runValidation(remapped, ["date", "description", "amount"], skipFirstRow ? 2 : 1);
    setRawRows(null);
  }

  async function handleImport() {
    if (!result || result.valid.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const { inserted, duplicates, flagged, totalValue } =
        await saveTransactions(result.valid, file?.name ?? "unknown.csv");

      // TODO (2/3 — Review Screen): To navigate directly to /review after a
      // successful import, add useRouter() and call router.push("/review") here.
      // When the review page supports filtering by batch, also:
      //   1. Add batchId to the ImportResult type above
      //   2. Return batchId from saveTransactions() (the server already sends it)
      //   3. Navigate to router.push(`/review?batchId=${batchId}`)
      // The completion card below is kept for now so users can confirm the
      // import count and optionally import another file first.

      setImportResult({ inserted, duplicates, invalid: result.invalid.length, flagged, totalValue });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  const noUsableRows = result && result.valid.length === 0;

  // ── Completion card ───────────────────────────────────────────────────────
  if (importResult !== null) {
    const noneAdded = importResult.inserted === 0 && importResult.duplicates > 0;
    return (
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start gap-3 px-5 py-5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
            ✓
          </span>
          <div>
            <p className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {noneAdded ? "Already up to date" : "Import complete"}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
              {noneAdded
                ? `${importResult.duplicates} transaction${importResult.duplicates !== 1 ? "s" : ""} already saved.`
                : <>
                    {importResult.inserted} transaction{importResult.inserted !== 1 ? "s" : ""} added
                    {importResult.duplicates > 0 && <> · {importResult.duplicates} skipped</>}
                    {importResult.invalid > 0    && <> · {importResult.invalid} rejected</>}
                  </>
              }
            </p>
          </div>
        </div>

        {importResult.flagged > 0 && (
          <div className="px-5 py-5" style={{ borderTop: "1px solid var(--bg-border)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Potential deductions found
            </p>
            <p className="mt-1.5 text-[34px] font-bold tabular-nums leading-none tracking-tight" style={{ color: "var(--text-primary)" }}>
              {importResult.totalValue > 0 ? fmt(importResult.totalValue) : `${importResult.flagged} items`}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {importResult.flagged} candidate{importResult.flagged !== 1 ? "s" : ""} flagged — review to confirm which apply.
            </p>
          </div>
        )}

        <div className="px-5 py-4 flex flex-wrap items-center gap-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
          {/* TODO (2/3 — Review Screen): Once the review page filters by batch,
              change href to `/review?batchId=${importResult.batchId}` so the
              user lands directly on the transactions they just imported. */}
          <Button asChild size="sm">
            <Link href="/review">Review deductions →</Link>
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={reset}>
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  // ── Main upload UI ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed cursor-pointer transition-all duration-150 px-6 py-14 text-center select-none"
        style={{
          borderColor:     isDragging ? "var(--violet-from)" : "rgba(124,58,237,0.25)",
          backgroundColor: isDragging ? "rgba(124,58,237,0.06)" : "rgba(124,58,237,0.03)",
        }}
      >
        {/* Icon */}
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150"
          style={{ backgroundColor: isDragging ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.08)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "var(--violet-from)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>

        {/* Label */}
        {file && !fileError ? (
          <>
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {file.name}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {result && !noUsableRows
                ? `${result.valid.length} transaction${result.valid.length !== 1 ? "s" : ""} ready`
                : parseError ? "Could not read file — try another"
                : rawRows ? "Columns need mapping"
                : "Reading your transactions…"}
            </p>
          </>
        ) : (
          <div>
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Upload CSV file
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Drag and drop, or click to browse
            </p>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      </div>

      {/* File / parse errors */}
      {(fileError || parseError) && (
        <div className="mt-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <p className="text-sm font-medium text-red-400">{fileError ?? "Could not read file"}</p>
          {parseError && <p className="mt-0.5 text-xs text-red-400 opacity-80">{parseError}</p>}
        </div>
      )}

      {/* No valid rows */}
      {noUsableRows && (
        <div className="mt-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <p className="text-sm font-medium text-red-400">No valid transactions found</p>
          <p className="mt-0.5 text-xs text-red-400 opacity-80">Every row was skipped. Check the errors below and fix your CSV.</p>
        </div>
      )}

      {/* Skipped rows warning */}
      {result && result.invalid.length > 0 && !noUsableRows && (
        <div className="mt-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "#F59E0B" }}>
            {result.invalid.length} row{result.invalid.length !== 1 ? "s" : ""} skipped
          </p>
          <ul className="mt-1.5 space-y-1">
            {(showAllErrors ? result.invalid : result.invalid.slice(0, 3)).map((row) => (
              <li key={row.rowNumber} className="text-xs opacity-80" style={{ color: "#F59E0B" }}>
                Row {row.rowNumber}: {row.reason}
              </li>
            ))}
          </ul>
          {result.invalid.length > 3 && (
            <button type="button" onClick={() => setShowAllErrors((v) => !v)} className="mt-1.5 text-xs" style={{ color: "#F59E0B" }}>
              {showAllErrors ? "Show less" : `+${result.invalid.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Import button */}
      {result && !noUsableRows && (
        <div className="mt-4 space-y-2">
          <Button type="button" onClick={handleImport} disabled={importing} className="w-full">
            {importing
              ? "Reading your transactions…"
              : `Import ${result.valid.length} transaction${result.valid.length !== 1 ? "s" : ""}`}
          </Button>
          {importError && <p className="text-xs text-center text-red-400">{importError}</p>}
        </div>
      )}

      {/* Column mapper (shown when headers don't auto-match) */}
      {rawRows && <ColumnMapper rows={rawRows} onConfirm={handleMappingConfirmed} />}

      {/* Preview table */}
      {result && !noUsableRows && <PreviewTable rows={result.valid} />}

      {/* Bank instructions accordion */}
      {!file && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowInstructions((v) => !v)}
            className="mx-auto flex items-center gap-1.5 text-sm transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            <span>
              How to export from your bank?{" "}
              <span className="underline underline-offset-2" style={{ color: "var(--text-secondary)" }}>
                View steps
              </span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
              style={{ transform: showInstructions ? "rotate(180deg)" : "none" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showInstructions && (
            <div className="mt-4">
              <BankCsvInstructions />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
