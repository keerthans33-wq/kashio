import Link from "next/link";
import {
  Wrench, Home, Car, BookOpen, Smartphone, Layers,
  ArrowRight, Upload, ClipboardCheck, FileDown,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUserWithType } from "@/lib/auth";
import {
  CATEGORIES,
  CATEGORIES_BY_USER_TYPE,
  ACTIVE_CATEGORIES,
} from "@/lib/rules/categories";
import { calcWfhSummary } from "@/lib/wfhSummary";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtAUD = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function readinessLabel(score: number) {
  if (score === 0)  return "Not started";
  if (score < 30)   return "Getting started";
  if (score < 60)   return "In progress";
  if (score < 85)   return "Looking good";
  if (score < 100)  return "Almost there";
  return "Tax ready";
}

function readinessColor(score: number) {
  if (score < 30)  return "#F59E0B";
  if (score < 60)  return "#60A5FA";
  if (score < 85)  return "#22C55E";
  return "#22C55E";
}

// ── Category groups ────────────────────────────────────────────────────────────

type CategoryGroup = {
  label:   string;
  Icon:    LucideIcon;
  color:   string;
  bg:      string;
  matches: string[];
};

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label:   "Work Tools",
    Icon:    Wrench,
    color:   "#60A5FA",
    bg:      "rgba(96,165,250,0.10)",
    matches: [CATEGORIES.EQUIPMENT],
  },
  {
    label:   "Home Office",
    Icon:    Home,
    color:   "#A78BFA",
    bg:      "rgba(167,139,250,0.10)",
    matches: [CATEGORIES.OFFICE_SUPPLIES],
  },
  {
    label:   "Travel",
    Icon:    Car,
    color:   "#F59E0B",
    bg:      "rgba(245,158,11,0.10)",
    matches: [CATEGORIES.WORK_TRAVEL],
  },
  {
    label:   "Education",
    Icon:    BookOpen,
    color:   "#34D399",
    bg:      "rgba(52,211,153,0.10)",
    matches: [CATEGORIES.PROFESSIONAL_DEVELOPMENT],
  },
  {
    label:   "Phone & Internet",
    Icon:    Smartphone,
    color:   "#22C55E",
    bg:      "rgba(34,197,94,0.10)",
    matches: [CATEGORIES.PHONE_INTERNET],
  },
  {
    label:   "Other Claims",
    Icon:    Layers,
    color:   "#FB923C",
    bg:      "rgba(251,146,60,0.10)",
    matches: [CATEGORIES.SOFTWARE, CATEGORIES.MEALS, CATEGORIES.WORK_CLOTHING],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function Dashboard() {
  const { id: userId, userType } = await requireUserWithType();

  const [candidates, receiptsCount, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { userId },
      include: { transaction: { select: { amount: true } } },
    }),
    db.receipt.count({ where: { userId } }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  const allowed  = (userType ? CATEGORIES_BY_USER_TYPE[userType] : null) ?? ACTIVE_CATEGORIES;
  const active   = candidates.filter((c) => allowed.includes(c.category) && c.status !== "REJECTED");
  const confirmed = active.filter((c) => c.status === "CONFIRMED");
  const pending   = active.filter((c) => c.status === "NEEDS_REVIEW");

  const potentialTotal  = active.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
  const estimatedSaving = Math.round(potentialTotal * 0.325);

  const { ytdHours: wfhHours, ytdEst: wfhEst, fyLabel } = calcWfhSummary(wfhEntries);

  // Tax readiness score (0–100)
  let readiness = 0;
  if (active.length > 0) {
    readiness += Math.round((confirmed.length / active.length) * 60);
    if (pending.length === 0 && confirmed.length > 0) readiness += 10;
  }
  if (receiptsCount > 0) readiness += 20;
  if (wfhHours > 0)      readiness += 10;
  readiness = Math.min(100, readiness);

  const arcColor = readinessColor(readiness);
  const hasData  = active.length > 0 || receiptsCount > 0 || wfhHours > 0;

  // Per-category totals
  const catData = CATEGORY_GROUPS.map((cat) => ({
    ...cat,
    amount: active
      .filter((c) => cat.matches.includes(c.category))
      .reduce((s, c) => s + Math.abs(c.transaction.amount), 0),
    count: active.filter((c) => cat.matches.includes(c.category)).length,
  }));

  return (
    <MobileScreen maxWidth="md" as="main" padY={false} className="py-10 sm:py-14">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <FadeIn className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            {fyLabel}
          </p>
          <h1
            className="text-[26px] font-bold tracking-tight leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Your Tax Snapshot
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--text-muted)" }}>
            {hasData
              ? "Here's where you stand this financial year."
              : "Import your bank CSV to find deductions."}
          </p>
        </div>

        {/* Readiness ring */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <div className="relative h-[56px] w-[56px]">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                strokeWidth="2.8"
                stroke="rgba(255,255,255,0.07)"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                strokeWidth="2.8"
                stroke={arcColor}
                strokeLinecap="round"
                strokeDasharray={`${readiness} 100`}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-[12px] font-bold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {readiness}%
            </span>
          </div>
          <span
            className="text-[10px] font-medium whitespace-nowrap"
            style={{ color: "var(--text-muted)" }}
          >
            {readinessLabel(readiness)}
          </span>
        </div>
      </FadeIn>

      {/* ── Hero deduction card ─────────────────────────────────────────────── */}
      <FadeIn delay={0.05} className="mb-4">
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-6"
          style={{
            backgroundColor: "rgba(13, 20, 33, 0.92)",
            border:          "1px solid rgba(34,197,94,0.22)",
            boxShadow:       "0 0 48px rgba(34,197,94,0.06), 0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ backgroundColor: "#22C55E", opacity: 0.6 }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(34,197,94,0.05) 0%, transparent 100%)",
            }}
          />

          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Potential deductions found
          </p>
          <p
            className="text-[38px] font-bold tabular-nums leading-none tracking-tight"
            style={{ color: "#FFFFFF" }}
          >
            {fmtAUD(potentialTotal)}
          </p>

          {potentialTotal > 0 && (
            <div
              className="mt-3 inline-flex items-center rounded-lg px-2.5 py-0.5"
              style={{
                backgroundColor: "rgba(34,197,94,0.12)",
                border:          "1px solid rgba(34,197,94,0.18)",
              }}
            >
              <span className="text-[11px] font-semibold" style={{ color: "#22C55E" }}>
                ~{fmtAUD(estimatedSaving)} estimated saving at 32.5%
              </span>
            </div>
          )}

          <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {active.length === 0
              ? "No transactions imported yet"
              : `${confirmed.length} confirmed · ${pending.length} to review`}
          </p>
        </div>
      </FadeIn>

      {/* ── Three metric tiles ──────────────────────────────────────────────── */}
      <FadeIn delay={0.09} className="mb-8">
        <div className="grid grid-cols-3 gap-3">
          {/* Tax readiness */}
          <div
            className="rounded-2xl px-4 py-4 flex flex-col gap-1"
            style={{
              backgroundColor: "rgba(13,20,33,0.88)",
              border:          "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Readiness
            </p>
            <p
              className="text-[22px] font-bold tabular-nums leading-none"
              style={{ color: arcColor }}
            >
              {readiness}%
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
              {readinessLabel(readiness)}
            </p>
          </div>

          {/* Receipts */}
          <div
            className="rounded-2xl px-4 py-4 flex flex-col gap-1"
            style={{
              backgroundColor: "rgba(13,20,33,0.88)",
              border:          "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Receipts
            </p>
            <p
              className="text-[22px] font-bold tabular-nums leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              {receiptsCount}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
              uploaded
            </p>
          </div>

          {/* To review */}
          <div
            className="rounded-2xl px-4 py-4 flex flex-col gap-1"
            style={{
              backgroundColor: "rgba(13,20,33,0.88)",
              border: pending.length > 0
                ? "1px solid rgba(245,158,11,0.25)"
                : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              To review
            </p>
            <p
              className="text-[22px] font-bold tabular-nums leading-none"
              style={{ color: pending.length > 0 ? "#F59E0B" : "var(--text-primary)" }}
            >
              {pending.length}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
              {pending.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>
        </div>
      </FadeIn>

      {/* ── Category breakdown ──────────────────────────────────────────────── */}
      <FadeIn delay={0.13} className="mb-6">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Breakdown by category
        </p>
        <div className="grid grid-cols-2 gap-3">
          {catData.map((cat) => (
            <Link
              key={cat.label}
              href="/review"
              className="group block rounded-2xl px-4 py-4 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "rgba(13,20,33,0.88)",
                border:          "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Icon + label row */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: cat.bg }}
                >
                  <cat.Icon size={14} strokeWidth={1.75} style={{ color: cat.color }} />
                </span>
                <span
                  className="text-[11px] font-semibold leading-tight"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {cat.label}
                </span>
              </div>

              {/* Amount */}
              <p
                className="text-[20px] font-bold tabular-nums leading-none"
                style={{ color: cat.count > 0 ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {fmtAUD(cat.amount)}
              </p>

              {/* Count */}
              <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                {cat.count === 0
                  ? "No items yet"
                  : `${cat.count} item${cat.count !== 1 ? "s" : ""}`}
              </p>
            </Link>
          ))}
        </div>
      </FadeIn>

      {/* ── WFH tile (only if hours logged) ────────────────────────────────── */}
      {wfhHours > 0 && (
        <FadeIn delay={0.16} className="mb-8">
          <Link
            href="/wfh"
            className="flex items-center justify-between rounded-2xl px-5 py-4 transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "rgba(13,20,33,0.88)",
              border:          "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Work from home
              </p>
              <p
                className="text-[20px] font-bold tabular-nums leading-none"
                style={{ color: "var(--text-primary)" }}
              >
                ~{fmtAUD(wfhEst)}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                {wfhHours} hrs · 67¢/hr ATO rate
              </p>
            </div>
            <ArrowRight size={15} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
          </Link>
        </FadeIn>
      )}

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.18} className="mb-10">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          {hasData ? "Next steps" : "Get started"}
        </p>
        <div className="space-y-2.5">
          {pending.length > 0 && (
            <QuickAction
              href="/review"
              Icon={ClipboardCheck}
              label="Review your deductions"
              sub={`${pending.length} transaction${pending.length !== 1 ? "s" : ""} waiting`}
              highlight
            />
          )}
          {!hasData && (
            <QuickAction
              href="/import"
              Icon={Upload}
              label="Import transactions"
              sub="Upload your bank CSV to find deductions"
            />
          )}
          {hasData && confirmed.length > 0 && (
            <QuickAction
              href="/export"
              Icon={FileDown}
              label="Export your tax summary"
              sub="Download a report for your accountant"
            />
          )}
          {wfhHours === 0 && (
            <QuickAction
              href="/wfh"
              Icon={Home}
              label="Log work-from-home days"
              sub="Claim 67¢/hr under the ATO fixed-rate method"
            />
          )}
        </div>
      </FadeIn>

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <p className="text-[11px] text-center" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
        Not tax advice — check with your accountant before lodging.
      </p>

    </MobileScreen>
  );
}

// ── QuickAction sub-component ──────────────────────────────────────────────────

function QuickAction({
  href,
  Icon,
  label,
  sub,
  highlight = false,
}: {
  href:       string;
  Icon:       LucideIcon;
  label:      string;
  sub:        string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-opacity hover:opacity-80"
      style={{
        backgroundColor: "rgba(13,20,33,0.88)",
        border: highlight
          ? "1px solid rgba(34,197,94,0.25)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: highlight ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
          border:          highlight ? "1px solid rgba(34,197,94,0.20)" : "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Icon
          size={16}
          strokeWidth={1.75}
          style={{ color: highlight ? "#22C55E" : "var(--text-secondary)" }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      </div>
      <ArrowRight size={14} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
    </Link>
  );
}
