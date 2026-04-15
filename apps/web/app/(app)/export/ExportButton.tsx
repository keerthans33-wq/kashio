"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "kashio-tax-summary.xlsx";
      a.click();
      URL.revokeObjectURL(url);

      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleExport}
        disabled={state === "loading" || state === "done"}
        className="w-full gap-2.5"
      >
        {state === "loading" ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Preparing your report…
          </>
        ) : state === "done" ? (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Downloaded
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download your tax summary
          </>
        )}
      </Button>

      {state === "done" && (
        <div className="mt-5 rounded-2xl px-5 py-5 text-center space-y-2"
          style={{ backgroundColor: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)" }}
        >
          <div
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: "#22C55E" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "#22C55E" }}>
            You&apos;re ready to lodge
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Share your report with your accountant or use it to lodge your return.
          </p>
        </div>
      )}
      {state === "error" && (
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <p className="text-[13px] text-red-400">Something went wrong. Please try again.</p>
        </div>
      )}
    </div>
  );
}
