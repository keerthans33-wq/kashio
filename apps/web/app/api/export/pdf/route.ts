import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React, { type JSXElementConstructor, type ReactElement } from "react";
import { db } from "../../../../lib/db";
import { mapExportRow } from "../../../../lib/export/mapExportRow";
import { DeductionReport } from "../../../../lib/export/pdfReport";

export const runtime = "nodejs";

export async function GET() {
  try {
    const candidates = await db.deductionCandidate.findMany({
      where:   { status: "CONFIRMED" },
      include: { transaction: true },
      orderBy: { transaction: { date: "asc" } },
    });

    if (candidates.length === 0) {
      return Response.json({ error: "No confirmed candidates to export." }, { status: 404 });
    }

    const now       = new Date();
    const year      = now.getFullYear();
    const generated = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

    const confirmed    = candidates.length;
    const withEvidence = candidates.filter((c) => c.hasEvidence).length;
    const total        = candidates.reduce((sum, c) => sum + Math.abs(c.transaction.amount), 0);

    const categoryTotals = Object.entries(
      candidates.reduce<Record<string, number>>((acc, c) => {
        acc[c.category] = (acc[c.category] ?? 0) + Math.abs(c.transaction.amount);
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));

    const rows = candidates.map((c) => {
      const row = mapExportRow(c);
      return {
        date:        row.date,
        merchant:    row.merchant,
        category:    row.category,
        amount:      row.amount,
        hasEvidence: c.hasEvidence,
        note:        c.evidenceNote,
      };
    });

    const buffer = await renderToBuffer(
      React.createElement(DeductionReport, {
        year, generated, confirmed, withEvidence, total, categoryTotals, rows,
      }) as unknown as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="kashio-deductions-${year}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[PDF export error]", err);
    return Response.json(
      { error: "Could not generate PDF. Please try again." },
      { status: 500 }
    );
  }
}
