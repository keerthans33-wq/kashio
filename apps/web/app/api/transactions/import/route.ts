import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { normalizeMerchant } from "../../../../lib/normalizeMerchant";
import type { ValidRow } from "../../../../lib/validateCsv";

export async function POST(req: NextRequest) {
  let transactions: ValidRow[];

  try {
    const body = await req.json();
    transactions = body.transactions;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "No transactions provided." }, { status: 400 });
  }

  const rows = transactions.map((t) => ({
    date: t.date,
    description: t.description,
    normalizedMerchant: normalizeMerchant(t.description),
    amount: parseFloat(t.amount),
  }));

  const result = await db.transaction.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return NextResponse.json({ imported: result.count });
}
