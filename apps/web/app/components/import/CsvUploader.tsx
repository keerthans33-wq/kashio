"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { validateCsv, type ValidRow, type InvalidRow } from "../../../lib/validateCsv";
import PreviewTable from "./PreviewTable";

type RawRow = { [key: string]: string };

type Result = {
  raw: RawRow[];
  valid: ValidRow[];
  invalid: InvalidRow[];
};

export default function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [columnError, setColumnError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setFileError(null);
    setParseError(null);
    setResult(null);
    setColumnError(null);
  }

  function handleUpload() {
    if (!file) {
      setFileError("Please select a CSV file before uploading.");
      return;
    }

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      error(err) {
        setParseError(`Could not read file: ${err.message}`);
        setResult(null);
        setColumnError(null);
      },
      complete(results) {
        if (results.errors.length > 0) {
          const first = results.errors[0];
          setParseError(`Could not read file: ${first.message} (row ${first.row ?? "unknown"})`);
          setResult(null);
          setColumnError(null);
          return;
        }

        const headers = results.meta.fields ?? [];
        const { valid, invalid, columnError } = validateCsv(results.data, headers);

        if (columnError) {
          setColumnError(columnError);
          setParseError(null);
          setResult(null);
          return;
        }

        setParseError(null);
        setColumnError(null);
        setResult({ raw: results.data, valid, invalid });
      },
    });
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

        {columnError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">Could not read file</p>
            <p className="mt-1 text-sm text-red-600">{columnError}</p>
          </div>
        )}

        {noUsableRows && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">No usable rows</p>
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
          </div>
        )}
      </div>

      {result && !noUsableRows && (
        <PreviewTable rows={result.raw} invalidRows={result.invalid} />
      )}
    </div>
  );
}
