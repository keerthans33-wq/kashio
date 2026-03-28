import { parseDate, parseAmount } from "../importRules";
import { normalizeMerchant } from "../normalizeMerchant";
import type { BasiqTransaction } from "./client";

export type MappedTransaction = {
  date: string;             // YYYY-MM-DD — validated by parseDate
  description: string;
  normalizedMerchant: string;
  amount: number;           // negative = debit (money out), positive = credit (money in)
};

export function mapBasiqTransaction(tx: BasiqTransaction): MappedTransaction | null {
  // Validate and normalise the date using the same function as the CSV pipeline.
  // parseDate accepts YYYY-MM-DD (what Basiq returns) and DD/MM/YYYY.
  const date = parseDate(tx.postDate);
  if (!date) return null;

  // Validate and parse the amount using the same function as the CSV pipeline.
  // parseAmount handles strings with "$", "," etc. as well as plain "-42.50".
  let amount = parseAmount(tx.amount);
  if (amount === null) return null;

  // Basiq may return amounts as unsigned values. Use the direction field to
  // ensure debits (money out) are negative and credits (money in) are positive,
  // matching our schema convention.
  if (tx.direction === "debit"   && amount > 0) amount = -amount;
  if (tx.direction === "credit"  && amount < 0) amount = Math.abs(amount);

  const description = tx.description?.trim();
  if (!description) return null;

  // Use the Basiq-resolved merchant name if available; otherwise normalise the
  // raw bank description — same approach as the CSV import route.
  const merchantSource = tx.merchant?.businessName?.trim() || description;

  return {
    date,
    description,
    normalizedMerchant: normalizeMerchant(merchantSource),
    amount,
  };
}
