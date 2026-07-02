import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// DELETE /api/account/delete
// Permanently deletes all data for the authenticated user, then deletes the
// Supabase auth record. The service role key never leaves this server-side route.
// Accepts both cookie-based auth (web) and Bearer token auth (mobile).
export async function DELETE(request: Request) {
  // Cookie auth (web)
  let userId = await getUser();

  // Bearer token auth (mobile)
  if (!userId) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        const { data: { user } } = await client.auth.getUser(token);
        userId = user?.id ?? null;
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = makeAdminClient();

    // ── 1. Collect receipt storage paths via storage listing (not Prisma) ───
    // receipts.user_id → auth.users.id has ON DELETE CASCADE, so rows are
    // removed automatically when deleteUser() fires. We only need the storage
    // paths here so we can wipe the files from the bucket first.
    const { data: storageFiles } = await admin.storage
      .from("receipts")
      .list(userId);
    const storagePaths = (storageFiles ?? []).map((f) => `${userId}/${f.name}`);

    // ── 2. Delete Prisma DB rows in FK-safe order ────────────────────────────
    // DeductionCandidate.transactionId → Transaction (RESTRICT by default),
    // so candidates must be deleted before transactions.
    await db.deductionCandidate.deleteMany({ where: { userId } });
    await db.transaction.deleteMany({ where: { userId } });
    await db.importBatch.deleteMany({ where: { userId } });

    // Independent tables — run concurrently.
    // Note: receipts rows are NOT deleted here — the ON DELETE CASCADE on
    // receipts.user_id → auth.users.id means deleteUser() (step 4) handles it.
    await Promise.all([
      db.wfhLog.deleteMany({ where: { userId } }),
      db.payment.deleteMany({ where: { userId } }),
      db.userEntitlement.deleteMany({ where: { userId } }),
      db.bankConnection.deleteMany({ where: { userId } }),
    ]);

    // UserProfile last (other models may reference it indirectly via userId)
    await db.userProfile.deleteMany({ where: { userId } });

    // ── 2b. Delete the Supabase public.profiles row (created by old trigger) ──
    // The old on_auth_user_created trigger wrote to public.profiles.
    // If that table has a FK to auth.users without CASCADE, deleteUser() will
    // fail with a FK violation unless we clear the row first.
    await admin.from("profiles").delete().eq("id", userId);

    // ── 3. Delete receipt files from private storage bucket ──────────────────
    if (storagePaths.length > 0) {
      for (let i = 0; i < storagePaths.length; i += 200) {
        const { error } = await admin.storage
          .from("receipts")
          .remove(storagePaths.slice(i, i + 200));
        if (error) {
          console.error("[account/delete] storage batch remove error:", error.message);
        }
      }
    }

    // ── 4. Delete the Supabase auth user ────────────────────────────────────
    // This also cascades to delete the receipts table rows (via FK CASCADE).
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error("[account/delete] auth.admin.deleteUser error:", authErr.message);
      return NextResponse.json(
        { error: `Auth deletion failed: ${authErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[account/delete] unexpected error:", msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
