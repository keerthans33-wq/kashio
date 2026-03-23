"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";

type ParsedRow = {
  date: string;
  description: string;
  amount: string;
  [key: string]: string;
};

export default function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setRows(null);
  }

  function handleUpload() {
    if (!file) {
      setError("Please select a CSV file before uploading.");
      return;
    }

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete(results) {
        console.log("Parsed rows:", results.data);
        setRows(results.data);
      },
    });
  }

  return (
    <div className="mt-8 max-w-md">
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

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        className="mt-4 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
      >
        Upload
      </button>

      {rows && (
        <p className="mt-4 text-sm text-gray-500">
          {rows.length} row{rows.length !== 1 ? "s" : ""} parsed. Check the console for details.
        </p>
      )}
    </div>
  );
}
