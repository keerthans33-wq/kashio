"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/shared/Logo";
import { CTAButton } from "@/components/shared/CTAButton";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing",      href: "/pricing" },
  { label: "FAQs",         href: "/faqs" },
];

export function Navbar() {
  const [open,      setOpen]      = useState(false);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "py-3 backdrop-blur-md border-b"
          : "py-5",
      )}
      style={
        scrolled
          ? { backgroundColor: "rgba(248,250,252,0.85)", borderColor: "var(--bg-border)" }
          : {}
      }
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <CTAButton label="Get started" size="sm" />
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--bg-border)",
            }}
          >
            <div className="px-4 py-5 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2">
                <CTAButton label="Get started" size="sm" className="w-full justify-center" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
