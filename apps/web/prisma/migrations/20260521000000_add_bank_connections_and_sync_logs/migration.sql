-- ─────────────────────────────────────────────────────────────────────────────
-- Add bank_connections and bank_sync_logs; extend Transaction for bank data.
-- Migrates existing BasiqConnection rows into bank_connections, then drops it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. bank_connections ─────────────────────────────────────────────────────
-- Generalised bank-connection record that replaces the minimal BasiqConnection
-- table. Keyed by (user_id, provider) so the same user can connect multiple
-- providers in the future without a schema change.

CREATE TABLE "bank_connections" (
  "id"               TEXT        NOT NULL,
  "user_id"          TEXT        NOT NULL,
  "provider"         TEXT        NOT NULL DEFAULT 'basiq',
  "basiq_user_id"    TEXT,                              -- null for non-Basiq providers
  "status"           TEXT        NOT NULL DEFAULT 'active', -- active | disconnected | error
  "institution_name" TEXT,
  "last_sync_at"     TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

-- One active connection per (user, provider). Covered by the unique index below;
-- no separate userId index needed — Postgres uses the leading column of a
-- composite index for single-column lookups.
CREATE UNIQUE INDEX "bank_connections_user_provider_key"
  ON "bank_connections" ("user_id", "provider");

-- A Basiq user ID belongs to exactly one Kashio user — prevent the same bank
-- account from being linked to two different accounts.
-- Partial so that non-Basiq connections (basiq_user_id IS NULL) are never compared.
CREATE UNIQUE INDEX "bank_connections_basiq_user_id_key"
  ON "bank_connections" ("basiq_user_id")
  WHERE "basiq_user_id" IS NOT NULL;

-- ─── 2. Migrate BasiqConnection → bank_connections ───────────────────────────
-- Copy all existing rows so no one loses their linked bank account.

INSERT INTO "bank_connections"
  ("id", "user_id", "provider", "basiq_user_id", "status", "created_at", "updated_at")
SELECT
  "id",
  "userId"      AS "user_id",
  'basiq'       AS "provider",
  "basiqUserId" AS "basiq_user_id",
  'active'      AS "status",
  "createdAt"   AS "created_at",
  "createdAt"   AS "updated_at"
FROM "BasiqConnection";

-- Safe to drop now that all rows are in bank_connections.
DROP TABLE "BasiqConnection";

-- ─── 3. bank_sync_logs ───────────────────────────────────────────────────────
-- One row per sync attempt; FK to bank_connections with cascade delete so logs
-- are cleaned up automatically if a connection is removed.

CREATE TABLE "bank_sync_logs" (
  "id"                    TEXT        NOT NULL,
  "user_id"               TEXT        NOT NULL,
  "connection_id"         TEXT        NOT NULL,
  "status"                TEXT        NOT NULL DEFAULT 'started', -- started | success | error
  "message"               TEXT,
  "transactions_imported" INT         NOT NULL DEFAULT 0,
  "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at"          TIMESTAMPTZ,
  CONSTRAINT "bank_sync_logs_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "bank_sync_logs_connection_fkey" FOREIGN KEY ("connection_id")
    REFERENCES "bank_connections" ("id") ON DELETE CASCADE
);

CREATE INDEX "bank_sync_logs_user_id_idx"       ON "bank_sync_logs" ("user_id");
CREATE INDEX "bank_sync_logs_connection_id_idx" ON "bank_sync_logs" ("connection_id");

-- ─── 4. Extend Transaction with bank-specific columns ─────────────────────────
-- All new columns are nullable — existing CSV rows are completely unaffected.
-- Column names follow the camelCase convention already used by Transaction
-- (Prisma maps field names directly to DB column names without @map here).
--
-- Intentionally omitted:
--   merchant_clean   normalizedMerchant already stores the cleaned name, using
--                    Basiq's merchant.businessName when available for BASIQ rows.
--   source enum      The existing CSV | DEMO_BANK | BASIQ enum already covers the
--                    'csv' | 'bank' distinction. No schema change needed.

ALTER TABLE "Transaction"
  ADD COLUMN "providerTransactionId" TEXT,
  ADD COLUMN "rawProviderData"       JSONB,
  ADD COLUMN "isPending"             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "accountId"             TEXT,
  ADD COLUMN "transactionHash"       TEXT;

-- Partial unique indexes — only enforced when the column is non-null, so CSV
-- rows (which will never have a provider ID or hash) are never blocked.

-- Primary dedup guard: one Basiq transaction ID per user.
CREATE UNIQUE INDEX "Transaction_user_providerTxn_unique"
  ON "Transaction" ("userId", "providerTransactionId")
  WHERE "providerTransactionId" IS NOT NULL;

-- Secondary content-based dedup: one hash per user, for cases where the
-- provider ID is unavailable (e.g. scraped data, future providers).
CREATE UNIQUE INDEX "Transaction_user_hash_unique"
  ON "Transaction" ("userId", "transactionHash")
  WHERE "transactionHash" IS NOT NULL;
