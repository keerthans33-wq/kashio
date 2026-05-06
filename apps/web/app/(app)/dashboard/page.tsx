import Link from "next/link";
import {
  Wrench, Home, Car, BookOpen, Smartphone, Layers,
  ArrowRight, Upload, ClipboardCheck, FileDown, Check,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUserWithType } from "@/lib/auth";
import { fetchUserPlan, isProUser } from "@/lib/plan";
import {
  CATEGORIES,
  CATEGORIES_BY_USER_TYPE,
  ACTIVE_CATEGORIES,
} from "@/lib/rules/categories";
import { calcWfhSummary } from "@/lib/wfhSummary";
import { calculateTaxReadiness, readinessColor } from "@/lib/taxReadiness";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";
import { DashboardProUpsell } from "./DashboardProUpsell";
import { ReceiptStatusCard } from "./ReceiptStatusCard";
import { categoryToSlug } from "@/lib/categorySlug";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtAUD = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

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

  const [candidates, wfhEntries, plan] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { userId },
      include: {
        transaction: {
          select: { amount: true, normalizedMerchant: true, date: true },
        },
      },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
    fetchUserPlan(userId),
  ]);

  const isPro = isProUser(plan);

  const allowed   = (userType ? CATEGORIES_BY_USER_TYPE[userType] : null) ?? ACTIVE_CATEGORIES;
  const active    = candidates.filter((c) => allowed.includes(c.category) && c.status !== "REJECTED");
  const confirmed = active.filter((c) => c.status === "CONFIRMED");
  const pending   = active.filter((c) => c.status === "NEEDS_REVIEW");

  const potentialTotal  = active.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
  const estimatedSaving = Math.round(potentialTotal * 0.325);

  const { ytdHours: wfhHours, ytdEst: wfhEst, fyLabel } = calcWfhSummary(wfhEntries);

  const { score: readiness, label: readinessLabel, nextAction } = calculateTaxReadiness({
    candidates: active.map((c) => ({
      status:   c.status   as "NEEDS_REVIEW" | "CONFIRMED",
      amount:   c.transaction.amount,
      category: c.category,
    })),
    wfhHours,
  });

  const arcColor = readinessColor(readiness);
  const hasData  = active.length > 0 || wfhHours > 0;

  // Per-category totals
  const catData = CATEGORY_GROUPS.map((cat) => ({
    ...cat,
    amount: active
      .filter((c) => cat.matches.includes(c.category))
      .reduce((s, c) => s + Math.abs(c.transaction.amount), 0),
    count: active.filter((c) => cat.matches.includes(c.category)).length,
    href: cat.matches.length === 1
      ? `/review/${categoryToSlug(cat.matches[0])}`
      : "/review",
  }));

  const totalCatAmount = catData.reduce((s, c) => s + c.amount, 0);

  // Checklist counts
  const presentCatCount  = new Set(active.map((c) => c.category)).size;
  const confirmedCatCount = new Set(confirmed.map((c) => c.category)).size;

  return (
    <MobileScreen maxWidth="md" as="main" padY={false} className="py-8 sm:py-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <FadeIn className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            {fyLabel}
          </p>
          <h1
            className="text-[24px] font-bold tracking-tight leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Your Tax Snapshot
          </h1>
        </div>

        {/* Readiness ring */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="relative h-[52px] w-[52px]">
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
              className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {readiness}%
            </span>
          </div>
          <span className="text-[9px] font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            {readinessLabel}
          </span>
        </div>
      </FadeIn>

      {/* ── Hero deduction card ─────────────────────────────────────────────── */}
      <FadeIn delay={0.05} className="mb-3">
        <div
          className="relative overflow-hidden rounded-2xl px-5 py-5"
          style={{
            backgroundColor: "rgba(13, 20, 33, 0.92)",
            border:          "1px solid rgba(34,197,94,0.22)",
            boxShadow:       "0 0 48px rgba(34,197,94,0.06), 0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ backgroundColor: "#22C55E", opacity: 0.7 }}
          />
          {/* Subtle glow */}
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

          {/* Amount + savings badge on same row */}
          <div className="flex items-end gap-3 flex-wrap">
            <p
              className="text-[36px] font-bold tabular-nums leading-none tracking-tight"
              style={{ color: "#FFFFFF" }}
            >
              {fmtAUD(potentialTotal)}
            </p>
            {potentialTotal > 0 && (
              <div
                className="inline-flex items-center rounded-lg px-2.5 py-1 mb-0.5 shrink-0"
                style={{
                  backgroundColor: "rgba(34,197,94,0.12)",
                  border:          "1px solid rgba(34,197,94,0.18)",
                }}
              >
                <span className="text-[11px] font-semibold" style={{ color: "#22C55E" }}>
                  ~{fmtAUD(estimatedSaving)} est. saving
                </span>
              </div>
            )}
          </div>

          {/* Confirmed count subtext */}
          <p className="mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
            {active.length === 0
              ? "No transactions imported yet"
              : `${confirmed.length} confirmed deduction${confirmed.length !== 1 ? "s" : ""} ready for export`}
          </p>
          {pending.length > 0 && (
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {pending.length} still to review
            </p>
          )}

          {/* Disclaimer */}
          <p className="mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.20)" }}>
            Estimate only — not tax advice. Consult your accountant.
          </p>
        </div>
      </FadeIn>

      {/* ── Two metric tiles ─────────────────────────────────────────────────── */}
      <FadeIn delay={0.08} className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Readiness */}
          <div
            className="rounded-2xl px-4 py-3.5 flex flex-col gap-0.5"
            style={{
              backgroundColor: "rgba(13,20,33,0.88)",
              border:          "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Readiness
            </p>
            <p
              className="text-[20px] font-bold tabular-nums leading-none"
              style={{ color: arcColor }}
            >
              {readiness}%
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
              {readinessLabel}
            </p>
          </div>

          {/* To review */}
          <div
            className="rounded-2xl px-4 py-3.5 flex flex-col gap-0.5"
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
              className="text-[20px] font-bold tabular-nums leading-none"
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

      {/* ── Donut chart ──────────────────────────────────────────────────────── */}
      {totalCatAmount > 0 && (
        <FadeIn delay={0.10} className="mb-4">
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              backgroundColor: "rgba(13,20,33,0.88)",
              border:          "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Category breakdown
            </p>
            <DonutChart data={catData} total={totalCatAmount} />
          </div>
        </FadeIn>
      )}

      {/* ── Compact readiness checklist (Pro) / upsell (free) ────────────────── */}
      <FadeIn delay={0.12} className="mb-4">
        {isPro ? (
          <ReadinessChecklist
            activeCount={active.length}
            confirmedCount={confirmed.length}
            pendingCount={pending.length}
            confirmedCatCount={confirmedCatCount}
            presentCatCount={presentCatCount}
          />
        ) : (
          <DashboardProUpsell />
        )}
      </FadeIn>

      {/* ── Category grid ────────────────────────────────────────────────────── */}
      <FadeIn delay={0.14} className="mb-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          By category
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {catData.map((cat) => {
            const isEmpty = cat.count === 0;
            const pct     = totalCatAmount > 0 ? Math.round((cat.amount / totalCatAmount) * 100) : 0;
            return (
              <Link
                key={cat.label}
                href={cat.href}
                className="group block rounded-xl px-3.5 py-3.5 transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: isEmpty ? "rgba(13,20,33,0.55)" : "rgba(13,20,33,0.88)",
                  border:          isEmpty ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.07)",
                  opacity:         isEmpty ? 0.55 : 1,
                }}
              >
                {/* Icon + label */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: isEmpty ? "rgba(255,255,255,0.04)" : cat.bg }}
                  >
                    <cat.Icon
                      size={12}
                      strokeWidth={1.75}
                      style={{ color: isEmpty ? "rgba(255,255,255,0.20)" : cat.color }}
                    />
                  </span>
                  <span
                    className="text-[11px] font-semibold leading-tight truncate"
                    style={{ color: isEmpty ? "var(--text-muted)" : "var(--text-secondary)" }}
                  >
                    {cat.label}
                  </span>
                </div>

                {isEmpty ? (
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    No claims yet
                  </p>
                ) : (
                  <>
                    <p
                      className="text-[18px] font-bold tabular-nums leading-none"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {fmtAUD(cat.amount)}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {cat.count} item{cat.count !== 1 ? "s" : ""}
                      {pct > 0 ? ` · ${pct}% of total` : ""}
                    </p>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </FadeIn>

      {/* ── WFH tile (only if hours logged) ────────────────────────────────── */}
      {wfhHours > 0 && (
        <FadeIn delay={0.16} className="mb-4">
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

      {/* ── Next steps ──────────────────────────────────────────────────────── */}
      <FadeIn delay={0.18} className="mb-8">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          {hasData ? "Next steps" : "Get started"}
        </p>
        <div className="space-y-2">
          {nextAction && (
            <QuickAction
              href={nextAction.href}
              Icon={iconForHref(nextAction.href)}
              label={nextAction.text}
              sub={nextAction.sub}
              highlight
            />
          )}

          {hasData && confirmed.length > 0 && nextAction?.href !== "/export" && (
            <QuickAction
              href="/export"
              Icon={FileDown}
              label="Export your tax summary"
              sub="Download a report for your accountant"
            />
          )}

          {wfhHours === 0 && nextAction?.href !== "/wfh" && (
            <QuickAction
              href="/wfh"
              Icon={Home}
              label="Log work-from-home days"
              sub="Claim 67¢/hr under the ATO fixed-rate method"
            />
          )}

          {/* Receipt status — replaces floating label */}
          <ReceiptStatusCard />
        </div>
      </FadeIn>

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <p
        className="mb-10 text-[11px] text-center"
        style={{ color: "var(--text-muted)", opacity: 0.4 }}
      >
        Not tax advice — check with your accountant before lodging.
      </p>

    </MobileScreen>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function iconForHref(href: string): LucideIcon {
  if (href === "/import") return Upload;
  if (href === "/review") return ClipboardCheck;
  if (href === "/wfh")    return Home;
  if (href === "/export") return FileDown;
  return ArrowRight;
}

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

// ── Compact readiness checklist ────────────────────────────────────────────────

function ReadinessChecklist({
  activeCount,
  confirmedCount,
  pendingCount,
  confirmedCatCount,
  presentCatCount,
}: {
  activeCount:      number;
  confirmedCount:   number;
  pendingCount:     number;
  confirmedCatCount: number;
  presentCatCount:  number;
}) {
  const rows = [
    {
      label:    "Imported",
      value:    activeCount > 0 ? `${activeCount} transactions` : "None yet",
      pct:      activeCount > 0 ? 100 : 0,
      complete: activeCount > 0,
    },
    {
      label:    "Reviewed",
      value:    activeCount > 0 ? `${confirmedCount} of ${activeCount}` : "—",
      pct:      activeCount > 0 ? Math.round((confirmedCount / activeCount) * 100) : 0,
      complete: activeCount > 0 && pendingCount === 0,
    },
    {
      label:    "Categorised",
      value:    presentCatCount > 0 ? `${confirmedCatCount} of ${presentCatCount}` : "—",
      pct:      presentCatCount > 0 ? Math.round((confirmedCatCount / presentCatCount) * 100) : 0,
      complete: presentCatCount > 0 && confirmedCatCount === presentCatCount,
    },
    {
      label:    "Export ready",
      value:    confirmedCount > 0 ? `${confirmedCount} claims` : "Confirm deductions first",
      pct:      confirmedCount > 0 ? 100 : 0,
      complete: confirmedCount > 0,
    },
  ];

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        backgroundColor: "rgba(13,20,33,0.88)",
        border:          "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Tax readiness
      </p>
      <div className="space-y-0">
        {rows.map(({ label, value, pct, complete }, i, arr) => (
          <div
            key={label}
            className="flex items-center gap-3 py-2"
            style={i < arr.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.04)" } : undefined}
          >
            {/* Circle check icon */}
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: complete ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
                border:          complete ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {complete && <Check size={10} strokeWidth={2.5} style={{ color: "#22C55E" }} />}
            </span>

            <p
              className="flex-1 text-[12px]"
              style={{ color: complete ? "var(--text-secondary)" : "var(--text-muted)" }}
            >
              {label}
            </p>

            <p
              className="text-[11px] tabular-nums shrink-0"
              style={{ color: complete ? "#22C55E" : "var(--text-muted)" }}
            >
              {value}
            </p>

            {/* Mini progress bar */}
            <div
              className="w-12 h-1 rounded-full overflow-hidden shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width:           `${pct}%`,
                  backgroundColor: complete ? "#22C55E" : pct > 0 ? "#60A5FA" : "transparent",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SVG Donut chart ───────────────────────────────────────────────────────────

type CatSlice = { label: string; color: string; amount: number };

function DonutChart({ data, total }: { data: CatSlice[]; total: number }) {
  const activeSlices = data.filter((d) => d.amount > 0);
  if (activeSlices.length === 0) return null;

  // Gap between segments (in percentage-of-circumference units)
  const GAP = activeSlices.length > 1 ? 1.5 : 0;

  type Segment = { color: string; label: string; amount: number; offset: number; length: number };
  const segments: Segment[] = [];
  let cumulative = 0;

  for (const slice of activeSlices) {
    const rawLength = (slice.amount / total) * 100;
    const length    = Math.max(rawLength - GAP, 0.5);
    segments.push({
      color:  slice.color,
      label:  slice.label,
      amount: slice.amount,
      offset: cumulative,
      length,
    });
    cumulative += rawLength;
  }

  return (
    <div className="flex items-center gap-5">
      {/* Donut SVG — r=15.9155 → circumference ≈ 100 */}
      <div className="shrink-0">
        <svg viewBox="0 0 36 36" className="w-[110px] h-[110px] -rotate-90">
          {/* Background track */}
          <circle
            cx="18" cy="18" r="15.9"
            fill="none"
            strokeWidth="4"
            stroke="rgba(255,255,255,0.04)"
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="18" cy="18" r="15.9"
              fill="none"
              strokeWidth="4"
              stroke={seg.color}
              strokeLinecap="butt"
              strokeDasharray={`${seg.length} ${100 - seg.length}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2.5 min-w-0">
        {activeSlices.map((slice) => {
          const pct = Math.round((slice.amount / total) * 100);
          return (
            <div key={slice.label} className="flex items-center gap-2 min-w-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span
                className="flex-1 text-[11px] truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {slice.label}
              </span>
              <span
                className="text-[10px] tabular-nums shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                {pct}%
              </span>
              <span
                className="text-[11px] font-medium tabular-nums shrink-0"
                style={{ color: "var(--text-primary)" }}
              >
                {fmtAUD(slice.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
