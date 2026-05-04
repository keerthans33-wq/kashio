"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
};

const BULLETS = [
  "Upload up to 100 receipts",
  "Unlock export-ready reports",
  "Keep deduction proof in one place",
];

export function ProPaywallModal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Calls the shared Pro checkout endpoint — the same one used by the Export
  // paywall. There is only one Stripe product ($19.99). On success, the webhook
  // sets UserEntitlement.isActive = true, which unlocks both Export and full
  // Receipt storage through isProUser() in lib/plan.ts.
  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
      const body = await res.json() as { url?: string };
      if (!res.ok || !body.url) {
        setError("Something went wrong. Please try again.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Override DialogContent defaults so our own card provides all the visual chrome.
        style overrides bg/border/shadow reliably without fighting Tailwind specificity.
      */}
      <DialogContent
        showCloseButton={false}
        className="p-0 sm:max-w-sm"
        style={{ background: "none", border: "none", boxShadow: "none" }}
      >
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-7"
          style={{
            backgroundColor: "rgba(13, 20, 33, 0.97)",
            border:          "1px solid rgba(34,197,94,0.22)",
            boxShadow:       "0 4px 24px rgba(0,0,0,0.55), 0 0 48px rgba(34,197,94,0.07)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(34,197,94,0.06) 0%, transparent 100%)",
            }}
          />

          {/* Lock icon */}
          <div
            className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgba(34,197,94,0.10)",
              border:          "1px solid rgba(34,197,94,0.20)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              style={{ color: "#22C55E" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>

          {/* Title + body */}
          <DialogTitle
            className="text-[22px] font-bold mb-2 leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            Unlock full receipt storage
          </DialogTitle>

          <DialogDescription
            className="text-[13px] mb-5"
            style={{ color: "var(--text-secondary)" }}
          >
            Store more receipts and unlock export-ready reports for tax time.
          </DialogDescription>

          {/* Feature bullets */}
          <ul className="mb-6 space-y-2.5">
            {BULLETS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-[13px]"
                style={{ color: "var(--text-secondary)" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: "#22C55E" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className="mb-5 flex items-baseline gap-2.5">
            <span
              className="text-[34px] font-bold tabular-nums leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              $19.99
            </span>
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              AUD · one-time
            </span>
          </div>

          {/* CTA */}
          <Button
            variant="primary"
            className="w-full mb-3"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? "Redirecting…" : "Upgrade to Pro – $19.99"}
          </Button>

          {error && (
            <p className="text-center text-[12px] mb-2" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}

          {/* Secondary — dismiss */}
          <Button
            variant="ghost"
            className="w-full mb-4 text-[13px]"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Maybe later
          </Button>

          {/* Legal */}
          <p
            className="text-center text-[11px] leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            By upgrading, you agree to Kashio&apos;s{" "}
            <a
              href="https://kashio.com.au/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
            >
              Terms
            </a>
            ,{" "}
            <a
              href="https://kashio.com.au/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
            >
              Privacy Policy
            </a>
            , and{" "}
            <a
              href="https://kashio.com.au/legal/disclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
            >
              Disclaimer
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
