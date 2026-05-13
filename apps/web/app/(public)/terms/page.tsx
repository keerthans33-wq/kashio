import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use · Kashio",
  description: "Terms and conditions for using Kashio.",
};

export default function TermsPage() {
  return (
    <main className="relative z-10 min-h-screen px-5 py-10 sm:py-16" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-2xl">

        {/* Back */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[13px] mb-8 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#22C55E" }}>Legal</p>
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Terms of Use</h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Last updated: May 2026</p>
        </div>

        <div className="space-y-8 text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>

          <Section title="Agreement">
            <p>By accessing or using Kashio, you agree to be bound by these Terms of Use. If you do not agree, do not use the app.</p>
          </Section>

          <Section title="What Kashio does">
            <p>Kashio is an organisational tool that helps Australians identify and track potential tax deductions from their bank transactions. It is designed to make the record-keeping process easier, not to provide tax, financial, or legal advice.</p>
            <p>Kashio is <strong style={{ color: "var(--text-primary)" }}>not</strong> a registered tax agent under the Tax Agent Services Act 2009 and does not lodge tax returns on your behalf.</p>
          </Section>

          <Section title="Not tax advice">
            <ul className="space-y-2 list-none">
              <Li>Any deduction suggestions made by Kashio are for organisational purposes only.</Li>
              <Li>Suggestions are based on general patterns and are not tailored advice for your individual circumstances.</Li>
              <Li>Always confirm deduction eligibility with a registered tax agent or the Australian Taxation Office (ATO).</Li>
              <Li>Kashio is not liable for any tax outcome based on information displayed in the app.</Li>
            </ul>
          </Section>

          <Section title="Your responsibilities">
            <ul className="space-y-2 list-none">
              <Li>You are responsible for the accuracy of the data you upload to Kashio.</Li>
              <Li>You must not upload data that belongs to another person without their consent.</Li>
              <Li>You are responsible for verifying any deduction with a qualified tax professional before claiming it.</Li>
              <Li>You must not attempt to reverse-engineer, copy, or misuse the Kashio platform.</Li>
            </ul>
          </Section>

          <Section title="Subscriptions and payments">
            <ul className="space-y-2 list-none">
              <Li>Kashio offers a free tier with limited features and a paid subscription for full access.</Li>
              <Li>Subscriptions purchased through the Apple App Store are subject to Apple's payment and refund policies.</Li>
              <Li>Subscriptions purchased on the web are processed via Stripe and subject to Stripe's terms.</Li>
              <Li>Kashio does not guarantee refunds for partial periods. Subscription management is handled through the platform you purchased from (App Store or web).</Li>
            </ul>
          </Section>

          <Section title="Data and privacy">
            <p>Your use of Kashio is also governed by our <Link href="/privacy" className="underline underline-offset-2" style={{ color: "#22C55E" }}>Privacy Policy</Link>, which explains how we collect, store, and protect your data.</p>
          </Section>

          <Section title="Availability">
            <p>Kashio is provided on an "as is" basis. We do not guarantee that the app will be available at all times or that it will be error-free. We may update, suspend, or discontinue features at any time.</p>
          </Section>

          <Section title="Limitation of liability">
            <p>To the maximum extent permitted by Australian law, Kashio and its operators are not liable for any indirect, incidental, or consequential loss arising from your use of the app, including any tax penalties or assessments.</p>
          </Section>

          <Section title="Changes to these terms">
            <p>We may update these terms from time to time. Changes will be reflected on this page with an updated date. Continued use of the app after changes constitutes acceptance of the updated terms.</p>
          </Section>

          <Section title="Governing law">
            <p>These terms are governed by the laws of Victoria, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Victoria.</p>
          </Section>

          <Section title="Contact">
            <p>For questions about these terms, contact us at:</p>
            <p><a href="mailto:support@kashio.com.au" className="underline underline-offset-2" style={{ color: "#22C55E" }}>support@kashio.com.au</a></p>
          </Section>

        </div>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 space-y-3"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
    >
      <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span style={{ color: "#22C55E", flexShrink: 0 }}>·</span>
      <span>{children}</span>
    </li>
  );
}
