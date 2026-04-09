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
    value === "" ? next.delete(key) : next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  const category   = params.get("category") ?? "";
  const confidence = params.get("confidence") ?? "";
  const sort       = params.get("sort") ?? "";
  const hasFilters = category || confidence || sort;

  return (
    <div className="mt-4">

      {/* Toggle row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          {open ? "Hide options" : "View options"}
          {hasFilters && !open && (
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          )}
        </button>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm text-gray-400 underline hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Reset
          </button>
        )}
      </div>

      {/* Filter panel */}
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Category</span>
            {["", ...ACTIVE_CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => update("category", c)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  category === c
                    ? "bg-violet-600 text-white"
                    : "border border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                }`}
              >
                {c === "" ? "All" : c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Match</span>
            {[
              { value: "",       label: "All" },
              { value: "HIGH",   label: "Likely deductible" },
              { value: "MEDIUM", label: "Needs a closer look" },
              { value: "LOW",    label: "Review carefully" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update("confidence", value)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  confidence === value
                    ? "bg-violet-600 text-white"
                    : "border border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Sort</span>
            {[
              { value: "",           label: "Date" },
              { value: "amount",     label: "Amount" },
              { value: "confidence", label: "Certainty" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update("sort", value)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  sort === value
                    ? "bg-violet-600 text-white"
                    : "border border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
