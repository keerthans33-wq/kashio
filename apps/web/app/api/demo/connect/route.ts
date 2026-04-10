// POST /api/demo/connect
//
// Simulates a bank connection by loading a hardcoded sample dataset and
// running it through the same import pipeline as the real CSV and Basiq flows.

import { NextResponse } from "next/server";
import { fromDemo } from "../../../../lib/ingestion/fromDemo";
import { runImportPipeline } from "../../../../lib/importPipeline";
import { getUserWithType } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getUserWithType();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: userId, userType } = user;

  const rows = fromDemo();

  try {
    const result = await runImportPipeline(rows, "Demo — simulated bank connection", "DEMO_BANK", userId, userType);
    return NextResponse.json({
      inserted:   result.inserted,
      duplicates: result.duplicates,
      flagged:    result.flagged,
      totalValue: result.totalValue,
      batchId:    result.batchId,
      _debug_userId: userId,
    });
  } catch (err) {
    console.error("Demo import error:", err);
    return NextResponse.json(
      { error: "Could not run demo import.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
