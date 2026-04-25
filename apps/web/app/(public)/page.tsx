import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithType } from "../../lib/auth";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

const steps = [
  { n: "1", label: "Import your transactions" },
  { n: "2", label: "Review possible deductions" },
  { n: "3", label: "Track work from home hours" },
  { n: "4", label: "Export your tax summary" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${code}`);

  // Already logged in — skip the landing page
  const user = await getUserWithType();
  if (user) redirect(user.userType ? "/import" : "/onboarding");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">

      {/* Logo */}
      <div className="mb-10">
        <Logo height={64} />
      </div>

      {/* Headline */}
      <h1 className="text-[32px] sm:text-[40px] font-bold leading-tight max-w-sm sm:max-w-lg" style={{ color: "var(--text-primary)" }}>
        Find tax deductions in your everyday spending
      </h1>

      {/* Subheadline */}
      <p className="mt-4 text-[16px] leading-relaxed max-w-sm" style={{ color: "var(--text-secondary)" }}>
        Kashio scans your bank transactions, flags what may be claimable, and tracks your work from home hours — all in one place.
      </p>

      {/* Steps */}
      <div className="mt-12 grid grid-cols-2 sm:flex sm:flex-row items-start gap-6 sm:gap-8">
        {steps.map((step) => (
          <div key={step.n} className="flex flex-col items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--violet-from), var(--violet-to))" }}
            >
              {step.n}
            </span>
            <p className="text-sm font-medium text-center max-w-[100px]" style={{ color: "var(--text-secondary)" }}>{step.label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button asChild className="mt-12 px-10">
        <Link href="/login">Get started</Link>
      </Button>

      {/* Disclaimer */}
      <p className="mt-8 text-xs max-w-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
        Kashio is not a tax adviser. Always verify deductions with your accountant before lodging.
      </p>

    </main>
  );
}
