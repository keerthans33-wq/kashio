"use client";

import Link from "next/link";
import { ChevronRight, FileText, Shield, HelpCircle, Mail, RefreshCw } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";

export default function SettingsPage() {
  const { user } = useUser();
  const { isIOS, restore } = useRevenueCat();

  async function handleRestorePurchases() {
    try {
      const ok = await restore();
      alert(ok ? "Purchases restored." : "No active subscription found.");
    } catch (e) {
      console.error("Restore failed:", e);
      alert("Could not restore purchases. Please try again.");
    }
  }

  return (
    <main className="relative z-10 min-h-screen px-5 py-10 sm:py-16" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
          {user?.email && (
            <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{user.email}</p>
          )}
        </div>

        <div className="space-y-4">

          {/* Legal */}
          <Section label="Legal">
            <SettingsRow
              icon={<Shield size={15} />}
              label="Privacy Policy"
              href="/privacy"
            />
            <SettingsRow
              icon={<FileText size={15} />}
              label="Terms of Use"
              href="/terms"
            />
          </Section>

          {/* Support */}
          <Section label="Support">
            <SettingsRow
              icon={<HelpCircle size={15} />}
              label="Help & FAQ"
              href="/support"
            />
            <SettingsRow
              icon={<Mail size={15} />}
              label="Contact us"
              href="mailto:support@kashio.com.au"
              external
            />
          </Section>

          {/* Subscription */}
          {isIOS && (
            <Section label="Subscription">
              <button
                onClick={handleRestorePurchases}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-70"
              >
                <span
                  className="flex items-center justify-center rounded-lg w-7 h-7 shrink-0"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                >
                  <RefreshCw size={15} />
                </span>
                <span className="flex-1 text-left text-[14px]" style={{ color: "var(--text-primary)" }}>
                  Restore purchases
                </span>
              </button>
            </Section>
          )}

        </div>

        {/* App version */}
        <p className="mt-10 text-center text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Kashio · Australian tax deduction tracker
        </p>

      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <div
        className="rounded-2xl overflow-hidden divide-y"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span
        className="flex items-center justify-center rounded-lg w-7 h-7 shrink-0"
        style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
      >
        {icon}
      </span>
      <span className="flex-1 text-[14px]" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <ChevronRight size={14} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
    </>
  );

  const cls = "flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-70";

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}
