import { Briefcase, Laptop, Store } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";

const SEGMENTS = [
  {
    icon:        Briefcase,
    title:       "Employees",
    subtitle:    "You work for someone else",
    description: "Kashio helps you find work-related expenses your employer doesn't cover — and gives you a clear reason for each suggestion so you can verify confidently.",
    examples:    ["Work equipment & tools", "Professional development", "Union & membership fees", "Work clothing & uniforms"],
  },
  {
    icon:        Laptop,
    title:       "Contractors & Freelancers",
    subtitle:    "You invoice clients for your work",
    description: "Track the software, subscriptions, and home office costs that keep your business running. Kashio understands what contractors can claim and tailors every suggestion to your situation.",
    examples:    ["Software & subscriptions", "Phone & internet (work portion)", "Home office expenses", "Travel to clients"],
  },
  {
    icon:        Store,
    title:       "Sole Traders",
    subtitle:    "You run your own business",
    description: "From equipment to vehicle expenses, Kashio flags what your business spends, explains why it may be claimable, and organises it into a clean summary for tax time.",
    examples:    ["Business equipment", "Vehicle & travel expenses", "Marketing & advertising", "Bank fees & charges"],
  },
];

export function UserSegments() {
  return (
    <Section>
      <FadeIn>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Built for how you work
          </h2>
          <p
            className="mt-3 text-base sm:text-lg max-w-xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            The rules and explanations adapt to your user type — whether you're on payroll, invoicing clients, or running your own business.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SEGMENTS.map((seg, i) => {
          const Icon = seg.icon;
          return (
            <FadeIn key={seg.title} delay={i * 0.09}>
              <div
                className="rounded-2xl p-7 border flex flex-col gap-5 h-full"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--bg-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.12), rgba(13,148,136,0.08))" }}
                >
                  <Icon size={20} style={{ color: "var(--accent-green)" }} />
                </div>

                <div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    {seg.title}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {seg.subtitle}
                  </p>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {seg.description}
                </p>

                <ul className="mt-auto flex flex-col gap-2 pt-1">
                  {seg.examples.map((ex) => (
                    <li
                      key={ex}
                      className="flex items-center gap-2.5 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--accent-green)" }}
                      />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
