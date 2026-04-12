import { redirect } from "next/navigation";
import Image from "next/image";
import { getUserWithType } from "../../lib/auth";

const steps = [
  { n: "1", label: "Import your transactions" },
  { n: "2", label: "Review possible deductions" },
  { n: "3", label: "Export your tax summary" },
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center" style={{ backgroundColor: "var(--bg-app)" }}>

      {/* Logo */}
      <Image
        src="/kashio - 2.PNG"
        alt="Kashio"
        height={32}
        width={110}
        className="h-8 w-auto mb-10"
        priority
      />

      {/* Headline */}
      <h1 className="text-[32px] sm:text-[40px] font-bold leading-tight max-w-sm sm:max-w-lg" style={{ color: "var(--text-primary)" }}>
        Find tax deductions in your everyday spending
      </h1>

      {/* Subheadline */}
      <p className="mt-4 text-[16px] leading-relaxed max-w-sm" style={{ color: "var(--text-secondary)" }}>
        Kashio scans your transactions, highlights what may be claimable for work or business use, and helps you track work from home hours.
      </p>

      {/* Steps */}
      <div className="mt-12 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
        {steps.map((step) => (
          <div key={step.n} className="flex flex-col items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--violet-from), var(--violet-to))" }}
            >
              {step.n}
            </span>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{step.label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="/login"
        className="mt-12 inline-block rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
      >
        Get started
      </a>

      {/* Disclaimer */}
      <p className="mt-8 text-xs max-w-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
        Kashio is not a tax adviser. Always verify deductions with your accountant before lodging.
      </p>

    </main>
  );
}
