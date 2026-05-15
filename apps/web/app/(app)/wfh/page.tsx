import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "../../../lib/db";
import { requireUserWithType, getUserWithEmail } from "../../../lib/auth";
import { fetchUserPlan, isProUser } from "../../../lib/plan";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { WfhEntriesSection } from "./WfhEntriesSection";
import { WfhDownloadButton } from "./WfhDownloadButton";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";

export const dynamic = "force-dynamic";

export default async function WfhLog() {
  let userId: string;
  try {
    ({ id: userId } = await requireUserWithType());
  } catch {
    redirect("/login");
  }

  const [entries, plan, emailData] = await Promise.all([
    db.wfhLog.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    fetchUserPlan(userId),
    getUserWithEmail(),
  ]);

  const isPro      = isProUser(plan);
  const userEmail  = emailData?.email ?? "";
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const { monthHours, monthEst, ytdHours, ytdEst, monthName, fyLabel } = calcWfhSummary(entries);

  return (
    <MobileScreen maxWidth="sm" as="main" padY={false} className="py-3 sm:py-10">

      {/* Header */}
      <FadeIn className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
            Work from home
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-muted)" }}>
            67¢/hr ATO fixed rate — log every day you work from home.
          </p>
        </div>
      </FadeIn>

      {/* Summary — this month */}
      {monthHours > 0 && (
        <FadeIn delay={0.06}>
          <div
            className="mt-5 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: "var(--bg-card)",
              border:          "1px solid var(--bg-border)",
              boxShadow:       "var(--shadow-card)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              {monthName}
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                    {monthHours}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    hr{monthHours !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>hours logged</p>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-bold tabular-nums leading-none" style={{ color: "#22C55E" }}>
                  ~${Math.round(monthEst)}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>est. deduction</p>
              </div>
            </div>
            {ytdHours > monthHours && (
              <p
                className="mt-3 pt-3 text-[11px]"
                style={{ color: "var(--text-muted)", borderTop: "1px solid var(--bg-border)" }}
              >
                Year to date: {ytdHours} hr{ytdHours !== 1 ? "s" : ""} · ~${Math.round(ytdEst)}
              </p>
            )}
          </div>
        </FadeIn>
      )}

      {/* Intro card — only shown before any entries are logged */}
      {totalHours === 0 && (
        <FadeIn delay={0.06}>
          <div
            className="mt-5 rounded-2xl px-5 py-5 space-y-3"
            style={{
              backgroundColor: "var(--bg-card)",
              border:          "1px solid var(--bg-border)",
              boxShadow:       "var(--shadow-card)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#22C55E" }}>
              How it works
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              The ATO&apos;s 67¢/hr fixed-rate method lets you claim a deduction for every hour you work from home — no need to keep individual expense receipts.
            </p>
            <ul className="space-y-2">
              {[
                "Log the date and hours worked from home.",
                "Kashio totals your WFH deduction automatically.",
                "Include it in your return or share with your accountant.",
              ].map((step) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[12px] font-bold" style={{ color: "#22C55E" }}>·</span>
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      )}

      {/* Log form + optimistic entry list */}
      <FadeIn delay={monthHours > 0 ? 0.1 : 0.06}>
        <div
          className="mt-5 rounded-2xl px-5 py-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border:          "1px solid var(--bg-border)",
            boxShadow:       "var(--shadow-card)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Add entry
          </p>
          <WfhEntriesSection initialEntries={entries} totalHours={totalHours} />
        </div>
      </FadeIn>

      {/* Download WFH Log */}
      {totalHours > 0 && (
        <FadeIn delay={0.14}>
          <div className="mt-5">
            <WfhDownloadButton
              entries={entries}
              fyLabel={fyLabel}
              ytdHours={ytdHours}
              ytdEst={ytdEst}
              email={userEmail}
              serverIsPro={isPro}
            />
          </div>
        </FadeIn>
      )}

      {/* ATO note */}
      <p className="mt-8 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
        The ATO requires a record of actual hours to use the 67¢/hr fixed rate.
      </p>

      {/* Export shortcut */}
      <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--bg-border)" }}>
        <Link
          href="/export"
          className="flex items-center justify-between gap-3 group"
        >
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Export your tax summary
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            style={{ color: "var(--text-muted)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

    </MobileScreen>
  );
}
