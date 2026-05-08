import { MobileScreen } from "@/components/layout/mobile-screen";

function Bone({ h, w, r = 8, className }: { h: number; w?: number | string; r?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        height:          h,
        width:           w ?? "100%",
        borderRadius:    r,
        backgroundColor: "rgba(255,255,255,0.06)",
        animation:       "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        flexShrink:      0,
      }}
    />
  );
}

export default function ReviewLoading() {
  return (
    <MobileScreen maxWidth="lg" as="main" padY={false} className="py-4 sm:py-10">

      {/* Header */}
      <div className="mb-5 space-y-2">
        <Bone h={28} w={180} r={8} />
        <Bone h={14} w={280} r={4} />
      </div>

      {/* Summary tiles */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl px-4 py-3 space-y-2"
            style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Bone h={8} w={50} r={4} />
            <Bone h={24} w={40} r={6} />
          </div>
        ))}
      </div>

      {/* Candidate cards */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl px-5 py-4"
            style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="space-y-1.5">
                <Bone h={10} w={60} r={4} />
                <Bone h={16} w={160 + i * 20} r={4} />
              </div>
              <Bone h={20} w={70} r={6} />
            </div>
            <div className="flex gap-2">
              <Bone h={32} w={90} r={8} />
              <Bone h={32} w={90} r={8} />
            </div>
          </div>
        ))}
      </div>

    </MobileScreen>
  );
}
