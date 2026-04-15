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
    <div>
      <Button onClick={handleExport} disabled={state === "loading"} className="w-full gap-2">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {state === "loading" ? "Preparing your report…" : "Download your report"}
      </Button>

      {state === "done" && (
        <div className="mt-4 rounded-xl px-5 py-4 text-center space-y-1 animate-[fadeIn_0.2s_ease-out]" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>You're ready to lodge.</p>
          <p className="text-xs" style={{ color: "#22C55E", opacity: 0.8 }}>Your report is saved. Take it to your accountant or use it to complete your return.</p>
        </div>
      )}
      {state === "error" && (
        <p className="mt-3 text-center text-sm text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
