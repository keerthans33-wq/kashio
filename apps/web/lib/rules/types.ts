// The transaction fields a rule needs to make a decision.
export type TransactionInput = {
  description: string;
  normalizedMerchant: string;
  amount: number;
};

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

// What detect() returns: category, confidence, and structured signals
// that explain() can use to generate text.
export type RawMatch = {
  category:   string;
  confidence: Confidence;
  signals:    Record<string, string | boolean | undefined>;
};

// What explain() returns: human-readable text for the UI.
export type Explanation = {
  reason:            string;
  confidenceReason?: string;
};

// The full match surfaced to the rest of the app.
export type DeductionMatch = RawMatch & Explanation;

// A rule is an object with separate detection and explanation logic.
// priority is used as a final tie-breaker when confidence and signal count are equal.
// Higher value = preferred. Set based on category specificity.
export type Rule = {
  priority: number;
  detect:   (tx: TransactionInput) => RawMatch | null;
  explain:  (match: RawMatch, tx: TransactionInput) => Explanation;
};
