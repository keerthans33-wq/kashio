"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";

export async function confirmCandidate(id: string) {
  await db.deductionCandidate.update({ where: { id }, data: { status: "CONFIRMED" } });
  revalidatePath("/review");
}

export async function rejectCandidate(id: string) {
  await db.deductionCandidate.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/review");
}

export async function resetCandidate(id: string) {
  await db.deductionCandidate.update({ where: { id }, data: { status: "NEEDS_REVIEW" } });
  revalidatePath("/review");
}

export async function bulkConfirmCandidates(ids: string[]) {
  await db.deductionCandidate.updateMany({ where: { id: { in: ids } }, data: { status: "CONFIRMED" } });
  revalidatePath("/review");
}

export async function bulkRejectCandidates(ids: string[]) {
  await db.deductionCandidate.updateMany({ where: { id: { in: ids } }, data: { status: "REJECTED" } });
  revalidatePath("/review");
}

export async function bulkResetCandidates(ids: string[]) {
  await db.deductionCandidate.updateMany({ where: { id: { in: ids } }, data: { status: "NEEDS_REVIEW" } });
  revalidatePath("/review");
}
