import Link from "next/link";
import { CTAButton } from "@/components/shared/CTAButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Container } from "@/components/layout/Container";

const USER_TYPES = ["Employee", "Contractor", "Sole Trader"];

export function Hero() {
  return (
    <section className="relative z-10 min-h-screen flex items-center pt-24 pb-20">
      <Container>
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

          {/* Badge */}
          <FadeIn>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-8"
              style={{
                color: "var(--accent-green)",
                borderColor: "var(--accent-green)",
                backgroundColor: "rgba(22, 163, 74, 0.06)",
              }}
            >
              Built for Australian taxpayers
            </span>
          </FadeIn>

          {/* Headline */}
          <FadeIn delay={0.08}>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold leading-[1.1] tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Find tax deductions in your everyday spending
            </h1>
          </FadeIn>

          {/* Subheadline */}
          <FadeIn delay={0.16}>
            <p
              className="mt-6 text-lg sm:text-xl leading-relaxed max-w-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              Kashio scans your bank transactions, flags what may be claimable, and gives you a clear summary before tax time.
            </p>
          </FadeIn>

          {/* CTAs */}
          <FadeIn delay={0.24}>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
              <CTAButton label="Get started free" size="lg" />
              <Link
                href="/how-it-works"
                className="text-base font-medium transition-opacity hover:opacity-60"
                style={{ color: "var(--text-secondary)" }}
              >
                See how it works →
              </Link>
            </div>
          </FadeIn>

          {/* User type pills */}
          <FadeIn delay={0.32}>
            <div className="mt-10 flex items-center gap-2 flex-wrap justify-center">
              {USER_TYPES.map((type, i) => (
                <span
                  key={type}
                  className="px-3 py-1 rounded-full text-sm border"
                  style={{
                    color: "var(--text-muted)",
                    borderColor: "var(--bg-border)",
                  }}
                >
                  {type}
                  {i < USER_TYPES.length - 1 && (
                    <span className="sr-only">,</span>
                  )}
                </span>
              ))}
            </div>
          </FadeIn>

          {/* Disclaimer */}
          <FadeIn delay={0.40}>
            <p className="mt-8 text-xs max-w-sm" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              Kashio is not a tax adviser. Always verify deductions with your accountant before lodging.
            </p>
          </FadeIn>

        </div>
      </Container>
    </section>
  );
}
