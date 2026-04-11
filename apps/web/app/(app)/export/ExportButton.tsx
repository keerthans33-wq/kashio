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
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3.5 text-base font-semibold text-white transition-all duration-150 hover:bg-violet-700 active:scale-[0.98] active:bg-violet-800 disabled:opacity-60"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {state === "loading" ? "Preparing your report…" : "Download your report"}
      </button>

      {state === "done" && (
        <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-950/30 px-5 py-4 text-center space-y-1 animate-[fadeIn_0.2s_ease-out]">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">You're ready to lodge.</p>
          <p className="text-xs text-green-600/80 dark:text-green-500">Your report is saved. Take it to your accountant or use it to complete your return.</p>
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
