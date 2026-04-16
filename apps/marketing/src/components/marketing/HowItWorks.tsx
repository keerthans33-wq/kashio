import { Fragment } from "react";
import { Upload, ListChecks, FileDown, ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";

const HOME_STEPS = [
  {
    icon:        Upload,
    n:           "01",
    title:       "Import your transactions",
    description: "Upload a bank statement CSV or connect your bank. Kashio reads the format automatically and processes every transaction — no manual mapping.",
  },
  {
    icon:        ListChecks,
    n:           "02",
    title:       "Review what Kashio found",
    description: "Each flagged transaction comes with a plain-English reason and a confidence level. Confirm what applies to you, skip what doesn't. Log your WFH days while you're here.",
  },
  {
    icon:        FileDown,
    n:           "03",
    title:       "Export your tax summary",
    description: "When you're done, export a clean, formatted summary — deductions by category, totals, WFH calculation included. Ready to hand to your accountant.",
  },
];

const FULL_STEPS = [
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
  if (detailed) {
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
          {FULL_STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.08}>
              <div
                className="relative flex flex-col gap-4 rounded-2xl p-6 border h-full"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--bg-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-teal))" }}
                >
                  {step.n}
                </span>
                <div>
                  <h3 className="font-semibold text-base mb-1.5" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>
    );
  }

  /* ── Homepage variant — 3 steps, horizontal flow ─────────────── */
  return (
    <Section id="how-it-works">
      <FadeIn>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Three steps to tax clarity
          </h2>
          <p className="mt-3 text-base sm:text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            From raw bank data to an accountant-ready summary.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-0 items-start">
        {HOME_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Fragment key={step.n}>
              <FadeIn delay={i * 0.12}>
                <div
                  className="flex flex-col gap-5 rounded-2xl p-7 border h-full"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--bg-border)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {/* Step number + icon */}
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.12), rgba(13,148,136,0.08))" }}
                    >
                      <Icon size={22} style={{ color: "var(--accent-green)" }} />
                    </div>
                    <span
                      className="text-4xl font-bold tabular-nums leading-none"
                      style={{ color: "var(--bg-border)" }}
                    >
                      {step.n}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeIn>

              {/* Arrow connector — hidden on mobile, shown between steps on md+ */}
              {i < HOME_STEPS.length - 1 && (
                <div
                  className="hidden md:flex items-center justify-center px-3 pt-8"
                  style={{ color: "var(--bg-border)" }}
                >
                  <ArrowRight size={20} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </Section>
  );
}
