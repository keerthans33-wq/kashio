import { X, Check } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";

const PAIN = [
  "Scrolling through hundreds of transactions manually",
  "Guessing which expenses might be claimable",
  "Building messy spreadsheets at the last minute",
  "Missing deductions you didn't know you could claim",
];

const SOLUTION = [
  "Every transaction scanned automatically — nothing missed",
  "Each suggestion explained in plain English",
  "One clean summary, ready when tax time arrives",
  "Rules tuned to your exact user type",
];

export function ProblemSolution() {
  return (
    <Section>
      <FadeIn>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Tax time shouldn't require a spreadsheet
          </h2>
          <p
            className="mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Most Australians leave money on the table every year — not because they don't have deductions, but because finding them takes too long.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Without Kashio */}
        <FadeIn delay={0.08}>
          <div
            className="rounded-2xl p-7 border h-full"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-border)", boxShadow: "var(--shadow-card)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: "var(--text-muted)" }}
            >
              Without Kashio
            </p>
            <ul className="flex flex-col gap-4">
              {PAIN.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)" }}
                  >
                    <X size={11} style={{ color: "#ef4444" }} />
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        {/* With Kashio */}
        <FadeIn delay={0.16}>
          <div
            className="rounded-2xl p-7 border h-full"
            style={{
              backgroundColor: "rgba(22,163,74,0.03)",
              borderColor: "rgba(22,163,74,0.18)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: "var(--accent-green)" }}
            >
              With Kashio
            </p>
            <ul className="flex flex-col gap-4">
              {SOLUTION.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5"
                    style={{ backgroundColor: "rgba(22,163,74,0.12)" }}
                  >
                    <Check size={11} style={{ color: "var(--accent-green)" }} />
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

      </div>
    </Section>
  );
}
