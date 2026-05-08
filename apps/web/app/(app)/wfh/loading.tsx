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

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--bg-card)",
        border:          "1px solid var(--bg-border)",
        borderRadius:    16,
        padding:         "20px",
      }}
    >
      {children}
    </div>
  );
}

export default function WfhLoading() {
  return (
    <MobileScreen maxWidth="sm" as="main" padY={false} className="py-3 sm:py-10">

      {/* Header */}
      <div className="mb-5 space-y-2">
        <Bone h={32} w={220} r={8} />
        <Bone h={14} w={300} r={4} />
      </div>

      {/* Summary card */}
      <Card className="mb-5">
        <Bone h={8} w={80} r={4} className="mb-3" />
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <Bone h={36} w={80} r={8} />
            <Bone h={10} w={90} r={4} />
          </div>
          <div className="space-y-1.5 text-right">
            <Bone h={28} w={80} r={8} />
            <Bone h={10} w={90} r={4} />
          </div>
        </div>
      </Card>

      {/* Add entry form card */}
      <Card className="mb-8">
        <Bone h={8} w={70} r={4} className="mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1.5">
            <Bone h={10} w={30} r={4} />
            <Bone h={44} r={12} />
          </div>
          <div className="space-y-1.5">
            <Bone h={10} w={40} r={4} />
            <Bone h={44} r={12} />
          </div>
        </div>
        <Bone h={44} r={12} className="mb-3" />
        <Bone h={44} r={12} />
      </Card>

      {/* Log entries */}
      <Bone h={8} w={60} r={4} className="mb-3" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
          >
            <Bone h={12} w={60} r={4} />
            <Bone h={12} w={40} r={4} />
          </div>
        ))}
      </div>

    </MobileScreen>
  );
}
