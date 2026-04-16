import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { CTAButton } from "@/components/shared/CTAButton";
import { FadeIn } from "@/components/ui/FadeIn";

const TRUST_NOTES = [
  "Free to import and review",
  "No credit card required",
  "Cancel anytime",
];

type Props = {
  heading?:    string;
  subheading?: string;
};

export function CTABanner({
  heading    = "Ready to find your deductions?",
  subheading = "Import your transactions and see what Kashio finds — for free.",
}: Props) {
  return (
    <Section>
      <FadeIn>
        <div
          className="rounded-3xl px-8 py-14 sm:px-14 sm:py-16 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(13,148,136,0.06))",
            border: "1px solid rgba(22,163,74,0.14)",
          }}
        >
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {heading}
          </h2>
          <p
            className="mt-3 text-base sm:text-lg max-w-md mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            {subheading}
          </p>

          <div className="mt-9">
            <CTAButton label="Start for free" size="lg" />
          </div>

          {/* Trust micro-copy */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {TRUST_NOTES.map((note) => (
              <span
                key={note}
                className="inline-flex items-center gap-1.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <ShieldCheck size={12} style={{ color: "var(--accent-green)" }} />
                {note}
              </span>
            ))}
          </div>

          <p className="mt-6 text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
            Kashio is not a tax adviser. Always verify deductions with your accountant before lodging.
          </p>
        </div>
      </FadeIn>
    </Section>
  );
}
