import type { ValidRow } from "../../../lib/validateCsv";

type Props = {
  rows: ValidRow[];
};

const PREVIEW_LIMIT = 20;

export default function PreviewTable({ rows }: Props) {
  const preview = rows.slice(0, PREVIEW_LIMIT);
  const hasMore = rows.length > PREVIEW_LIMIT;

  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-medium text-gray-700">
        Preview: {Math.min(rows.length, PREVIEW_LIMIT)} of {rows.length} valid transaction{rows.length !== 1 ? "s" : ""}
      </p>
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preview.map((row, index) => (
              <tr key={index} className="bg-white">
                <td className="px-4 py-2 text-gray-900">{row.date}</td>
                <td className="px-4 py-2 text-gray-500">{row.description}</td>
                <td className="px-4 py-2 text-right text-gray-900">
                  {row.amount < 0 ? "-" : "+"}${Math.abs(row.amount).toFixed(2)}
                </td>
              </tr>
            ))}
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
