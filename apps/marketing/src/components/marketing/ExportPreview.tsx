import { FileText, Check } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { CTAButton } from "@/components/shared/CTAButton";

const CATEGORIES = [
  {
    name:    "Software & Subscriptions",
    amount:  "$324.97",
    detail:  "Adobe Creative Cloud, Framer Pro, Canva Pro +3",
  },
  {
    name:    "Phone & Internet",
    amount:  "$480.00",
    detail:  "Telstra — work portion 67%",
  },
  {
    name:    "Office Supplies",
    amount:  "$213.50",
    detail:  "Officeworks ×3, JB Hi-Fi accessory",
  },
  {
    name:    "Work from Home",
    amount:  "$891.00",
    detail:  "162 days × 7.8 hrs × $0.70/hr",
  },
];

const TOTAL = "$1,909.47";

export function ExportPreview() {
  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* ── Report mockup (left on desktop) ───────────────── */}
        <FadeIn delay={0.1} className="order-2 lg:order-1">
          <div
            className="rounded-3xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--bg-border)",
              boxShadow: "var(--shadow-card-lg)",
            }}
          >
            {/* Premium header band */}
            <div
              className="px-6 py-5 border-b"
              style={{
                background: "linear-gradient(135deg, rgba(22,163,74,0.07), rgba(13,148,136,0.05))",
                borderColor: "rgba(22,163,74,0.14)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "var(--accent-green)" }}
                  >
                    Tax deduction summary
                  </p>
                  <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    Financial Year 2024–25
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Prepared for review by your registered tax agent
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-teal))" }}
                >
                  <FileText size={17} className="text-white" />
                </div>
              </div>
            </div>

            {/* Category rows */}
            <div>
              {CATEGORIES.map((cat, i) => (
                <div
                  key={i}
                  className="px-6 py-4"
                  style={{ borderBottom: i < CATEGORIES.length - 1 ? "1px solid var(--bg-border)" : undefined }}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-0.5">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {cat.name}
                    </p>
                    <p className="text-sm font-bold shrink-0" style={{ color: "var(--text-primary)" }}>
                      {cat.amount}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {cat.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div
              className="px-6 py-5 border-t"
              style={{
                borderColor: "var(--bg-border)",
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Total estimated deductions
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Not tax advice — verify with your accountant before lodging
                  </p>
                </div>
                <p className="text-2xl font-bold shrink-0" style={{ color: "var(--accent-green)" }}>
                  {TOTAL}
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── Text (right on desktop) ────────────────────────── */}
        <FadeIn className="order-1 lg:order-2">
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--accent-green)" }}
            >
              Export
            </span>
            <h2
              className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              A summary your accountant will actually thank you for
            </h2>
            <p
              className="mt-4 text-base sm:text-lg leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              When you're done reviewing, Kashio generates a clean, structured tax summary — deductions by category, totals, your WFH calculation — all in one place and ready to share.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {[
                "Deductions grouped by ATO category",
                "Work from home hours calculated automatically",
                "Evidence notes included where you added them",
                "Print-ready — no spreadsheet required",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <Check size={14} className="shrink-0" style={{ color: "var(--accent-green)" }} />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9">
              <CTAButton label="Get your summary" size="lg" />
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
              Export is a Premium feature — $19 per tax year
            </p>
          </div>
        </FadeIn>

      </div>
    </Section>
  );
}
