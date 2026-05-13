import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Kashio",
  description: "How Kashio collects, stores, and protects your data.",
};

export default function PrivacyPage() {
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
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Last updated: May 2026</p>
        </div>

        <div className="space-y-8 text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>

          <Section title="Overview">
            <p>Kashio is an Australian tax deduction organisation tool. This policy explains what data we collect, how we use it, and your rights. By using Kashio, you agree to the practices described here.</p>
            <p>Kashio is not a registered tax agent and does not provide tax advice.</p>
          </Section>

          <Section title="What data we collect">
            <ul className="space-y-2 list-none">
              <Li>Bank transaction data you choose to upload (CSV files exported from your bank).</Li>
              <Li>Receipt images or documents you choose to upload for record-keeping.</Li>
              <Li>Your email address and authentication credentials, managed by Supabase Auth.</Li>
              <Li>Basic usage information (e.g. which features you use) to improve the app.</Li>
            </ul>
            <p className="mt-3">Kashio does <strong style={{ color: "var(--text-primary)" }}>not</strong> require access to your bank account, login credentials, or any open-banking connection. All transaction data is manually exported and uploaded by you.</p>
          </Section>

          <Section title="How we use your data">
            <ul className="space-y-2 list-none">
              <Li>To power the deduction review, receipt vault, and export features of the app.</Li>
              <Li>To identify potential tax deductions from your uploaded transactions.</Li>
              <Li>To send transactional emails (e.g. welcome email, password reset).</Li>
            </ul>
            <p className="mt-3">We do <strong style={{ color: "var(--text-primary)" }}>not</strong> sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </Section>

          <Section title="Data storage">
            <p>Your data is stored securely using Supabase, a hosted database and storage platform. Data is stored in Australia where possible. Supabase uses industry-standard encryption at rest and in transit.</p>
            <p>Receipt images are stored in a private, access-controlled storage bucket. Files are only accessible to your authenticated account.</p>
          </Section>

          <Section title="Data ownership">
            <p>You own your data. Kashio only uses it to provide the service to you. We do not claim ownership of any transaction data, receipts, or files you upload.</p>
          </Section>

          <Section title="Your rights">
            <ul className="space-y-2 list-none">
              <Li>You may request a copy of your data at any time by emailing us.</Li>
              <Li>You may request deletion of your account and all associated data at any time.</Li>
              <Li>To delete your account, contact us at <a href="mailto:support@kashio.com.au" className="underline underline-offset-2" style={{ color: "#22C55E" }}>support@kashio.com.au</a>.</Li>
            </ul>
          </Section>

          <Section title="Third-party services">
            <p>Kashio uses the following third-party services to operate:</p>
            <ul className="space-y-2 list-none mt-2">
              <Li><strong style={{ color: "var(--text-primary)" }}>Supabase</strong> — authentication, database, and file storage.</Li>
              <Li><strong style={{ color: "var(--text-primary)" }}>Resend</strong> — transactional email delivery.</Li>
              <Li><strong style={{ color: "var(--text-primary)" }}>RevenueCat / Apple App Store</strong> — subscription and payment management on iOS.</Li>
              <Li><strong style={{ color: "var(--text-primary)" }}>Stripe</strong> — payment processing on web.</Li>
            </ul>
            <p className="mt-3">Each of these services has their own privacy policy and data handling practices.</p>
          </Section>

          <Section title="Tax advice disclaimer">
            <p>Kashio is a tool for organising potential tax deductions. It is <strong style={{ color: "var(--text-primary)" }}>not</strong> a registered tax agent under the Tax Agent Services Act 2009 and does not provide tax, financial, or legal advice.</p>
            <p>Any suggestions made by Kashio are for organisational purposes only. Always confirm deduction eligibility with a registered tax agent or the Australian Taxation Office (ATO).</p>
          </Section>

          <Section title="Changes to this policy">
            <p>We may update this policy from time to time. Changes will be reflected on this page with an updated date. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="Contact">
            <p>For privacy-related enquiries or data deletion requests, contact us at:</p>
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
