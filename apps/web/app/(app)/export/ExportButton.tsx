"use client";

import { useState } from "react";

export function ExportButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleExport() {
    setState("loading");
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "kashio-deductions.csv";
      a.click();
      URL.revokeObjectURL(url);

      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={state === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-violet-700 active:bg-violet-800 disabled:opacity-60"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {state === "loading" ? "Exporting…" : "Export report (.csv)"}
      </button>

      {state === "done" && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Report downloaded. You're ready for tax time.
        </div>
      )}
      {state === "error" && (
        <p className="mt-3 text-center text-sm text-red-500">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
