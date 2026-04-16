import {
  ScanLine, Tag, Home, FileText, Users, ShieldCheck,
} from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { features } from "@/content/features";

const ICON_MAP: Record<string, React.ElementType> = {
  ScanLine, Tag, Home, FileText, Users, ShieldCheck,
};

export function FeatureGrid() {
  return (
    <Section>
      <FadeIn>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Everything you need for tax time
          </h2>
          <p className="mt-3 text-base sm:text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Kashio handles the heavy lifting so you can focus on your work.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature, i) => {
          const Icon = ICON_MAP[feature.icon];
          return (
            <FadeIn key={feature.title} delay={i * 0.06}>
              <div
                className="flex flex-col gap-3 rounded-2xl p-6 border h-full"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--bg-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(22, 163, 74, 0.08)" }}
                >
                  {Icon && <Icon size={20} style={{ color: "var(--accent-green)" }} />}
                </div>
                <h3
                  className="font-semibold text-base"
                  style={{ color: "var(--text-primary)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {feature.description}
                </p>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
