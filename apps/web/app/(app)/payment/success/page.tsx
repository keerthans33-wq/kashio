import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const userId = await requireUser();
  const { session_id } = await searchParams;

  // Verify the session exists in our payments table (webhook may take a moment)
  const payment = session_id
    ? await db.payment.findUnique({
        where:  { stripeSessionId: session_id },
        select: { paymentStatus: true, amountTotal: true, currency: true },
      })
    : null;

  const entitlement = await db.userEntitlement.findUnique({
    where:  { userId_productKey: { userId, productKey: "kashio_tax_summary_report" } },
    select: { isActive: true },
  });

  // If the webhook hasn't fired yet, fall back to legacy flag
  const userProfile = !entitlement
    ? await db.userProfile.findUnique({ where: { userId }, select: { reportUnlocked: true } })
    : null;

  const isUnlocked = entitlement?.isActive === true || userProfile?.reportUnlocked === true;

  // If we have no sign of a payment and no session_id, something is wrong — send back
  if (!session_id) redirect("/export");

  return (
    <main
      className="min-h-screen flex items-center justify-center px-5"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <div className="w-full max-w-sm text-center space-y-6">

        {/* Icon */}
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            backgroundColor: "rgba(34,197,94,0.10)",
            border:          "1px solid rgba(34,197,94,0.22)",
            boxShadow:       "0 0 40px rgba(34,197,94,0.12)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: "#22C55E" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1
            className="text-[24px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Payment successful
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {isUnlocked
              ? "Your Kashio Tax Summary Report is unlocked and ready to download."
              : "Your payment was received. Your report will be unlocked momentarily — please head back to export."}
          </p>
          {payment && (
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {(payment.amountTotal / 100).toLocaleString("en-AU", {
                style:    "currency",
                currency: (payment.currency ?? "aud").toUpperCase(),
              })}{" "}
              · {payment.paymentStatus}
            </p>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/export"
          className="inline-flex items-center justify-center w-full h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#22C55E", color: "#000" }}
        >
          {isUnlocked ? "Download my report" : "Go to export"}
        </Link>

        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          A receipt has been sent to your email by Stripe.
        </p>
      </div>
    </main>
  );
}
