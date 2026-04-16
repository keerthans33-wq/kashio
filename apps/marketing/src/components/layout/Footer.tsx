import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Container } from "./Container";

const PRODUCT_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing",      href: "/pricing" },
  { label: "FAQs",         href: "/faqs" },
  { label: "Contact",      href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy",    href: "/legal/privacy" },
  { label: "Terms",      href: "/legal/terms" },
  { label: "Disclaimer", href: "/legal/disclaimer" },
];

export function Footer() {
  return (
    <footer
      className="relative z-10 border-t py-12"
      style={{ borderColor: "var(--bg-border)" }}
    >
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-xs">
            <Logo />
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Smart deduction tracking for Australian employees, contractors, and sole traders.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Product
              </p>
              <ul className="flex flex-col gap-2">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-opacity hover:opacity-70"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Legal
              </p>
              <ul className="flex flex-col gap-2">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-opacity hover:opacity-70"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row sm:justify-between gap-2"
          style={{ borderColor: "var(--bg-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Kashio. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Kashio is not a tax adviser. Always verify with your accountant before lodging.
          </p>
        </div>
      </Container>
    </footer>
  );
}
