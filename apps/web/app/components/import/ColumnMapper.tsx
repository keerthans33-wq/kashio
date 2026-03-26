"use client";

import { useState } from "react";
import type { ColumnMapping } from "../../../lib/remapColumns";

type Props = {
  rows: string[][];
  onConfirm: (mapping: ColumnMapping, skipFirstRow: boolean) => void;
};

const PREVIEW_ROWS = 3;
const REQUIRED_FIELDS = [
  { key: "date" as const, label: "Date" },
  { key: "description" as const, label: "Description" },
  { key: "amount" as const, label: "Amount" },
];

export default function ColumnMapper({ rows, onConfirm }: Props) {
  const preview = rows.slice(0, PREVIEW_ROWS);
  const columnCount = rows[0]?.length ?? 0;
  const columnOptions = Array.from({ length: columnCount }, (_, i) => i);

  const [mapping, setMapping] = useState<ColumnMapping>({
    date: 0,
    description: 1,
    amount: 2,
  });
  const [skipFirstRow, setSkipFirstRow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const values = Object.values(mapping);
    const unique = new Set(values);
    if (unique.size !== values.length) {
      setError("Each field must map to a different column.");
      return;
    }
    setError(null);
    onConfirm(mapping, skipFirstRow);
  }

  return (
    <div className="mt-6 max-w-2xl">
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm font-medium text-yellow-800">We couldn't recognise your column names</p>
        <p className="mt-1 text-sm text-yellow-700">
          No problem — use the preview below to identify which column contains the date, description, and amount, then tell us which is which.
        </p>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-gray-700">First few rows of your file</p>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                {columnOptions.map((i) => (
                  <th key={i} className="px-4 py-2 font-medium">
                    Column {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-white">
                  {columnOptions.map((colIndex) => (
                    <td key={colIndex} className="px-4 py-2 text-gray-700">
                      {row[colIndex] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <p className="text-sm font-medium text-gray-700">Which column is which?</p>
        {REQUIRED_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-28 text-sm text-gray-600">{label}</label>
            <select
              value={mapping[key]}
              onChange={(e) =>
                setMapping((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            >
              {columnOptions.map((i) => (
                <option key={i} value={i}>
                  Column {i + 1}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-400 italic">
              e.g. {rows[0]?.[mapping[key]] ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <label className="mt-6 flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={skipFirstRow}
          onChange={(e) => setSkipFirstRow(e.target.checked)}
          className="rounded border-gray-300"
        />
        First row is a header row — skip it when importing
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        className="mt-6 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
      >
        Continue
      </button>
    </div>
  );
}
