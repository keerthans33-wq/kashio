"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/auth";

export async function addWfhEntry(
  date: string,
  hours: number,
  note: string,
): Promise<{ error: string } | undefined> {
  const userId = await requireUser();

  // Server-side validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Invalid date." };
  }

  // No future dates — compare YYYY-MM-DD strings in local time
  const today = new Date().toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD
  if (date > today) {
    return { error: "Date cannot be in the future." };
  }

  if (!Number.isFinite(hours) || hours <= 0 || hours > 16) {
    return { error: "Hours must be between 0.5 and 16." };
  }

  // Prevent duplicate entries for the same day
  const existing = await db.wfhLog.findFirst({ where: { userId, date } });
  if (existing) {
    return { error: "You already have an entry for this date." };
  }

  await db.wfhLog.create({
    data: { userId, date, hours, note: note || null },
  });
  revalidatePath("/wfh");
}

export async function deleteWfhEntry(id: string) {
  const userId = await requireUser();
  // userId check prevents deleting another user's entry
  await db.wfhLog.delete({ where: { id, userId } });
  revalidatePath("/wfh");
}
