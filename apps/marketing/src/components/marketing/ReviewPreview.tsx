import { CheckCircle2, Clock, Check } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";

const ROWS = [
  {
    merchant:    "Adobe Creative Cloud",
    amount:      "$54.99",
    category:    "Software",
    confidence:  "HIGH" as const,
    explanation: "Matches subscription software keywords — claimable for contractors and sole traders.",
    confirmed:   true,
  },
  {
    merchant:    "Officeworks",
    amount:      "$89.00",
    category:    "Office supplies",
    confidence:  "MEDIUM" as const,
    explanation: "Matched office supply merchant. Confirm if purchased for work use.",
    confirmed:   false,
  },
  {
    merchant:    "Telstra",
    amount:      "$120.00",
    category:    "Phone & internet",
    confidence:  "HIGH" as const,
    explanation: "Telecommunications provider — work portion may be claimable.",
    confirmed:   false,
  },
];

const CONF_STYLE: Record<"HIGH" | "MEDIUM" | "LOW", { bg: string; color: string }> = {
  HIGH:   { bg: "rgba(22,163,74,0.10)",   color: "var(--accent-green)" },
  MEDIUM: { bg: "rgba(234,179,8,0.10)",   color: "#a16207"             },
  LOW:    { bg: "rgba(148,163,184,0.10)", color: "var(--text-muted)"   },
};

export function ReviewPreview() {
  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* ── Text ─────────────────────────────────────────── */}
        <FadeIn>
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--accent-green)" }}
            >
              Review
            </span>
            <h2
              className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              See exactly what was found — and why
            </h2>
            <p
              className="mt-4 text-base sm:text-lg leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Every flagged transaction comes with a plain-English explanation and a confidence level. Confirm what applies to you, skip what doesn't — in seconds, not hours.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {[
                "Confidence level shown for every suggestion",
                "Plain-English explanation for every match",
                "One tap to confirm or skip each deduction",
                "Nothing is claimed without your approval",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <Check size={14} className="shrink-0" style={{ color: "var(--accent-green)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        {/* ── UI mockup ─────────────────────────────────────── */}
        <FadeIn delay={0.1}>
          <div
            className="rounded-3xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--bg-border)",
              boxShadow: "var(--shadow-card-lg)",
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--bg-border)" }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Review deductions
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  3 of 12 shown · $263.99 selected
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: "rgba(22,163,74,0.10)", color: "var(--accent-green)" }}
              >
                1 confirmed
              </span>
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => {
              const cs = CONF_STYLE[row.confidence];
              return (
                <div
                  key={i}
                  className="px-5 py-4"
                  style={{
                    borderBottom: i < ROWS.length - 1 ? "1px solid var(--bg-border)" : undefined,
                    backgroundColor: row.confirmed ? "rgba(22,163,74,0.02)" : undefined,
                  }}
                >
                  {/* Merchant + amount */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {row.confirmed
                        ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "var(--accent-green)" }} />
                        : <Clock        size={14} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)"  }} />
                      }
                      <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {row.merchant}
                      </span>
                    </div>
                    <span className="text-sm font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
                      {row.amount}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="pl-[23px] flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: cs.bg, color: cs.color }}
                    >
                      {row.confidence}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {row.category}
                    </span>
                  </div>

                  {/* Explanation */}
                  <p className="pl-[23px] text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {row.explanation}
                  </p>

                  {/* Action buttons — decorative */}
                  {!row.confirmed && (
                    <div className="pl-[23px] mt-3 flex gap-2" aria-hidden="true">
                      <span
                        className="text-xs px-3.5 py-1.5 rounded-lg font-medium text-white select-none cursor-default"
                        style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-teal))" }}
                      >
                        Confirm
                      </span>
                      <span
                        className="text-xs px-3.5 py-1.5 rounded-lg font-medium border select-none cursor-default"
                        style={{ borderColor: "var(--bg-border)", color: "var(--text-muted)" }}
                      >
                        Skip
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FadeIn>

      </div>
    </Section>
  );
}
