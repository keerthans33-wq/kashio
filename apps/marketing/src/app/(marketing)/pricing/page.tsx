import type { Metadata } from "next";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import type { FAQItem } from "@/types";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Kashio is free to use all year. Pay once to export your final tax summary when you're ready to lodge.",
};

const PRICING_FAQS: FAQItem[] = [
  {
    question: "When do I pay?",
    answer:
      "Only when you're ready to export. You can import transactions, review deductions, and track WFH hours for free all year — there's nothing to pay until you want the final summary.",
  },
  {
    question: "Is the $19 per year or one-time?",
    answer:
      "It's $19 per tax year. Each financial year you can start fresh with a new import, and export your summary when you're ready.",
  },
  {
    question: "What if I'm not happy with the export?",
    answer:
      "Get in touch and we'll sort it out. If the export doesn't meet your expectations, we'll refund you.",
  },
  {
    question: "Are there any other fees?",
    answer:
      "No. The Free tier is genuinely free — no trial, no credit card, no expiry. Premium is a flat $19 per tax year with no recurring charges.",
  },
];

export default function PricingPage() {
  return (
    <>
      <AuroraBackground intensity="subtle" />

      <Section className="pt-32 pb-0">
        <FadeIn>
          <div className="text-center max-w-xl mx-auto">
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Pricing
            </h1>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              Free to use. Pay only when you export.
            </p>
          </div>
        </FadeIn>
      </Section>

      <PricingSection />

      <FAQSection
        items={PRICING_FAQS}
        heading="Pricing questions"
      />

      <CTABanner
        heading="Start for free today"
        subheading="No credit card. No trial. Just your deductions."
      />
    </>
  );
}
