// The single normalized shape every source must produce before hitting the pipeline.
// No matter where transactions come from (CSV, demo, Basiq), they all become this.

export type IngestionRow = {
  date: string;               // YYYY-MM-DD
  description: string;        // raw bank description, trimmed
  normalizedMerchant: string; // cleaned merchant name (from normalizeMerchant)
  amount: number;             // negative = debit (money out), positive = credit (money in)
};
