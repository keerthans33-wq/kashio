import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

export type PdfRow = {
  date:        string;
  merchant:    string;
  category:    string;
  amount:      number;
  hasEvidence: boolean;
  note:        string | null;
};

export type PdfReportProps = {
  year:          number;
  generated:     string;
  confirmed:     number;
  withEvidence:  number;
  total:         number;
  categoryTotals: { category: string; amount: number }[];
  rows:          PdfRow[];
};

const VIOLET  = "#7C3AED";
const GRAY900 = "#111827";
const GRAY600 = "#4B5563";
const GRAY400 = "#9CA3AF";
const AMBER50 = "#FFFBEB";
const AMBER700 = "#B45309";
const GREEN700 = "#065F46";
const HEADER_BG = "#F9FAFB";

const s = StyleSheet.create({
  page:      { fontFamily: "Helvetica", fontSize: 9, color: GRAY900, paddingTop: 44, paddingBottom: 44, paddingHorizontal: 44 },
  // Header banner
  banner:    { backgroundColor: VIOLET, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  bannerTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.3 },
  bannerSub:   { fontSize: 9, color: "#DDD6FE", marginTop: 2 },
  // Meta line
  meta:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, marginTop: 6 },
  metaText:  { fontSize: 8, color: GRAY400 },
  // Stat boxes
  statsRow:  { flexDirection: "row", gap: 8, marginBottom: 16 },
  statBox:   { flex: 1, borderRadius: 4, border: "1 solid #E5E7EB", paddingVertical: 8, paddingHorizontal: 10 },
  statLabel: { fontSize: 7, color: GRAY400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  statValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GRAY900 },
  statSub:   { fontSize: 7.5, color: GRAY600, marginTop: 2 },
  // Section heading
  section:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY400, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5, marginTop: 14 },
  // Category table
  catRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, borderBottom: "1 solid #F3F4F6" },
  catName:   { fontSize: 9, color: GRAY600 },
  catAmt:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: GRAY900 },
  catTotal:  { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 8, backgroundColor: HEADER_BG },
  // Deductions table
  tableHeader: { flexDirection: "row", backgroundColor: "#374151", paddingVertical: 6, paddingHorizontal: 0, marginTop: 2 },
  thCell:    { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", paddingHorizontal: 6 },
  dataRow:   { flexDirection: "row", paddingVertical: 5, borderBottom: "1 solid #F3F4F6" },
  dataRowAlt: { flexDirection: "row", paddingVertical: 5, borderBottom: "1 solid #F3F4F6", backgroundColor: AMBER50 },
  tdCell:    { fontSize: 8.5, color: GRAY600, paddingHorizontal: 6 },
  tdBold:    { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GRAY900, paddingHorizontal: 6 },
  evidenceReady:   { fontSize: 8, color: GREEN700 },
  evidenceMissing: { fontSize: 8, color: AMBER700 },
  noteText:  { fontSize: 7.5, color: GRAY400, marginTop: 1 },
  // Footer
  footer:    { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTop: "1 solid #E5E7EB", paddingTop: 6 },
  footerText: { fontSize: 7.5, color: GRAY400 },
});

const COL_WIDTHS = { date: "11%", merchant: "22%", desc: "28%", cat: "18%", amount: "11%", evidence: "10%" };

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

export function DeductionReport({
  year, generated, confirmed, withEvidence, total, categoryTotals, rows,
}: PdfReportProps) {
  return (
    <Document title={`Kashio — Tax Deduction Summary ${year}`} author="Kashio">
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* ── Banner ─────────────────────────────────────────────────── */}
        <View style={s.banner}>
          <Text style={s.bannerTitle}>Kashio</Text>
          <Text style={s.bannerSub}>Tax Deduction Summary {year}</Text>
        </View>

        {/* ── Meta ───────────────────────────────────────────────────── */}
        <View style={s.meta}>
          <Text style={s.metaText}>Generated: {generated}</Text>
          <Text style={s.metaText}>This report is for personal reference only. Verify with your tax agent before lodging.</Text>
        </View>

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Confirmed deductions</Text>
            <Text style={s.statValue}>{confirmed}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Evidence ready</Text>
            <Text style={s.statValue}>{withEvidence}</Text>
            <Text style={s.statSub}>{confirmed - withEvidence > 0 ? `${confirmed - withEvidence} still missing` : "All attached"}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total claimed</Text>
            <Text style={s.statValue}>{fmt(total)}</Text>
            <Text style={s.statSub}>AUD</Text>
          </View>
        </View>

        {/* ── Category breakdown ─────────────────────────────────────── */}
        <Text style={s.section}>By Category</Text>
        <View style={{ border: "1 solid #E5E7EB", borderRadius: 4, overflow: "hidden" }}>
          {categoryTotals.map(({ category, amount }) => (
            <View key={category} style={s.catRow}>
              <Text style={s.catName}>{category}</Text>
              <Text style={s.catAmt}>{fmt(amount)}</Text>
            </View>
          ))}
          <View style={s.catTotal}>
            <Text style={{ ...s.catName, fontFamily: "Helvetica-Bold", color: GRAY900 }}>Total</Text>
            <Text style={{ ...s.catAmt }}>{fmt(total)}</Text>
          </View>
        </View>

        {/* ── Deductions table ───────────────────────────────────────── */}
        <Text style={s.section}>Deductions</Text>
        {confirmed - withEvidence > 0 && (
          <Text style={{ fontSize: 8, color: AMBER700, marginBottom: 5 }}>
            ⚠  Rows highlighted in amber are missing evidence — add receipts before lodging.
          </Text>
        )}

        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={[s.thCell, { width: COL_WIDTHS.date }]}>Date</Text>
          <Text style={[s.thCell, { width: COL_WIDTHS.merchant }]}>Merchant</Text>
          <Text style={[s.thCell, { width: COL_WIDTHS.desc }]}>Description</Text>
          <Text style={[s.thCell, { width: COL_WIDTHS.cat }]}>Category</Text>
          <Text style={[s.thCell, { width: COL_WIDTHS.amount, textAlign: "right" }]}>Amount</Text>
          <Text style={[s.thCell, { width: COL_WIDTHS.evidence }]}>Evidence</Text>
        </View>

        {/* Table rows */}
        <View style={{ border: "1 solid #E5E7EB", borderTop: 0, borderRadius: 0 }}>
          {rows.map((r, i) => (
            <View key={i} style={r.hasEvidence ? s.dataRow : s.dataRowAlt} wrap={false}>
              <Text style={[s.tdCell, { width: COL_WIDTHS.date }]}>{r.date}</Text>
              <Text style={[s.tdBold, { width: COL_WIDTHS.merchant }]}>{r.merchant}</Text>
              <View style={{ width: COL_WIDTHS.desc, paddingHorizontal: 6 }}>
                <Text style={s.tdCell}>{r.merchant}</Text>
                {r.note ? <Text style={s.noteText}>{r.note}</Text> : null}
              </View>
              <Text style={[s.tdCell, { width: COL_WIDTHS.cat }]}>{r.category}</Text>
              <Text style={[s.tdBold, { width: COL_WIDTHS.amount, textAlign: "right" }]}>{fmt(r.amount)}</Text>
              <Text style={[s.tdCell, { width: COL_WIDTHS.evidence }, r.hasEvidence ? s.evidenceReady : s.evidenceMissing]}>
                {r.hasEvidence ? "✓ Ready" : "⚠ Missing"}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Kashio — Tax Deduction Summary {year}  ·  Generated {generated}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
