"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ACTIVE_CATEGORIES } from "../../../lib/rules/categories";

export function ReviewFilters() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [open, setOpen] = useState(false);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  const category   = params.get("category") ?? "";
  const confidence = params.get("confidence") ?? "";
  const sort       = params.get("sort") ?? "";
  const hasFilters = category || confidence;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          {open ? "Hide filters" : "Filter"}
          {hasFilters && !open && (
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          )}
        </button>
        {hasFilters && (
          <button
            onClick={() => router.push(sort ? `${pathname}?sort=${sort}` : pathname)}
            className="text-sm text-gray-400 hover:text-gray-600 underline dark:text-gray-500 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => update("category", e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">All categories</option>
            {ACTIVE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={confidence}
            onChange={(e) => update("confidence", e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">Any confidence</option>
            <option value="MEDIUM">Looks likely</option>
            <option value="LOW">Worth checking</option>
          </select>

          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
            <option value="confidence">Sort: Certainty</option>
          </select>
        </div>
      )}
    </div>
  );
}
