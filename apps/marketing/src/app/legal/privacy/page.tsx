import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-20">
        <Container narrow>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Privacy Policy
          </h1>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
            Last updated: January 2025
          </p>

          <div className="prose-section">

            <h2>What we collect</h2>
            <p>
              To provide the deduction detection service, Kashio collects: your email address (for account authentication), transaction data you import (merchant names, dates, amounts, descriptions), and work from home log entries. We do not collect bank login credentials.
            </p>

            <h2>How we use your data</h2>
            <p>
              Your transaction data is used solely to identify potential tax deductions and present them in the Kashio app. We do not sell, share, or use your data for advertising. Your data is never sent to third parties except as required to operate the service (e.g. our database provider).
            </p>

            <h2>Data storage</h2>
            <p>
              Data is stored securely in Australia using encrypted cloud infrastructure. We retain your data for as long as your account is active. You may request deletion at any time by contacting us at privacy@kashio.com.au.
            </p>

            <h2>Cookies</h2>
            <p>
              Kashio uses session cookies for authentication only. We do not use tracking or advertising cookies.
            </p>

            <h2>Your rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data. To make a request, contact us at privacy@kashio.com.au.
            </p>

            <h2>Contact</h2>
            <p>
              For privacy enquiries: <a href="mailto:privacy@kashio.com.au" style={{ color: "var(--accent-green)" }}>privacy@kashio.com.au</a>
            </p>

          </div>
        </Container>
      </main>
      <Footer />

      <style>{`
        .prose-section h2 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        .prose-section p {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }
      `}</style>
    </>
  );
}
