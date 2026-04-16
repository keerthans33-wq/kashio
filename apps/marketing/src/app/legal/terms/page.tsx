import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-20">
        <Container narrow>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Terms of Service
          </h1>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
            Last updated: January 2025
          </p>

          <div className="prose-section">

            <h2>Acceptance</h2>
            <p>
              By using Kashio you agree to these terms. If you do not agree, do not use the service.
            </p>

            <h2>What Kashio provides</h2>
            <p>
              Kashio is a software tool that helps you identify and organise potential tax deductions from your transaction data. It does not provide financial, tax, or legal advice. All suggestions are automatically generated and for informational purposes only.
            </p>

            <h2>Not financial advice</h2>
            <p>
              Nothing in Kashio constitutes tax advice. Always verify deductions with a registered tax agent or accountant before lodging with the ATO. Kashio is not responsible for any tax outcomes arising from use of the service.
            </p>

            <h2>Your responsibilities</h2>
            <p>
              You are responsible for the accuracy of the data you import, for reviewing every suggested deduction before confirming it, and for verifying your final tax summary with a qualified professional.
            </p>

            <h2>Account</h2>
            <p>
              You must create an account to use Kashio. You are responsible for maintaining the security of your account credentials. Accounts are personal and may not be shared.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Kashio is provided "as is" without warranties of any kind. We are not liable for any direct, indirect, or consequential losses arising from use of the service.
            </p>

            <h2>Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of Kashio after changes constitutes acceptance of the updated terms.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms: <a href="mailto:hello@kashio.com.au" style={{ color: "var(--accent-green)" }}>hello@kashio.com.au</a>
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
