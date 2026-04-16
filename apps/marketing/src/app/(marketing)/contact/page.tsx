import type { Metadata } from "next";
import { Mail, MessageSquare } from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Kashio team.",
};

export default function ContactPage() {
  return (
    <>
      <AuroraBackground intensity="subtle" />

      <Section className="pt-32" narrow>
        <FadeIn>
          <div className="text-center mb-12">
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Get in touch
            </h1>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              Questions, feedback, or just want to say hello — we'd love to hear from you.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FadeIn delay={0.08}>
            <div
              className="flex flex-col gap-3 rounded-2xl p-7 border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--bg-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(22,163,74,0.08)" }}
              >
                <Mail size={20} style={{ color: "var(--accent-green)" }} />
              </div>
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                Email us
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                For general enquiries, product questions, or feedback.
              </p>
              <a
                href="mailto:hello@kashio.com.au"
                className="text-sm font-medium transition-opacity hover:opacity-70 mt-1"
                style={{ color: "var(--accent-green)" }}
              >
                hello@kashio.com.au
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={0.14}>
            <div
              className="flex flex-col gap-3 rounded-2xl p-7 border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--bg-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(22,163,74,0.08)" }}
              >
                <MessageSquare size={20} style={{ color: "var(--accent-green)" }} />
              </div>
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                Support
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Having trouble with the app? We'll help you get sorted.
              </p>
              <a
                href="mailto:support@kashio.com.au"
                className="text-sm font-medium transition-opacity hover:opacity-70 mt-1"
                style={{ color: "var(--accent-green)" }}
              >
                support@kashio.com.au
              </a>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.2}>
          <p className="mt-10 text-xs text-center" style={{ color: "var(--text-muted)" }}>
            We aim to respond within one business day.
          </p>
        </FadeIn>
      </Section>
    </>
  );
}
