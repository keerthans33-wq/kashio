import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support · Kashio",
  description: "Get help with Kashio — contact us or browse common questions.",
};

export default function SupportPage() {
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
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#22C55E" }}>Help</p>
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Support</h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>We're here to help.</p>
        </div>

        <div className="space-y-8 text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>

          {/* Contact card */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
          >
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Contact us</h2>
            <p className="mb-4">For any questions, issues, or feedback, email us and we'll get back to you as soon as possible.</p>
            <a
              href="mailto:support@kashio.com.au"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#22C55E", color: "#05070E" }}
            >
              support@kashio.com.au
            </a>
          </div>

          {/* FAQ */}
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
          >
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Common questions</h2>

            <Faq question="How do I import my transactions?">
              Download a CSV statement from your bank's website or app, then tap "Import" in Kashio and upload the file. Kashio will automatically read your transactions and flag potential deductions for you to review.
            </Faq>

            <Faq question="Which banks are supported?">
              Kashio works with CSV exports from any Australian bank. Common formats from ANZ, Commonwealth Bank, NAB, Westpac, and most other banks are supported. If your bank's format isn't recognised, contact us.
            </Faq>

            <Faq question="How do I export my deductions?">
              Go to the Export tab and tap "Generate report". This creates a summary of all your confirmed deductions, which you can download or share with your accountant.
            </Faq>

            <Faq question="Is Kashio providing tax advice?">
              No. Kashio is an organisational tool only. It helps you identify and record potential deductions, but it is not a registered tax agent and does not provide tax, financial, or legal advice. Always confirm deductions with a registered tax agent or the ATO.
            </Faq>

            <Faq question="How do I restore my subscription on a new device?">
              On iOS, open the app, go to Settings, and tap "Restore purchases". Your subscription is linked to your Apple ID and will be restored automatically.
            </Faq>

            <Faq question="How do I delete my account?">
              Email us at <a href="mailto:support@kashio.com.au" className="underline underline-offset-2" style={{ color: "#22C55E" }}>support@kashio.com.au</a> with your request. We will delete your account and all associated data within a reasonable timeframe.
            </Faq>

            <Faq question="Is my data secure?">
              Yes. Your data is stored securely using Supabase, with encryption at rest and in transit. Receipt images are stored in a private bucket only accessible to your account. We do not sell or share your data. See our <Link href="/privacy" className="underline underline-offset-2" style={{ color: "#22C55E" }}>Privacy Policy</Link> for full details.
            </Faq>

          </div>

        </div>

      </div>
    </main>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5" style={{ borderTop: "1px solid var(--bg-border)", paddingTop: "1.25rem" }}>
      <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{question}</p>
      <p className="text-[13px] leading-relaxed">{children}</p>
    </div>
  );
}
