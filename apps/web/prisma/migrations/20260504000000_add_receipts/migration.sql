-- Add receipt_count to UserProfile (safe if column already exists)
ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "receiptCount" INTEGER NOT NULL DEFAULT 0;

-- ── receipts ──────────────────────────────────────────────────────────────────

CREATE TABLE "receipts" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL,
  "file_url"   TEXT        NOT NULL,
  "file_path"  TEXT        NOT NULL,
  "file_name"  TEXT        NOT NULL,
  "file_size"  INTEGER     NOT NULL,
  "mime_type"  TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX "receipts_user_id_idx" ON "receipts"("user_id");

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select_own"
  ON "receipts" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "receipts_insert_own"
  ON "receipts" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipts_delete_own"
  ON "receipts" FOR DELETE
  USING (auth.uid() = user_id);
