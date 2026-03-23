import type { InvalidRow } from "../../../lib/validateCsv";
import { normalizeMerchant } from "../../../lib/normalizeMerchant";

type RawRow = { [key: string]: string };

type Props = {
  rows: RawRow[];
  invalidRows: InvalidRow[];
};

const PREVIEW_LIMIT = 20;

export default function PreviewTable({ rows, invalidRows }: Props) {
  const invalidRowNumbers = new Set(invalidRows.map((r) => r.rowNumber));
  const invalidReasonMap = Object.fromEntries(
    invalidRows.map((r) => [r.rowNumber, r.reason])
  );

  const preview = rows.slice(0, PREVIEW_LIMIT);
  const hasMore = rows.length > PREVIEW_LIMIT;

  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-medium text-gray-700">
        Preview — first {Math.min(rows.length, PREVIEW_LIMIT)} of {rows.length} row{rows.length !== 1 ? "s" : ""}
      </p>
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Merchant</th>
              <th className="px-4 py-2 font-medium text-gray-400">Raw description</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preview.map((row, index) => {
              const rowNumber = index + 2; // +2: row 1 is header
              const isInvalid = invalidRowNumbers.has(rowNumber);
              const reason = invalidReasonMap[rowNumber];
              const merchant = row.description ? normalizeMerchant(row.description) : "";

              return (
                <tr
                  key={index}
                  className={isInvalid ? "bg-red-50" : "bg-white"}
                  title={isInvalid ? reason : undefined}
                >
                  <td className={`px-4 py-2 ${isInvalid ? "text-red-600" : "text-gray-900"}`}>
                    {row.date || <span className="italic text-red-400">missing</span>}
                  </td>
                  <td className={`px-4 py-2 font-medium ${isInvalid ? "text-red-600" : "text-gray-900"}`}>
                    {isInvalid ? "—" : merchant}
                  </td>
                  <td className={`px-4 py-2 ${isInvalid ? "text-red-500" : "text-gray-400"}`}>
                    {row.description || <span className="italic text-red-400">missing</span>}
                  </td>
                  <td className={`px-4 py-2 text-right ${isInvalid ? "text-red-600" : "text-gray-900"}`}>
                    {row.amount || <span className="italic text-red-400">missing</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <p className="mt-2 text-xs text-gray-400">
          Showing first {PREVIEW_LIMIT} rows only.
        </p>
      )}
    </div>
  );
}
