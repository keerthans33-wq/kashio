import { db } from "../../../lib/db";
import { ReviewFilters } from "./ReviewFilters";
import { CandidateCard, type CandidateCardProps } from "./CandidateCard";

export const dynamic = "force-dynamic";

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

type Candidate = Awaited<ReturnType<typeof db.deductionCandidate.findMany>>[number] & {
  transaction: { normalizedMerchant: string; amount: number; date: string; description: string };
};

function toCardProps(c: Candidate): CandidateCardProps {
  return {
    id:          c.id,
    status:      c.status,
    confidence:  c.confidence,
    category:    c.category,
    reason:      c.reason,
    transaction: c.transaction,
  };
}

function Section({ title, candidates }: { title: string; candidates: Candidate[] }) {
  if (candidates.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title} ({candidates.length})
      </h2>
      <div className="space-y-3">
        {candidates.map((c) => <CandidateCard key={c.id} {...toCardProps(c)} />)}
      </div>
    </div>
  );
}

type SearchParams = { status?: string; category?: string; confidence?: string; sort?: string };

export default async function Review({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { status, category, confidence, sort } = await searchParams;

  const [all, totalTransactions] = await Promise.all([
    db.deductionCandidate.findMany({
      include: { transaction: true },
      orderBy: { transaction: { date: "desc" } },
    }),
    db.transaction.count(),
  ]);

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

  const needsReview   = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed     = candidates.filter((c) => c.status === "CONFIRMED");
  const rejected      = candidates.filter((c) => c.status === "REJECTED");

  // Summary counts are always over the full unfiltered set
  const totalConfirmed = all.filter((c) => c.status === "CONFIRMED").length;
  const totalRejected  = all.filter((c) => c.status === "REJECTED").length;

  const isFiltered = status || category || confidence;


  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Review</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Transactions",  value: totalTransactions },
          { label: "Candidates",    value: all.length },
          { label: "Confirmed",     value: totalConfirmed },
          { label: "Rejected",      value: totalRejected },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isFiltered ? `${candidates.length} of ${all.length} candidates shown` : `${all.length} candidate${all.length !== 1 ? "s" : ""}`}
        </p>
      </div>

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
