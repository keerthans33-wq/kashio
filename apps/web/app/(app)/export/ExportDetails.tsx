"use client";

import { useState } from "react";

type Item = {
  id:       string;
  date:     string;
  merchant: string;
  category: string;
  amount:   number;
};

export function ExportDetails({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {open ? "Hide details" : `View details (${items.length})`}
      </button>

      {open && (
        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.merchant}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {item.date} · {item.category}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                ${item.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
