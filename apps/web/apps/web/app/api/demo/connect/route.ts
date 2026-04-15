import { NextResponse } from "next/server";
import { fromDemo } from "../../../../lib/ingestion/fromDemo";
import { runImportPipeline } from "../../../../lib/importPipeline";
import { getUserWithType } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getUserWithType();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: userId, userType } = user;

    const rows = fromDemo();
    const result = await runImportPipeline(rows, "Demo — simulated bank connection", "DEMO_BANK", userId, userType);

    return NextResponse.json({
      inserted:   result.inserted,
      duplicates: result.duplicates,
      flagged:    result.flagged,
      totalValue: result.totalValue,
      batchId:    result.batchId,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Demo import error:", detail);
    return NextResponse.json({ error: "Could not run demo import.", detail }, { status: 500 });
  }
}
