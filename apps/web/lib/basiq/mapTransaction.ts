import { normalizeMerchant } from "../normalizeMerchant";
import type { BasiqTransaction } from "./client";

export type MappedTransaction = {
  date: string;             // YYYY-MM-DD
  description: string;
  normalizedMerchant: string;
  amount: number;           // negative = debit (money out), positive = credit (money in)
};

export function mapBasiqTransaction(tx: BasiqTransaction): MappedTransaction | null {
  // Skip anything without a date or description.
  if (!tx.postDate || !tx.description?.trim()) return null;

  let amount = parseFloat(tx.amount);
  if (!isFinite(amount)) return null;

  // Basiq may return amounts as unsigned values. Use the direction field to
  // ensure debits (money out) are negative and credits (money in) are positive.
  if (tx.direction === "debit"   && amount > 0) amount = -amount;
  if (tx.direction === "credit"  && amount < 0) amount = Math.abs(amount);

  const description = tx.description.trim();

  // Use the merchant business name if Basiq resolved one; otherwise fall back
  // to normalizing the raw bank description.
  const merchantSource = tx.merchant?.businessName?.trim() || description;

  return {
    date: tx.postDate,
    description,
    normalizedMerchant: normalizeMerchant(merchantSource),
    amount,
  };
}
