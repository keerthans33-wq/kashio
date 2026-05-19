"use client";

import { useState } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";
import type { Item } from "./PaywallGate";

type CategoryGroup = {
  cat:      string;
  catTotal: number;
  items:    Item[];
};

type Props = {
  allItems:       Item[];
  categoryGroups: CategoryGroup[];
  total:          number;
  likelyTotal:    number;
  reviewTotal:    number;
  excludedTotal:  number;
  confirmedCount: number;
  wfhYtdHours:   number;
  wfhYtdEst:     number;
  email:          string;
};

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function TaxPdfButton({ allItems, categoryGroups, total, likelyTotal, reviewTotal, excludedTotal, confirmedCount, wfhYtdHours, wfhYtdEst, email }: Props) {
  const [loading, setLoading] = useState(false);
  const ios = isCapacitorIOS();

  const now        = new Date();
  const year       = now.getFullYear();
  const fy         = `FY${String(year - 1).slice(2)}–${String(year).slice(2)}`;
  const fyFilename = `${year - 1}-${year}`;
  const estimatedSaving = Math.round(likelyTotal * 0.325);

  async function handleDownload() {
    if (allItems.length === 0) return;
    setLoading(true);
    try {
      const { jsPDF }              = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W   = doc.internal.pageSize.getWidth();

      const colDark:   [number, number, number] = [15, 20, 35];
      const colGreen:  [number, number, number] = [34, 197, 94];
      const colAmber:  [number, number, number] = [217, 119, 6];
      const colMuted:  [number, number, number] = [110, 120, 140];
      const colLight:  [number, number, number] = [247, 249, 252];
      const colAmberBg:[number, number, number] = [255, 251, 235];

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
      doc.text("Tax Deduction Summary", 14, 21);

      doc.setFontSize(8);
      doc.setTextColor(140, 150, 165);
      doc.text(
        now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
        W - 14, 21, { align: "right" }
      );

      // ── Meta block ──────────────────────────────────────────────────────────
      let y = 38;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colMuted);
      doc.text("Prepared for",        14,  y);
      doc.text("Financial year",      90,  y);
      doc.text("Likely deductions",   145, y);
      doc.text("Estimated saving",    175, y);

      y += 5.5;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colDark);
      doc.text(email || "—", 14, y);
      doc.text(fy,           90, y);

      doc.setTextColor(...colGreen);
      doc.text(`$${likelyTotal.toFixed(2)}`, 145, y);
      doc.text(estimatedSaving > 0 ? `~$${estimatedSaving}` : "—", 175, y);

      if (reviewTotal > 0 || excludedTotal > 0) {
        y += 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colMuted);
        const parts: string[] = [];
        if (reviewTotal > 0)   parts.push(`$${reviewTotal.toFixed(2)} needs review`);
        if (excludedTotal > 0) parts.push(`$${excludedTotal.toFixed(2)} excluded`);
        doc.text(parts.join(" · "), 14, y);
      }

      // Divider
      y += 9;
      doc.setDrawColor(220, 225, 232);
      doc.setLineWidth(0.3);
      doc.line(14, y, W - 14, y);
      y += 7;

      // ── Summary totals ───────────────────────────────────────────────────────
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colMuted);
      doc.text("SUMMARY", 14, y);
      y += 4;

      const summaryBody: [string, string][] = [
        ["Likely deduction amount", `$${likelyTotal.toFixed(2)}`],
      ];
      if (reviewTotal > 0)   summaryBody.push(["Needs review amount", `$${reviewTotal.toFixed(2)}`]);
      if (excludedTotal > 0) summaryBody.push(["Excluded from estimate", `$${excludedTotal.toFixed(2)}`]);
      summaryBody.push(["Estimated tax saving (32.5% — likely only)", estimatedSaving > 0 ? `~$${estimatedSaving}` : "—"]);

      autoTable(doc, {
        startY:  y,
        margin:  { left: 14, right: 14 },
        body: summaryBody,
        bodyStyles: { fontSize: 9, textColor: colDark, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
        alternateRowStyles: { fillColor: colLight },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 45, halign: "right", fontStyle: "bold" },
        },
        tableLineColor: [220, 225, 232],
        tableLineWidth: 0.2,
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Category breakdown ───────────────────────────────────────────────────
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colMuted);
      doc.text("BY CATEGORY", 14, y);
      y += 4;

      autoTable(doc, {
        startY:  y,
        margin:  { left: 14, right: 14 },
        head: [["Category", "Amount"]],
        body: categoryGroups.map(({ cat, catTotal }) => [cat, `$${catTotal.toFixed(2)}`]),
        headStyles: {
          fillColor: colDark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9,
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
        bodyStyles: { fontSize: 9, textColor: colDark, cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 } },
        alternateRowStyles: { fillColor: colLight },
        columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 40, halign: "right" } },
        tableLineColor: [220, 225, 232],
        tableLineWidth: 0.2,
        foot: [["Total", `$${total.toFixed(2)}`]],
        footStyles: {
          fillColor: [234, 250, 241], textColor: [20, 100, 50], fontStyle: "bold", fontSize: 9,
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ── WFH section ─────────────────────────────────────────────────────────
      if (wfhYtdHours > 0) {
        if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colMuted);
        doc.text("WORK FROM HOME — 67¢/HR ATO FIXED RATE", 14, y);
        y += 4;

        autoTable(doc, {
          startY:  y,
          margin:  { left: 14, right: 14 },
          head: [["Description", "Value"]],
          body: [
            ["Hours logged", `${wfhYtdHours} hr${wfhYtdHours !== 1 ? "s" : ""}`],
            ["Estimated deduction", `~$${Math.round(wfhYtdEst)}`],
          ],
          headStyles: {
            fillColor: colDark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
          },
          bodyStyles: { fontSize: 9, textColor: colDark, cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 } },
          alternateRowStyles: { fillColor: colLight },
          columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 40, halign: "right" } },
          tableLineColor: [220, 225, 232],
          tableLineWidth: 0.2,
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Transaction tables — split by confidence tier ───────────────────────

      const tiers: { label: string; items: Item[]; tierTotal: number; headFill: [number,number,number]; note?: string }[] = [];

      const likelyItems   = allItems.filter(i => i.confidence === "HIGH");
      const reviewItems   = allItems.filter(i => i.confidence === "MEDIUM");
      const excludedItems = allItems.filter(i => i.confidence === "LOW");

      if (likelyItems.length > 0) {
        tiers.push({ label: "LIKELY DEDUCTIONS", items: likelyItems, tierTotal: likelyTotal, headFill: [20, 80, 45] });
      }
      if (reviewItems.length > 0) {
        tiers.push({
          label: "NEEDS REVIEW", items: reviewItems, tierTotal: reviewTotal, headFill: [120, 80, 20],
          note: "These are confirmed but may not be fully deductible — verify with your accountant before claiming.",
        });
      }
      if (excludedItems.length > 0) {
        tiers.push({
          label: "EXCLUDED FROM ESTIMATE", items: excludedItems, tierTotal: excludedTotal, headFill: [60, 65, 75],
          note: "Low confidence — not counted in estimated saving. Verify with your accountant.",
        });
      }

      for (const tier of tiers) {
        if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colMuted);
        doc.text(tier.label, 14, y);
        y += 4;

        if (tier.note) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colMuted);
          doc.text(tier.note, 14, y);
          y += 5;
        }

        autoTable(doc, {
          startY:  y,
          margin:  { left: 14, right: 14 },
          head: [["Date", "Merchant", "Category", "Confidence", "Amount"]],
          body: tier.items.map((item) => [
            fmtDate(item.date),
            item.merchant,
            item.category,
            item.confidence,
            `$${item.amount.toFixed(2)}`,
          ]),
          headStyles: {
            fillColor: tier.headFill, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
          },
          bodyStyles: {
            fontSize: 9, textColor: colDark, cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
            fillColor: tier.headFill === colAmber ? colAmberBg : undefined,
          },
          alternateRowStyles: { fillColor: tier.headFill === colAmber ? [255, 248, 220] : colLight },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: "auto" },
            2: { cellWidth: 45 },
            3: { cellWidth: 22 },
            4: { cellWidth: 25, halign: "right" },
          },
          tableLineColor: [220, 225, 232],
          tableLineWidth: 0.2,
          foot: [[
            `${tier.items.length} item${tier.items.length !== 1 ? "s" : ""}`,
            "", "", "",
            `$${tier.tierTotal.toFixed(2)}`,
          ]],
          footStyles: {
            fillColor: [234, 250, 241], textColor: [20, 100, 50], fontStyle: "bold", fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
          },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

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
        doc.text("Verify all deductions with your registered tax agent before lodging.", 14, pH - 4.5);
        doc.text(`Page ${i} of ${pageCount}`, W - 14, pH - 6.5, { align: "right" });
      }

      const fileName = `Kashio-Tax-Summary-${fyFilename}.pdf`;

      if (ios) {
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
          title:       "Tax Deduction Summary",
          url:         uri,
          dialogTitle: "Save or share your tax summary",
        });
      } else {
        doc.save(fileName);
      }
    } finally {
      setLoading(false);
    }
  }

  if (allItems.length === 0) return null;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-opacity disabled:opacity-50 hover:opacity-80"
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
        color:           "var(--text-secondary)",
        border:          "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )}
      {loading ? "Generating PDF…" : ios ? "Share PDF summary" : "Download PDF summary"}
    </button>
  );
}
