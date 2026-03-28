// POST /api/demo/connect
//
// Simulates a bank connection by loading a hardcoded sample dataset and
// running it through the same import pipeline as the real CSV and Basiq flows.

import { NextResponse } from "next/server";
import { normalizeMerchant } from "../../../../lib/normalizeMerchant";
import { runImportPipeline } from "../../../../lib/importPipeline";

export const dynamic = "force-dynamic";

// Realistic Australian transactions that exercise the deduction rules engine.
// Mix of flaggable (software, office supplies, workwear) and everyday spending.
const DEMO_TRANSACTIONS = [
  // ── Work software (will be flagged) ─────────────────────────────────────────
  { date: "2026-02-01", description: "Adobe Creative Cloud subscription", amount: -89.99 },
  { date: "2026-02-03", description: "Canva Pro monthly plan", amount: -19.99 },
  { date: "2026-02-10", description: "Notion subscription", amount: -16.00 },
  { date: "2026-02-14", description: "Slack Pro monthly", amount: -12.50 },
  { date: "2026-02-18", description: "Dropbox Plus annual renewal", amount: -134.99 },
  { date: "2026-02-22", description: "Figma subscription", amount: -45.00 },
  { date: "2026-03-01", description: "Microsoft 365 Business subscription", amount: -17.00 },
  // ── Office supplies (will be flagged) ────────────────────────────────────────
  { date: "2026-02-05", description: "Officeworks - desk lamp and notebooks", amount: -67.40 },
  { date: "2026-02-19", description: "Officeworks - printer ink cartridges", amount: -38.90 },
  { date: "2026-03-03", description: "Officeworks - USB hub and cables", amount: -52.00 },
  // ── Everyday spending (will not be flagged) ───────────────────────────────────
  { date: "2026-02-02", description: "Woolworths supermarket", amount: -143.20 },
  { date: "2026-02-04", description: "Coles Eastgardens", amount: -89.55 },
  { date: "2026-02-06", description: "Netflix subscription", amount: -22.99 },
  { date: "2026-02-07", description: "Uber Eats - Guzman y Gomez", amount: -31.50 },
  { date: "2026-02-08", description: "BP fuel Parramatta Rd", amount: -95.00 },
  { date: "2026-02-09", description: "JB Hi-Fi - headphones", amount: -199.00 },
  { date: "2026-02-11", description: "Bunnings Warehouse", amount: -54.80 },
  { date: "2026-02-12", description: "Dan Murphy's", amount: -48.00 },
  { date: "2026-02-13", description: "Kmart clothing", amount: -62.00 },
  { date: "2026-02-15", description: "Spotify premium", amount: -11.99 },
  { date: "2026-02-16", description: "Petbarn - dog food", amount: -89.00 },
  { date: "2026-02-17", description: "Menulog - Thai delivery", amount: -27.80 },
  { date: "2026-02-20", description: "Salary - employer direct deposit", amount: 4200.00 },
  { date: "2026-02-21", description: "ALDI supermarket", amount: -67.30 },
  { date: "2026-02-23", description: "Apple iTunes", amount: -6.99 },
  { date: "2026-02-24", description: "iGaming - PlayStation store", amount: -29.95 },
  { date: "2026-02-25", description: "Target - homewares", amount: -112.00 },
  { date: "2026-02-26", description: "IGA supermarket", amount: -44.10 },
  { date: "2026-02-27", description: "Uber trip - CBD to airport", amount: -38.00 },
  { date: "2026-02-28", description: "Interest earned - savings account", amount: 14.22 },
  { date: "2026-03-02", description: "Caltex fuel", amount: -88.40 },
  { date: "2026-03-04", description: "Chemist Warehouse", amount: -35.50 },
  { date: "2026-03-05", description: "Domino's pizza", amount: -24.95 },
];

export async function POST() {
  const rows = DEMO_TRANSACTIONS.map((t) => ({
    date: t.date,
    description: t.description,
    normalizedMerchant: normalizeMerchant(t.description),
    amount: t.amount,
  }));

  try {
    const result = await runImportPipeline(rows, "Demo — simulated bank connection", "DEMO_BANK");
    return NextResponse.json({
      inserted: result.inserted,
      duplicates: result.duplicates,
      flagged: result.flagged,
      batchId: result.batchId,
    });
  } catch (err) {
    console.error("Demo import error:", err);
    return NextResponse.json(
      { error: "Could not run demo import. The database may be unavailable." },
      { status: 500 },
    );
  }
}
