import Link from "next/link";
import { CheckCircle2, Clock, FileCheck, ChevronRight } from "lucide-react";
import { CTAButton } from "@/components/shared/CTAButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Container } from "@/components/layout/Container";

const USER_TYPES = ["Employees", "Contractors", "Sole Traders"];

const PREVIEW_ROWS = [
  { merchant: "Adobe Creative Cloud", amount: "$54.99", tag: "SOFTWARE",       confirmed: true  },
  { merchant: "Officeworks",          amount: "$89.00", tag: "OFFICE",         confirmed: false },
  { merchant: "Telstra",              amount: "$120.00", tag: "PHONE",         confirmed: false },
];

export function Hero() {
  return (
    <section className="relative z-10 min-h-screen flex items-center pt-28 pb-20">
      <Container>

        {/* Two-column on lg, stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: headline + CTAs ──────────────────────────────────── */}
          <div className="max-w-xl">

            <FadeIn>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-7"
                style={{
                  color: "var(--accent-green)",
                  borderColor: "var(--accent-green)",
                  backgroundColor: "rgba(22,163,74,0.06)",
                }}
              >
                Built for Australian taxpayers
              </span>
            </FadeIn>

            <FadeIn delay={0.07}>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.1] tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Find tax deductions in your everyday spending
              </h1>
            </FadeIn>

            <FadeIn delay={0.15}>
              <p
                className="mt-5 text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Kashio scans your bank transactions, flags what may be claimable, and gives you a clean summary before tax time.
              </p>
            </FadeIn>

            <FadeIn delay={0.23}>
              <div className="mt-9 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <CTAButton label="Start for free" size="lg" />
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-1 text-base font-medium transition-opacity hover:opacity-60"
                  style={{ color: "var(--text-secondary)" }}
                >
                  See how it works <ChevronRight size={16} />
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.31}>
              <div className="mt-8 flex items-center gap-2 flex-wrap">
                <span className="text-xs mr-0.5" style={{ color: "var(--text-muted)" }}>Built for</span>
                {USER_TYPES.map((type) => (
                  <span
                    key={type}
                    className="px-2.5 py-0.5 rounded-full text-xs border"
                    style={{ color: "var(--text-muted)", borderColor: "var(--bg-border)" }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.39}>
              <p className="mt-7 text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                Not tax advice. Always verify deductions with your accountant before lodging.
              </p>
            </FadeIn>
          </div>

          {/* ── Right: dashboard preview ───────────────────────────────── */}
          <FadeIn delay={0.18}>
            <div
              className="rounded-3xl border overflow-hidden w-full"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--bg-border)",
                boxShadow: "var(--shadow-card-lg)",
              }}
            >
              {/* Card header */}
              <div
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "var(--bg-border)" }}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    Scan complete
                  </p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    12 potential deductions found
                  </p>
                </div>
                <span
                  className="flex items-center justify-center h-9 w-9 rounded-full"
                  style={{ backgroundColor: "rgba(22,163,74,0.10)" }}
                >
                  <FileCheck size={16} style={{ color: "var(--accent-green)" }} />
                </span>
              </div>

              {/* Transaction rows */}
              <div>
                {PREVIEW_ROWS.map((row, i) => (
                  <div
                    key={i}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                    style={{
                      borderBottom: i < PREVIEW_ROWS.length - 1 ? "1px solid var(--bg-border)" : undefined,
                      backgroundColor: row.confirmed ? "rgba(22,163,74,0.02)" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {row.confirmed
                        ? <CheckCircle2 size={15} className="shrink-0" style={{ color: "var(--accent-green)" }} />
                        : <Clock        size={15} className="shrink-0" style={{ color: "var(--text-muted)"  }} />
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {row.merchant}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {row.tag}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {row.amount}
                      </span>
                      {row.confirmed && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "rgba(22,163,74,0.10)", color: "var(--accent-green)" }}
                        >
                          Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card footer */}
              <div
                className="px-5 py-4 border-t flex items-center justify-between"
                style={{
                  borderColor: "var(--bg-border)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Estimated deductions this year</span>
                <span className="text-base font-bold" style={{ color: "var(--accent-green)" }}>$1,695.99</span>
              </div>
            </div>
          </FadeIn>

        </div>
      </Container>
    </section>
  );
}
