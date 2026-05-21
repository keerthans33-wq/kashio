import { createHash } from "crypto";
import { parseDate, parseAmount } from "../importRules";
import { normalizeMerchant } from "../normalizeMerchant";
import type { BasiqTransaction } from "./client";

export type MappedTransaction = {
  date: string;
  description: string;
  normalizedMerchant: string;
  amount: number;
  // Bank-specific — populated by Basiq rows, absent from CSV rows.
  providerTransactionId: string;
  rawProviderData: Record<string, unknown>;
  accountId: string | null;
  isPending: boolean;
  // Stable content hash — fallback dedup key when providerTransactionId alone isn't enough.
  // Scoped to user at the DB level via partial unique index WHERE NOT NULL.
  transactionHash: string;
};

export function mapBasiqTransaction(tx: BasiqTransaction): MappedTransaction | null {
  const date = parseDate(tx.postDate);
  if (!date) return null;

  let amount = parseAmount(tx.amount);
  if (amount === null) return null;

  // Basiq may return unsigned amounts; use direction to ensure the correct sign.
  if (tx.direction === "debit"  && amount > 0) amount = -amount;
  if (tx.direction === "credit" && amount < 0) amount = Math.abs(amount);

  const description = tx.description?.trim();
  if (!description) return null;

  const merchantSource = tx.merchant?.businessName?.trim() || description;

  const transactionHash = createHash("sha256")
    .update(`${date}|${amount}|${description}`)
    .digest("hex");

  return {
    date,
    description,
    normalizedMerchant: normalizeMerchant(merchantSource),
    amount,
    providerTransactionId: tx.id,
    rawProviderData: tx as Record<string, unknown>,
    accountId: tx.account ?? null,
    isPending: tx.status !== "posted",
    transactionHash,
  };
}
