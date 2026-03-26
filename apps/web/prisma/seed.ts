/**
 * Seed script for Kashio demo/testing states.
 *
 * Usage (from apps/web):
 *   pnpm seed:empty          — clear all data
 *   pnpm seed:imported       — transactions only, no candidates
 *   pnpm seed:reviewed       — mix of needs review / confirmed / rejected
 *   pnpm seed:confirmed      — all confirmed, no evidence attached
 *   pnpm seed:export-ready   — all confirmed + evidence ready
 *
 * Requires DATABASE_URL in environment.
 * If using .env.local, run: source .env.local first, or use dotenv-cli.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { normalizeMerchant } from "../lib/normalizeMerchant";

// ─── Data ────────────────────────────────────────────────────────────────────

const WORK_TRANSACTIONS = [
  { date: "2024-07-02", description: "ADOBE CREATIVE CLOUD SUBS",    amount: -87.49  },
  { date: "2024-07-04", description: "ZOOM VIDEO COMMUNICATIONS",    amount: -21.99  },
  { date: "2024-07-08", description: "OFFICEWORKS 0084 COLLINGWOOD", amount: -67.80  },
  { date: "2024-07-11", description: "MICROSOFT 365 SUBSCRIPTION",   amount: -119.00 },
  { date: "2024-07-15", description: "CANVA PTY LTD",                amount: -16.99  },
  { date: "2024-07-19", description: "GITHUB INC MONTHLY",           amount: -10.00  },
  { date: "2024-07-22", description: "SLACK TECHNOLOGIES",           amount: -10.00  },
  { date: "2024-07-29", description: "OFFICEWORKS ONLINE STORE",     amount: -28.75  },
];

const PERSONAL_TRANSACTIONS = [
  { date: "2024-07-01", description: "SALARY PAYMENT",               amount: 4200.00  },
  { date: "2024-07-03", description: "WOOLWORTHS METRO RICHMOND",    amount: -94.32   },
  { date: "2024-07-09", description: "NETFLIX AUSTRALIA",            amount: -22.99   },
  { date: "2024-07-12", description: "UBER EATS MELBOURNE",          amount: -42.50   },
  { date: "2024-07-16", description: "COLES SUPERMARKET 3112",       amount: -78.45   },
  { date: "2024-07-23", description: "KMART AUSTRALIA ONLINE",       amount: -59.90   },
  { date: "2024-07-30", description: "REFUND ADOBE INC",             amount:  87.49   },
  { date: "2024-07-31", description: "MYER MELBOURNE CITY",          amount: -189.00  },
];

const CANDIDATE_META: Record<string, { category: string; confidence: "LOW" | "MEDIUM" | "HIGH"; reason: string; evidenceNote: string }> = {
  "ADOBE CREATIVE CLOUD SUBS":    { category: "Work Software & Tools",      confidence: "HIGH",   reason: "Adobe Creative Cloud is a known professional software subscription",     evidenceNote: "Adobe receipt in email — Jul 2024" },
  "ZOOM VIDEO COMMUNICATIONS":    { category: "Work Software & Tools",      confidence: "MEDIUM", reason: "Zoom matches known video conferencing software",                         evidenceNote: "Zoom invoice downloaded from account portal" },
  "OFFICEWORKS 0084 COLLINGWOOD": { category: "Office Supplies & Equipment", confidence: "MEDIUM", reason: "Officeworks is a known office supplies retailer",                       evidenceNote: "Receipt saved — desk mat and printer paper" },
  "MICROSOFT 365 SUBSCRIPTION":   { category: "Work Software & Tools",      confidence: "MEDIUM", reason: "Microsoft matches known software subscription",                         evidenceNote: "Microsoft 365 annual invoice" },
  "CANVA PTY LTD":                { category: "Work Software & Tools",      confidence: "MEDIUM", reason: "Canva is a known design software subscription",                         evidenceNote: "Canva receipt in email" },
  "GITHUB INC MONTHLY":           { category: "Work Software & Tools",      confidence: "MEDIUM", reason: "GitHub matches known software development platform subscription",       evidenceNote: "GitHub billing email — Jul 2024" },
  "SLACK TECHNOLOGIES":           { category: "Work Software & Tools",      confidence: "MEDIUM", reason: "Slack Technologies is a known professional communication tool",        evidenceNote: "Slack invoice from account settings" },
  "OFFICEWORKS ONLINE STORE":     { category: "Office Supplies & Equipment", confidence: "MEDIUM", reason: "Officeworks is a known office supplies retailer",                       evidenceNote: "Order confirmation email — HDMI cable" },
};

// ─── States ──────────────────────────────────────────────────────────────────

type State = "empty" | "imported" | "reviewed" | "confirmed" | "export-ready";

const CANDIDATE_STATUSES: Record<string, "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED"> = {
  "ADOBE CREATIVE CLOUD SUBS":    "CONFIRMED",
  "ZOOM VIDEO COMMUNICATIONS":    "CONFIRMED",
  "OFFICEWORKS 0084 COLLINGWOOD": "CONFIRMED",
  "MICROSOFT 365 SUBSCRIPTION":   "NEEDS_REVIEW",
  "CANVA PTY LTD":                "NEEDS_REVIEW",
  "GITHUB INC MONTHLY":           "NEEDS_REVIEW",
  "SLACK TECHNOLOGIES":           "REJECTED",
  "OFFICEWORKS ONLINE STORE":     "REJECTED",
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const state = (
    process.argv.find((a) => a.startsWith("--state="))?.split("=")[1] ??
    process.argv[process.argv.indexOf("--state") + 1]
  ) as State | undefined;

  const validStates: State[] = ["empty", "imported", "reviewed", "confirmed", "export-ready"];
  if (!state || !validStates.includes(state)) {
    console.error(`Usage: tsx prisma/seed.ts --state <${validStates.join("|")}>`);
    process.exit(1);
  }

  const rawUrl = process.env.DATABASE_URL ?? "";
  if (!rawUrl) {
    console.error("DATABASE_URL is not set. Source .env.local before running.");
    process.exit(1);
  }

  const url = new URL(rawUrl);
  url.searchParams.delete("sslmode");
  const isLocal = url.toString().includes("localhost");
  const pool = new Pool({
    connectionString: url.toString(),
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });

  try {
    // Always clear existing data first
    await prisma.deductionCandidate.deleteMany();
    await prisma.transaction.deleteMany();
    console.log("  ✓ Cleared existing data");

    if (state === "empty") {
      console.log("  → State: empty — all data cleared");
      return;
    }

    // Create all transactions
    const allTxData = [...PERSONAL_TRANSACTIONS, ...WORK_TRANSACTIONS];
    const createdTxs = await prisma.$transaction(
      allTxData.map((t) =>
        prisma.transaction.create({
          data: {
            date:               t.date,
            description:        t.description,
            normalizedMerchant: normalizeMerchant(t.description),
            amount:             t.amount,
          },
        })
      )
    );
    console.log(`  ✓ Created ${createdTxs.length} transactions`);

    if (state === "imported") {
      console.log("  → State: imported — transactions only, no candidates");
      return;
    }

    // Map transactions by description for candidate creation
    const txByDesc = Object.fromEntries(createdTxs.map((t) => [t.description, t]));

    const candidateData = WORK_TRANSACTIONS.map(({ description }) => {
      const tx   = txByDesc[description];
      const meta = CANDIDATE_META[description];

      let status:      "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED" = "NEEDS_REVIEW";
      let hasEvidence  = false;
      let evidenceNote = null as string | null;

      if (state === "reviewed") {
        status = CANDIDATE_STATUSES[description];
      } else if (state === "confirmed" || state === "export-ready") {
        status = "CONFIRMED";
      }

      if (state === "export-ready") {
        hasEvidence  = true;
        evidenceNote = meta.evidenceNote;
      }

      return prisma.deductionCandidate.create({
        data: {
          transactionId: tx.id,
          category:      meta.category,
          confidence:    meta.confidence,
          reason:        meta.reason,
          status,
          hasEvidence,
          evidenceNote,
        },
      });
    });

    const created = await prisma.$transaction(candidateData);
    console.log(`  ✓ Created ${created.length} deduction candidates`);
    console.log(`  → State: ${state}`);

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
