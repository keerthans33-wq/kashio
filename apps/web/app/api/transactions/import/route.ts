import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { normalizeMerchant } from "../../../../lib/normalizeMerchant";

function parseAmountStrict(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isValidIsoDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { transactions?: unknown }).transactions)
  ) {
    return NextResponse.json({ error: "No transactions provided." }, { status: 400 });
  }

  const raw = (body as { transactions: unknown[] }).transactions;
  if (raw.length === 0) {
    return NextResponse.json({ error: "No transactions provided." }, { status: 400 });
  }

  const rows: { date: string; description: string; normalizedMerchant: string; amount: number }[] =
    [];

  for (const t of raw) {
    if (typeof t !== "object" || t === null) {
      return NextResponse.json({ error: "Invalid transaction format." }, { status: 400 });
    }

    const { date, description, amount } = t as Record<string, unknown>;

    if (typeof date !== "string" || !isValidIsoDate(date)) {
      return NextResponse.json(
        { error: `Invalid date: "${date}". Expected YYYY-MM-DD.` },
        { status: 400 },
      );
    }

    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Missing or empty description." }, { status: 400 });
    }

    const parsedAmount = parseAmountStrict(amount);
    if (parsedAmount === null) {
      return NextResponse.json(
        { error: `Invalid amount: "${amount}".` },
        { status: 400 },
      );
    }

    rows.push({
      date,
      description: description.trim(),
      normalizedMerchant: normalizeMerchant(description.trim()),
      amount: parsedAmount,
    });
  }

  const result = await db.transaction.createMany({ data: rows, skipDuplicates: true });

  return NextResponse.json({
    imported: result.count,
    duplicates: rows.length - result.count,
  });
}
