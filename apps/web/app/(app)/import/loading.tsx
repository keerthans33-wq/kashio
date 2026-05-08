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

export default function ImportLoading() {
  return (
    <MobileScreen maxWidth="md">

      {/* Page header */}
      <div className="mb-8 text-center space-y-2.5">
        <Bone h={28} w={260} r={8} className="mx-auto" />
        <Bone h={14} w={300} r={4} className="mx-auto" />
      </div>

      {/* Upload drop zone */}
      <div
        className="mb-8 rounded-2xl flex flex-col items-center justify-center gap-4 py-14"
        style={{
          backgroundColor: "rgba(13,20,33,0.88)",
          border:          "1.5px dashed rgba(255,255,255,0.10)",
        }}
      >
        <Bone h={44} w={44} r={12} />
        <div className="space-y-2 text-center">
          <Bone h={14} w={200} r={4} className="mx-auto" />
          <Bone h={12} w={150} r={4} className="mx-auto" />
        </div>
        <Bone h={40} w={140} r={12} />
      </div>

      {/* Previously imported section */}
      <Bone h={8} w={140} r={4} className="mb-4" />
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl px-5 py-4"
            style={{ backgroundColor: "rgba(13,20,33,0.88)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <Bone h={12} w={160} r={4} />
              <Bone h={10} w={60} r={4} />
            </div>
            <Bone h={10} w={100} r={4} />
          </div>
        ))}
      </div>

    </MobileScreen>
  );
}
