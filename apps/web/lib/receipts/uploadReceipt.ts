import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import {
  fetchUserPlan,
  isProUser,
  shouldShowReceiptPaywall,
  FREE_RECEIPT_LIMIT,
  PRO_RECEIPT_LIMIT,
} from "@/lib/plan";

const BUCKET        = "receipts";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// ── Result types ───────────────────────────────────────────────────────────────

export type UploadReceiptError =
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "PAYWALL_REQUIRED"
  | "UPLOAD_FAILED"
  | "DB_ERROR";

export type UploadedReceipt = {
  id:        string;
  userId:    string;
  fileUrl:   string;  // canonical storage URL — use createSignedUrl() for private bucket display
  filePath:  string;  // storage path: {userId}/{timestamp}-{filename} — pass to createSignedUrl()
  fileName:  string;
  fileSize:  number;
  mimeType:  string;
  createdAt: Date;
};

export type UploadReceiptResult =
  | { ok: true;  receipt: UploadedReceipt }
  | { ok: false; error: UploadReceiptError; message: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

// ── Main service ───────────────────────────────────────────────────────────────

/**
 * Upload a receipt file on behalf of an authenticated user.
 *
 * Server-side only — call from an API route after resolving the user with
 * getUser() / requireUser() from lib/auth.ts. Never call from client components.
 *
 * Storage path: receipts/{userId}/{timestamp}-{sanitized_filename}
 * Bucket is private — use supabase.storage.from("receipts").createSignedUrl(filePath, ttl)
 * to generate a temporary URL when you need to display the file.
 */
export async function uploadReceipt(
  file:   File,
  userId: string,
): Promise<UploadReceiptResult> {
  // ── 1. Validate ──────────────────────────────────────────────────────────────

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok:      false,
      error:   "INVALID_TYPE",
      message: "Only JPEG, PNG, WebP, and PDF files are accepted.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      ok:      false,
      error:   "FILE_TOO_LARGE",
      message: "File must be 5 MB or smaller.",
    };
  }

  // ── 2. Check plan + receipt count in parallel ─────────────────────────────────

  const [plan, count] = await Promise.all([
    fetchUserPlan(userId),
    db.receipt.count({ where: { userId } }),
  ]);

  if (shouldShowReceiptPaywall(plan, count)) {
    const limit = isProUser(plan) ? PRO_RECEIPT_LIMIT : FREE_RECEIPT_LIMIT;
    const tier  = isProUser(plan) ? "Pro" : "Free";
    return {
      ok:      false,
      error:   "PAYWALL_REQUIRED",
      message: `${tier} accounts are limited to ${limit} receipts.${!isProUser(plan) ? " Upgrade to upload more." : ""}`,
    };
  }

  // ── 3. Upload to Supabase Storage ────────────────────────────────────────────

  const sanitized   = sanitizeFilename(file.name);
  const storagePath = `${userId}/${Date.now()}-${sanitized}`;
  const bytes       = await file.arrayBuffer();
  const storage     = makeStorageClient();

  const { error: uploadError } = await storage.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert:      false,
    });

  if (uploadError) {
    console.error("[uploadReceipt] storage upload failed:", uploadError.message);
    return {
      ok:      false,
      error:   "UPLOAD_FAILED",
      message: "Upload failed. Please try again.",
    };
  }

  const { data: { publicUrl } } = storage.storage.from(BUCKET).getPublicUrl(storagePath);

  // ── 4. Persist to DB + increment counter ─────────────────────────────────────

  try {
    const [receipt] = await Promise.all([
      db.receipt.create({
        data: {
          userId,
          fileUrl:  publicUrl,
          filePath: storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      }),
      // Upsert handles users who don't yet have a UserProfile row.
      db.userProfile.upsert({
        where:  { userId },
        create: { userId, receiptCount: 1 },
        update: { receiptCount: { increment: 1 } },
      }),
    ]);

    return { ok: true, receipt };
  } catch (err) {
    console.error("[uploadReceipt] DB error:", err instanceof Error ? err.message : err);
    // Best-effort rollback — remove the storage object so it doesn't go out of sync.
    await storage.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    return {
      ok:      false,
      error:   "DB_ERROR",
      message: "Receipt saved to storage but the database write failed. Please contact support.",
    };
  }
}
