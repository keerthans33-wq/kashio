import { Section } from "@/components/layout/Section";
import { CTAButton } from "@/components/shared/CTAButton";
import { FadeIn } from "@/components/ui/FadeIn";

type Props = {
  heading?:    string;
  subheading?: string;
};

export function CTABanner({
  heading    = "Ready to find your deductions?",
  subheading = "Start for free — no credit card required.",
}: Props) {
  return (
    <Section>
      <FadeIn>
        <div
          className="rounded-3xl p-10 sm:p-14 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(13,148,136,0.06))",
            border: "1px solid rgba(22,163,74,0.15)",
          }}
        >
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {heading}
          </h2>
          <p className="mt-3 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
            {subheading}
          </p>
          <div className="mt-8">
            <CTAButton label="Get started free" size="lg" />
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}
