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

export default function DashboardLoading() {
  return (
    <MobileScreen maxWidth="md" as="main" padY={false} className="pt-1.5 pb-3 sm:py-12">

      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Bone h={8} w={80} r={4} />
          <Bone h={28} w={200} r={8} />
        </div>
        <Bone h={52} w={52} r={999} />
      </div>

      {/* Hero card */}
      <div
        className="mb-3 rounded-2xl px-5 py-6 space-y-3"
        style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Bone h={8} w={160} r={4} />
        <Bone h={40} w={180} r={8} />
        <Bone h={12} w={240} r={4} />
      </div>

      {/* Two metric tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl px-4 py-4 space-y-2"
            style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Bone h={8} w={60} r={4} />
            <Bone h={24} w={50} r={6} />
            <Bone h={10} w={80} r={4} />
          </div>
        ))}
      </div>

      {/* Checklist / upsell card */}
      <div
        className="mb-4 rounded-2xl px-5 py-4 space-y-0"
        style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Bone h={8} w={100} r={4} className="mb-3" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2"
            style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
          >
            <Bone h={18} w={18} r={999} />
            <Bone h={10} w={`${55 + i * 12}%`} r={4} />
            <Bone h={10} w={60} r={4} />
          </div>
        ))}
      </div>

      {/* Category grid */}
      <Bone h={8} w={90} r={4} className="mb-3" />
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl px-3.5 py-3.5 space-y-2"
            style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2">
              <Bone h={22} w={22} r={8} />
              <Bone h={10} w={70} r={4} />
            </div>
            <Bone h={22} w={90} r={6} />
          </div>
        ))}
      </div>

    </MobileScreen>
  );
}
