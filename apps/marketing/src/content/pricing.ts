import type { PricingTier } from "@/types";

export const pricingTiers: PricingTier[] = [
  {
    name:        "Free",
    price:       "$0",
    description: "Everything you need to find and review your deductions.",
    features: [
      "Import bank statement CSVs",
      "Automatic deduction detection",
      "Plain-English explanations",
      "Work from home hour tracker",
      "Confirm or reject each deduction",
      "Add evidence notes",
    ],
    cta:         "Get started free",
    highlighted: false,
  },
  {
    name:        "Premium",
    price:       "$19",
    period:      "per tax year",
    description: "Export a polished summary when you're ready to lodge.",
    features: [
      "Everything in Free",
      "Export your full tax summary",
      "Accountant-ready deduction report",
      "WFH deduction calculation included",
      "Print-ready PDF format",
      "Priority support",
    ],
    cta:         "Get Premium",
    highlighted: true,
  },
];
