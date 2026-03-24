// The transaction fields a rule needs to make a decision.
// Using a lightweight type here keeps rules independent of the database layer.
export type TransactionInput = {
  description: string;
  normalizedMerchant: string;
  amount: number;
};

// What a rule returns when it finds a match.
export type DeductionMatch = {
  category: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
};

// A rule is a pure function: given a transaction, return a match or null.
export type Rule = (transaction: TransactionInput) => DeductionMatch | null;
