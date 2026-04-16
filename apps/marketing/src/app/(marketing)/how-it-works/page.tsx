import type { Metadata } from "next";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CTABanner } from "@/components/marketing/CTABanner";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Learn how Kashio turns your bank transactions into a tax-ready deduction summary in four simple steps.",
};

const WHY = [
  {
    title:   "Why we use plain English",
    body:    "Most tax tools tell you what to do but not why. Kashio explains why each transaction was flagged so you can make an informed decision — not just click confirm and hope for the best.",
  },
  {
    title:   "Why we keep you in control",
    body:    "Kashio never automatically claims anything. Every suggestion goes through your review. You confirm what's genuinely yours, reject what isn't, and export only when you're ready.",
  },
  {
    title:   "Why the export matters",
    body:    "A clean, formatted summary is what your accountant actually needs. Kashio's export replaces the spreadsheet you'd otherwise spend hours building — and it's accurate because you reviewed every line.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <AuroraBackground intensity="subtle" />

      {/* Page header */}
      <Section className="pt-32 pb-0">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto">
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              How Kashio works
            </h1>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              Four steps from raw bank data to a tax-ready summary.
            </p>
          </div>
        </FadeIn>
      </Section>

      <HowItWorks detailed />

      {/* Why section */}
      <Section>
        <FadeIn>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Built on principles, not guesswork
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHY.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <div
                className="rounded-2xl p-6 border h-full"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--bg-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <h3 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {item.body}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      <CTABanner
        heading="See it for yourself"
        subheading="Import a statement and find your deductions in minutes."
      />
    </>
  );
}
