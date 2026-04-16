import type { Metadata } from "next";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to common questions about how Kashio works, who it's for, and how we handle your data.",
};

export default function FAQsPage() {
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
              Frequently asked questions
            </h1>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              Everything you need to know about Kashio.
            </p>
          </div>
        </FadeIn>
      </Section>

      <FAQSection />

      <CTABanner
        heading="Still have questions?"
        subheading="Get in touch — we're happy to help."
      />
    </>
  );
}
