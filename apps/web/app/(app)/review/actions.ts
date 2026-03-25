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
