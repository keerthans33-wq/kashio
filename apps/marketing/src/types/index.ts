export type FAQItem = {
  question: string;
  answer:   string;
};

export type PricingTier = {
  name:        string;
  price:       string;
  period?:     string;
  description: string;
  features:    string[];
  cta:         string;
  highlighted: boolean;
};

export type Feature = {
  icon:        string;
  title:       string;
  description: string;
};
