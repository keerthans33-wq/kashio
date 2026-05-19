"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

export async function confirmCandidate(id: string) {
  const userId = await requireUser();
  await db.deductionCandidate.update({ where: { id, userId }, data: { status: "CONFIRMED" } });
  revalidatePath("/review");
}

export async function rejectCandidate(id: string) {
  const userId = await requireUser();
  await db.deductionCandidate.update({ where: { id, userId }, data: { status: "REJECTED" } });
  revalidatePath("/review");
}

export async function resetCandidate(id: string) {
  const userId = await requireUser();
  await db.deductionCandidate.update({ where: { id, userId }, data: { status: "NEEDS_REVIEW" } });
  revalidatePath("/review");
}

export async function bulkConfirmCandidates(ids: string[]) {
  const userId = await requireUser();
  await db.deductionCandidate.updateMany({ where: { id: { in: ids }, userId }, data: { status: "CONFIRMED" } });
  revalidatePath("/review");
}

export async function bulkRejectCandidates(ids: string[]) {
  const userId = await requireUser();
  await db.deductionCandidate.updateMany({ where: { id: { in: ids }, userId }, data: { status: "REJECTED" } });
  revalidatePath("/review");
}

export async function bulkResetCandidates(ids: string[]) {
  const userId = await requireUser();
  await db.deductionCandidate.updateMany({ where: { id: { in: ids }, userId }, data: { status: "NEEDS_REVIEW" } });
  revalidatePath("/review");
}

export async function saveEvidence(id: string, hasEvidence: boolean, evidenceNote: string) {
  const userId = await requireUser();
  await db.deductionCandidate.update({
    where: { id, userId },
    data:  { hasEvidence, evidenceNote: evidenceNote.trim() || null },
  });
  revalidatePath("/review");
  revalidatePath("/export");
}

export async function saveWorkPercent(id: string, workPercent: number | null) {
  const userId = await requireUser();
  await db.deductionCandidate.update({
    where: { id, userId },
    data:  { workPercent },
  });
  revalidatePath("/review");
}

export async function confirmWithDetails(id: string, workPercent: number | null) {
  const userId = await requireUser();
  await db.deductionCandidate.update({
    where: { id, userId },
    data:  { status: "CONFIRMED", workPercent },
  });
  revalidatePath("/review");
}

/** Confirm all remaining NEEDS_REVIEW candidates with the same merchant name. Returns count confirmed. */
export async function confirmSimilarByMerchant(merchantName: string, workPercent: number | null): Promise<number> {
  const userId = await requireUser();
  const matching = await db.deductionCandidate.findMany({
    where:   { userId, status: "NEEDS_REVIEW" },
    include: { transaction: { select: { normalizedMerchant: true } } },
  });
  const ids = matching
    .filter((c) => c.transaction.normalizedMerchant === merchantName)
    .map((c) => c.id);
  if (ids.length > 0) {
    await db.deductionCandidate.updateMany({
      where: { id: { in: ids }, userId },
      data:  { status: "CONFIRMED", workPercent },
    });
  }
  revalidatePath("/review");
  return ids.length;
}
