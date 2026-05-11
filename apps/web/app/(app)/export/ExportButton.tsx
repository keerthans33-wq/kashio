"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isCapacitorIOS } from "@/lib/capacitor";

type State = "idle" | "loading" | "done" | "error";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function exportForIOS(blob: Blob, fileName: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const base64 = await blobToBase64(blob);

  const { uri } = await Filesystem.writeFile({
    path:      fileName,
    data:      base64,
    directory: Directory.Cache,
  });

  console.log("[Kashio] Export file written to:", uri);

  await Share.share({
    title:       "Kashio tax report",
    text:        "Your Kashio tax report is ready.",
    url:         uri,
    dialogTitle: "Save or share your Kashio report",
  });
}

function exportForWeb(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton() {
  const [state, setState] = useState<State>("idle");
  const [ios,   setIos]   = useState(false);

  useEffect(() => { setIos(isCapacitorIOS()); }, []);

  async function handleExport() {
    setState("loading");
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");

      const blob     = await res.blob();
      const fileName =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `kashio-tax-summary-${new Date().getFullYear()}.xlsx`;

      if (ios) {
        await exportForIOS(blob, fileName);
      } else {
        exportForWeb(blob, fileName);
      }

      setState("done");
    } catch (e) {
      console.error("[Kashio] Export error:", e);
      setState("error");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Kashio provides AI-generated insights only. Always verify with a qualified accountant before submitting tax claims.
      </p>

      <Button
        onClick={handleExport}
        disabled={state === "loading" || state === "done"}
        className="w-full h-14 text-base gap-3 shadow-[0_0_32px_rgba(34,197,94,0.30),0_2px_12px_rgba(0,0,0,0.4)]"
      >
        {state === "loading" ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Preparing your report…
          </>
        ) : state === "done" ? (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {ios ? "Shared" : "Downloaded"}
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {ios ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              )}
            </svg>
            {ios ? "Share tax report" : "Download your tax summary"}
          </>
        )}
      </Button>

      {state === "done" && (
        <div
          className="mt-5 rounded-2xl px-5 py-5 text-center space-y-2"
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
            {ios ? "Your report is ready" : "You're ready to lodge"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {ios
              ? "Save to Files, email it, or AirDrop it to your accountant."
              : "Share your report with your accountant or use it to lodge your return."}
          </p>
          {ios && (
            <button
              onClick={handleExport}
              className="mt-1 text-[12px] underline underline-offset-2"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Share again
            </button>
          )}
        </div>
      )}

      {state === "error" && (
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <p className="text-[13px] text-red-400">Export failed. Please try again.</p>
        </div>
      )}
    </div>
  );
}
