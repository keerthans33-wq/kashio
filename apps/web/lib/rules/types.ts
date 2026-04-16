// The transaction fields a rule needs to make a decision.
export type TransactionInput = {
  description: string;
  normalizedMerchant: string;
  amount: number;
};

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

// What detect() returns: category, confidence, and structured signals
// that explain() can use to generate text.
//
// canUpgrade: when false, the user-type +1 confidence bump is skipped.
// Set to false on lone-signal / ambiguous branches so weak evidence stays LOW
// for business users rather than being inflated to MEDIUM.
export type RawMatch = {
  category:    string;
  confidence:  Confidence;
  signals:     Record<string, string | boolean | undefined>;
  canUpgrade?: boolean;
};

// What explain() returns: human-readable text for the UI.
// mixedUse: true signals the UI to show a "may include personal use" warning.
export type Explanation = {
  reason:            string;
  confidenceReason?: string;
  mixedUse?:         boolean;
};

// The full match surfaced to the rest of the app.
export type DeductionMatch = RawMatch & Explanation;

// A rule is an object with separate detection and explanation logic.
// priority is used as a final tie-breaker when confidence and signal count are equal.
// Higher value = preferred. Set based on category specificity.
export type Rule = {
  priority: number;
  detect:   (tx: TransactionInput, userType?: string | null) => RawMatch | null;
  explain:  (match: RawMatch, tx: TransactionInput, userType?: string | null) => Explanation;
};
