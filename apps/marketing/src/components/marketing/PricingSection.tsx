import { Check } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { CTAButton } from "@/components/shared/CTAButton";
import { pricingTiers } from "@/content/pricing";

export function PricingSection() {
  return (
    <Section id="pricing">
      <FadeIn>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-base sm:text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Free to use all year. Pay once when you're ready to export.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {pricingTiers.map((tier, i) => (
          <FadeIn key={tier.name} delay={i * 0.1}>
            <div
              className="flex flex-col gap-6 rounded-2xl p-7 border h-full"
              style={{
                backgroundColor: tier.highlighted ? "var(--accent-green)" : "var(--bg-card)",
                borderColor: tier.highlighted ? "transparent" : "var(--bg-border)",
                boxShadow: tier.highlighted ? "var(--shadow-card-lg)" : "var(--shadow-card)",
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold uppercase tracking-wider mb-1"
                  style={{ color: tier.highlighted ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}
                >
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: tier.highlighted ? "#fff" : "var(--text-primary)" }}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span
                      className="text-sm"
                      style={{ color: tier.highlighted ? "rgba(255,255,255,0.65)" : "var(--text-muted)" }}
                    >
                      / {tier.period}
                    </span>
                  )}
                </div>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: tier.highlighted ? "rgba(255,255,255,0.8)" : "var(--text-secondary)" }}
                >
                  {tier.description}
                </p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={15}
                      className="mt-0.5 shrink-0"
                      style={{ color: tier.highlighted ? "#fff" : "var(--accent-green)" }}
                    />
                    <span style={{ color: tier.highlighted ? "rgba(255,255,255,0.9)" : "var(--text-secondary)" }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <CTAButton
                label={tier.cta}
                variant={tier.highlighted ? "outline" : "primary"}
                size="md"
                className={tier.highlighted ? "border-white text-white hover:bg-white/10" : ""}
              />
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
