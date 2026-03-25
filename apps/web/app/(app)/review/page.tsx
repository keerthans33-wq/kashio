import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import type { Confidence, DeductionStatus } from "@prisma/client";
import { ReviewFilters } from "./ReviewFilters";

export const dynamic = "force-dynamic";

async function confirmCandidate(id: string) {
  "use server";
  await db.deductionCandidate.update({ where: { id }, data: { status: "CONFIRMED" } });
  revalidatePath("/review");
}

async function rejectCandidate(id: string) {
  "use server";
  await db.deductionCandidate.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/review");
}

const CONFIDENCE_BADGE: Record<Confidence, string> = {
  HIGH:   "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW:    "bg-gray-100 text-gray-500",
};

const STATUS_BORDER: Record<DeductionStatus, string> = {
  NEEDS_REVIEW: "border-gray-200",
  CONFIRMED:    "border-green-300",
  REJECTED:     "border-red-200",
};

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

type Candidate = Awaited<ReturnType<typeof db.deductionCandidate.findMany>>[number] & {
  transaction: { normalizedMerchant: string; amount: number; date: string };
};

function CandidateCard({ c }: { c: Candidate }) {
  const amount = c.transaction.amount;
  return (
    <div className={`rounded-lg border bg-white p-4 ${STATUS_BORDER[c.status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{c.transaction.normalizedMerchant}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[c.confidence]}`}>
              {c.confidence}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{c.category}</p>
          <p className="mt-1 text-sm text-gray-400">{c.reason}</p>
        </div>
        <div className="text-right">
          <p className={`text-base font-semibold ${amount < 0 ? "text-red-600" : "text-green-600"}`}>
            {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400">
          {c.status === "CONFIRMED" && "✓ Confirmed"}
          {c.status === "REJECTED" && "✗ Rejected"}
          {c.status === "NEEDS_REVIEW" && "Awaiting review"}
        </p>
        <div className="flex gap-2">
          <form action={confirmCandidate.bind(null, c.id)}>
            <button
              type="submit"
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Confirm
            </button>
          </form>
          <form action={rejectCandidate.bind(null, c.id)}>
            <button
              type="submit"
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Reject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, candidates }: { title: string; candidates: Candidate[] }) {
  if (candidates.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title} ({candidates.length})
      </h2>
      <div className="space-y-3">
        {candidates.map((c) => <CandidateCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

type SearchParams = { status?: string; category?: string; confidence?: string; sort?: string };

export default async function Review({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { status, category, confidence, sort } = await searchParams;

  const all = await db.deductionCandidate.findMany({
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  });

  const filtered = all.filter((c) => {
    if (status     && c.status     !== status)     return false;
    if (category   && c.category   !== category)   return false;
    if (confidence && c.confidence !== confidence) return false;
    return true;
  });

  const candidates = [...filtered].sort((a, b) => {
    if (sort === "amount")     return Math.abs(b.transaction.amount) - Math.abs(a.transaction.amount);
    if (sort === "confidence") return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    return 0; // default: keep date desc from DB
  });

  const needsReview = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed   = candidates.filter((c) => c.status === "CONFIRMED");
  const rejected    = candidates.filter((c) => c.status === "REJECTED");

  const isFiltered = status || category || confidence;


  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Review</h1>
      <p className="mt-1 text-gray-500">
        {all.length} deduction candidate{all.length !== 1 ? "s" : ""} found
        {isFiltered && ` · ${candidates.length} shown`}
      </p>

      <ReviewFilters />

      {all.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">
          No candidates yet. Import a CSV to detect deductions.
        </p>
      ) : candidates.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">No candidates match these filters.</p>
      ) : (
        <div className="mt-6 space-y-8">
          <Section title="Needs Review" candidates={needsReview} />
          <Section title="Confirmed"    candidates={confirmed} />
          <Section title="Rejected"     candidates={rejected} />
        </div>
      )}
    </main>
  );
}
