// Dev-only script: test the Ollama refinement layer against sample transactions.
//
// Usage:
//   npx tsx scripts/testOllamaRefinement.ts
//
// Requires OLLAMA_ENABLED=true in .env.local and `ollama serve` running locally.
// Safe to delete — has no effect on the production app.

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local before importing modules that read process.env at module level.
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { detectDeduction } from "../lib/rules";
import { refineTransaction } from "../lib/ollama/refineTransaction";
import type { TransactionInput } from "../lib/rules/types";

// ─── Sample transactions ──────────────────────────────────────────────────────
// Add/remove rows here to test different cases.

const SAMPLES: Array<{ label: string; userType: string; tx: TransactionInput }> = [
  {
    label:    "Telstra — merchant only, no billing keyword",
    userType: "contractor",
    tx: { normalizedMerchant: "Telstra", description: "TELSTRA BILL", amount: -89.00 },
  },
  {
    label:    "Officeworks — stationery keyword, no specialist match",
    userType: "employee",
    tx: { normalizedMerchant: "Officeworks", description: "OFFICEWORKS STATIONERY", amount: -42.50 },
  },
  {
    label:    "Unknown merchant — software subscription keyword",
    userType: "sole_trader",
    tx: { normalizedMerchant: "Framer BV", description: "Framer subscription monthly", amount: -25.00 },
  },
  {
    label:    "Ambiguous rideshare — no work keyword",
    userType: "employee",
    tx: { normalizedMerchant: "Uber", description: "UBER TRIP", amount: -18.40 },
  },
  {
    label:    "Hardware store — keyword-only tool match",
    userType: "contractor",
    tx: { normalizedMerchant: "Bunnings", description: "BUNNINGS DRILL BIT SET", amount: -55.00 },
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

function fmt(val: unknown): string {
  return JSON.stringify(val, null, 2);
}

function diff(before: object, after: object): void {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<string>;
  const changed: string[] = [];

  for (const key of keys) {
    const a = (before as Record<string, unknown>)[key];
    const b = (after  as Record<string, unknown>)[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed.push(`  ${key}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    }
  }

  if (changed.length === 0) {
    console.log("  (no changes from Ollama)");
  } else {
    console.log(changed.join("\n"));
  }
}

async function run() {
  const ollamaEnabled = process.env.OLLAMA_ENABLED === "true";

  console.log("─".repeat(60));
  console.log(`Ollama enabled: ${ollamaEnabled}`);
  if (!ollamaEnabled) {
    console.log("Set OLLAMA_ENABLED=true in .env.local to see refinements.");
  }
  console.log("─".repeat(60) + "\n");

  for (const { label, userType, tx } of SAMPLES) {
    console.log(`▸ ${label}`);
    console.log(`  userType: ${userType}  |  merchant: ${tx.normalizedMerchant}  |  amount: ${tx.amount}`);

    const original = detectDeduction(tx, userType);

    if (!original) {
      console.log("  rules engine: no match\n");
      continue;
    }

    console.log(`  rules engine: ${original.confidence} — ${original.category}`);
    console.log(`    reason: "${original.reason}"`);
    if (original.confidenceReason) {
      console.log(`    confidenceReason: "${original.confidenceReason}"`);
    }

    const refined = await refineTransaction(original, tx, userType);

    console.log("  ollama diff:");
    diff(
      { confidence: original.confidence, category: original.category, reason: original.reason, mixedUse: original.mixedUse },
      { confidence: refined.confidence,  category: refined.category,  reason: refined.reason,  mixedUse: refined.mixedUse  },
    );

    console.log();
  }
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
