"use client";

import { useState } from "react";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";
import { ProPaywallModal } from "@/components/shared/ProPaywallModal";
import { isCapacitorIOS } from "@/lib/capacitor";

type Entry = {
  id:    string;
  date:  string;
  hours: number;
  note:  string | null;
};

type Props = {
  entries:     Entry[];
  fyLabel:     string;  // e.g. "FY25–26"
  ytdHours:    number;
  ytdEst:      number;
  email:       string;
  serverIsPro: boolean;
};

const WFH_RATE = 0.67;

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Derive FY boundaries from the label "FY25–26" → startYear 2025.
function fyBounds(fyLabel: string) {
  const startYear = 2000 + parseInt(fyLabel.replace("FY", "").split(/[–-]/)[0], 10);
  return {
    fyStart:    `${startYear}-07-01`,
    fyEnd:      `${startYear + 1}-06-30`,
    fyFilename: `${startYear}-${startYear + 1}`,
  };
}

export function WfhDownloadButton({ entries, fyLabel, ytdHours, ytdEst, email, serverIsPro }: Props) {
  const { isPro: rcIsPro } = useRevenueCat();
  const isPro = serverIsPro || rcIsPro;

  const [loading,     setLoading]     = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const ios = isCapacitorIOS();

  const { fyStart, fyEnd, fyFilename } = fyBounds(fyLabel);
  const fyEntries = entries.filter((e) => e.date >= fyStart && e.date <= fyEnd);

  async function handleDownload() {
    if (!isPro) { setPaywallOpen(true); return; }
    if (fyEntries.length === 0) return;
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W   = doc.internal.pageSize.getWidth();

      const colDark:  [number, number, number] = [15, 20, 35];
      const colGreen: [number, number, number] = [34, 197, 94];
      const colMuted: [number, number, number] = [110, 120, 140];
      const colLight: [number, number, number] = [247, 249, 252];

      // ── Header bar ──────────────────────────────────────────────────────────
      doc.setFillColor(...colDark);
      doc.rect(0, 0, W, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("Kashio", 14, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 190, 200);
      doc.text("Work From Home Log", 14, 21);

      // Generated date — top right
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 165);
      doc.text(
        new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
        W - 14, 21, { align: "right" }
      );

      // ── Meta block ──────────────────────────────────────────────────────────
      let y = 38;

      // Labels row
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colMuted);
      doc.text("Prepared for",   14,  y);
      doc.text("Financial year", 90,  y);
      doc.text("Total hours",    145, y);
      doc.text("Est. deduction", 175, y);

      y += 5.5;

      // Values row
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colDark);
      doc.text(email || "—", 14, y);
      doc.text(fyLabel,       90, y);
      doc.text(`${ytdHours} hr${ytdHours !== 1 ? "s" : ""}`, 145, y);

      doc.setTextColor(...colGreen);
      doc.text(`~$${Math.round(ytdEst)}`, 175, y);

      // Divider
      y += 9;
      doc.setDrawColor(220, 225, 232);
      doc.setLineWidth(0.3);
      doc.line(14, y, W - 14, y);
      y += 7;

      // ── Table ───────────────────────────────────────────────────────────────
      autoTable(doc, {
        startY:  y,
        margin:  { left: 14, right: 14 },
        head: [["Date", "Hours", "Notes"]],
        body: fyEntries.map((e) => [
          fmtDate(e.date),
          `${e.hours} hr${e.hours !== 1 ? "s" : ""}`,
          e.note || "—",
        ]),
        headStyles: {
          fillColor:   colDark,
          textColor:   [255, 255, 255],
          fontStyle:   "bold",
          fontSize:    9,
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
        bodyStyles: {
          fontSize:    9,
          textColor:   colDark,
          cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
        },
        alternateRowStyles: { fillColor: colLight },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 26 },
          2: { cellWidth: "auto" },
        },
        tableLineColor: [220, 225, 232],
        tableLineWidth: 0.2,
        foot: [[
          `Total: ${fyEntries.length} day${fyEntries.length !== 1 ? "s" : ""}`,
          `${ytdHours} hr${ytdHours !== 1 ? "s" : ""}`,
          `~$${Math.round(ytdEst)} deduction (${WFH_RATE * 100}¢/hr ATO fixed rate)`,
        ]],
        footStyles: {
          fillColor: [234, 250, 241],
          textColor: [20, 100, 50],
          fontStyle: "bold",
          fontSize:  9,
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
      });

      // ── Footer (every page) ─────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pH = doc.internal.pageSize.getHeight();

        doc.setFillColor(...colLight);
        doc.rect(0, pH - 16, W, 16, "F");
        doc.setDrawColor(220, 225, 232);
        doc.setLineWidth(0.2);
        doc.line(0, pH - 16, W, pH - 16);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colMuted);
        doc.text("Generated by Kashio · kashio.com.au", 14, pH - 9);
        doc.text("Keep records and receipts as recommended by the ATO.", 14, pH - 4.5);
        doc.text(`Page ${i} of ${pageCount}`, W - 14, pH - 6.5, { align: "right" });
      }

      const fileName = `Kashio-WFH-Log-${fyFilename}.pdf`;
      if (isCapacitorIOS()) {
        const blob   = doc.output("blob");
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/share"),
        ]);
        const { uri } = await Filesystem.writeFile({
          path:      fileName,
          data:      base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title:       "WFH Log",
          url:         uri,
          dialogTitle: "Save or share your WFH log",
        });
      } else {
        doc.save(fileName);
      }
    } finally {
      setLoading(false);
    }
  }

  if (fyEntries.length === 0) return null;

  return (
    <>
      <ProPaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />

      {isPro ? (
        // ── Pro: download button card ─────────────────────────────────────────
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border:          "1px solid var(--bg-border)",
            boxShadow:       "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                WFH Log — {fyLabel}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {fyEntries.length} day{fyEntries.length !== 1 ? "s" : ""} · {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${Math.round(ytdEst)} est.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-50 hover:opacity-80"
              style={{
                backgroundColor: "rgba(34,197,94,0.12)",
                color:           "#22C55E",
                border:          "1px solid rgba(34,197,94,0.22)",
              }}
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              {loading ? "Generating…" : ios ? "Share WFH Log" : "Download WFH Log"}
            </button>
          </div>
        </div>
      ) : (
        // ── Free: blurred preview + lock overlay ──────────────────────────────
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="relative">
            {/* Blurred mock content */}
            <div
              className="px-5 py-4"
              style={{
                filter:        "blur(3px)",
                opacity:       0.45,
                userSelect:    "none",
                pointerEvents: "none",
                backgroundColor: "var(--bg-card)",
              }}
              aria-hidden
            >
              <p className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                WFH Log — {fyLabel}
              </p>
              <div className="space-y-2">
                {fyEntries.slice(0, 4).map((e) => (
                  <div key={e.id} className="flex justify-between text-[12px]" style={{ color: "var(--text-muted)" }}>
                    <span>{fmtDate(e.date)}</span>
                    <span>{e.hours} hr{e.hours !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
              <div
                className="mt-3 flex justify-between text-[12px] font-semibold pt-2"
                style={{ borderTop: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}
              >
                <span>Total</span>
                <span>~${Math.round(ytdEst)}</span>
              </div>
            </div>

            {/* Frosted lock overlay */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 py-4"
              style={{
                background:     "linear-gradient(to bottom, rgba(5,7,14,0.45) 0%, rgba(5,7,14,0.80) 100%)",
                backdropFilter: "blur(1px)",
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.30)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="text-center px-4">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Download WFH Log
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Pro feature — PDF with full log &amp; ATO deduction
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                className="rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85"
                style={{ backgroundColor: "#22C55E", color: "#000" }}
              >
                Unlock Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
