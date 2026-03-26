"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ACTIVE_CATEGORIES } from "../../../lib/rules/categories";

export function ReviewFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  const status     = params.get("status") ?? "";
  const category   = params.get("category") ?? "";
  const confidence = params.get("confidence") ?? "";
  const sort       = params.get("sort") ?? "";

  const hasFilters = status || category || confidence;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-600"
      >
        <option value="">All statuses</option>
        <option value="NEEDS_REVIEW">Needs Review</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="REJECTED">Rejected</option>
      </select>

      <select
        value={category}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-600"
      >
        <option value="">All categories</option>
        {ACTIVE_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={confidence}
        onChange={(e) => update("confidence", e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-600"
      >
        <option value="">All confidence levels</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <select
        value={sort}
        onChange={(e) => update("sort", e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-600"
      >
        <option value="">Sort: Date</option>
        <option value="amount">Sort: Amount</option>
        <option value="confidence">Sort: Confidence</option>
      </select>

      {hasFilters && (
        <button
          onClick={() => router.push(`${pathname}${sort ? `?sort=${sort}` : ""}`)}
          className="text-sm text-gray-400 hover:text-gray-600 underline dark:text-gray-500 dark:hover:text-gray-300"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
