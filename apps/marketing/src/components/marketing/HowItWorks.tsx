import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";

const STEPS = [
  {
    n:           "1",
    title:       "Import your transactions",
    description: "Upload a bank statement CSV or connect your bank. Kashio supports all major Australian banks and automatically detects column formats.",
  },
  {
    n:           "2",
    title:       "Review possible deductions",
    description: "Kashio flags transactions that may be claimable and explains why — in plain English. Confirm or reject each one with a single tap.",
  },
  {
    n:           "3",
    title:       "Track work from home hours",
    description: "Log the days you worked from home. Kashio calculates your potential WFH deduction using the ATO's fixed-rate method.",
  },
  {
    n:           "4",
    title:       "Export your tax summary",
    description: "Get a clean, accountant-ready report of your confirmed deductions. Print it or share it directly — no spreadsheets needed.",
  },
];

type Props = {
  detailed?: boolean;
};

export function HowItWorks({ detailed }: Props) {
  return (
    <Section id="how-it-works">
      <FadeIn>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            How it works
          </h2>
          <p className="mt-3 text-base sm:text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Four steps from raw transactions to a tax-ready summary.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((step, i) => (
          <FadeIn key={step.n} delay={i * 0.08}>
            <div
              className="relative flex flex-col gap-4 rounded-2xl p-6 border h-full"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--bg-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* Step number */}
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-teal))" }}
              >
                {step.n}
              </span>

              <div>
                <h3
                  className="font-semibold text-base mb-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {step.title}
                </h3>
                {detailed && (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {step.description}
                  </p>
                )}
                {!detailed && (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {step.description.split(".")[0]}.
                  </p>
                )}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
