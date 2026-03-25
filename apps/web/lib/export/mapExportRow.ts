// Maps a confirmed deduction candidate (with its transaction) into a
// flat export row. Both the export API route and the preview table use
// this so the shape is defined in exactly one place.

export type ExportRow = {
  date:               string;
  merchant:           string;
  description:        string;
  amount:             number;   // positive — stored as absolute value
  category:           string;
  confidence:         string;
  reason:             string;
};

type TransactionFields = {
  date:               string;
  normalizedMerchant: string;
  description:        string;
  amount:             number;
};

type CandidateFields = {
  category:   string;
  confidence: string;
  reason:     string;
  transaction: TransactionFields;
};

export function mapExportRow(candidate: CandidateFields): ExportRow {
  return {
    date:        candidate.transaction.date,
    merchant:    candidate.transaction.normalizedMerchant,
    description: candidate.transaction.description,
    amount:      Math.abs(candidate.transaction.amount),
    category:    candidate.category,
    confidence:  candidate.confidence,
    reason:      candidate.reason,
  };
}
