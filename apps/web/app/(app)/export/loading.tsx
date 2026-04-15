import { MobileScreen } from "@/components/layout/mobile-screen";

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 8,
        animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        ...style,
      }}
    />
  );
}

export default function ExportLoading() {
  return (
    <MobileScreen maxWidth="md" as="main" padY={false} className="py-10 sm:py-14">

      {/* Heading */}
      <div className="mb-8 space-y-2.5">
        <Bone style={{ height: 10, width: 120, borderRadius: 4 }} />
        <Bone style={{ height: 28, width: 220 }} />
        <Bone style={{ height: 14, width: 300, maxWidth: "100%" }} />
      </div>

      {/* Hero total card */}
      <div
        className="mb-5 rounded-2xl px-6 py-8 text-center space-y-4"
        style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(34,197,94,0.12)" }}
      >
        <Bone style={{ height: 10, width: 120, borderRadius: 4, margin: "0 auto" }} />
        <Bone style={{ height: 52, width: 200, borderRadius: 8, margin: "0 auto" }} />
        <Bone style={{ height: 14, width: 160, borderRadius: 4, margin: "0 auto" }} />
        <Bone style={{ height: 12, width: 120, borderRadius: 4, margin: "0 auto" }} />
      </div>

      {/* Breakdown section */}
      <div className="space-y-2.5 mt-8">
        <Bone style={{ height: 10, width: 80, borderRadius: 4 }} />
        {[180, 140, 160].map((w, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--bg-border)" }}>
              <Bone style={{ height: 10, width: 90, borderRadius: 4 }} />
              <Bone style={{ height: 14, width: 60, borderRadius: 4 }} />
            </div>
            <div className="px-5 space-y-0">
              {[0, 1].map((j) => (
                <div key={j} className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: j === 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="space-y-1.5">
                    <Bone style={{ height: 12, width: w, borderRadius: 4 }} />
                    <Bone style={{ height: 10, width: 60, borderRadius: 4 }} />
                  </div>
                  <Bone style={{ height: 12, width: 54, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Download area */}
      <div
        className="mt-8 rounded-2xl px-6 py-6 space-y-4"
        style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(34,197,94,0.12)" }}
      >
        <div className="space-y-2">
          <Bone style={{ height: 10, width: 100, borderRadius: 4 }} />
          <Bone style={{ height: 18, width: 160, borderRadius: 4 }} />
          <Bone style={{ height: 12, width: "90%", borderRadius: 4 }} />
        </div>
        <Bone style={{ height: 48, width: "100%", borderRadius: 16 }} />
      </div>

    </MobileScreen>
  );
}
