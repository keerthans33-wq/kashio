type Intensity = "subtle" | "medium" | "strong";

const OPACITY: Record<Intensity, { g1: number; g2: number; t1: number }> = {
  subtle: { g1: 0.05, g2: 0.04, t1: 0.03 },
  medium: { g1: 0.09, g2: 0.07, t1: 0.06 },
  strong: { g1: 0.14, g2: 0.11, t1: 0.10 },
};

export function AuroraBackground({ intensity = "medium" }: { intensity?: Intensity }) {
  const op = OPACITY[intensity];

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Green — top right */}
      <div
        className="aurora-blob"
        style={{
          width: 700, height: 700,
          top: "-14%", right: "-10%",
          background: `rgba(34, 197, 94, ${op.g1})`,
          animationName: "aurora-drift-1",
          animationDuration: "18s",
        }}
      />
      {/* Teal — center left */}
      <div
        className="aurora-blob"
        style={{
          width: 520, height: 520,
          top: "30%", left: "-10%",
          background: `rgba(20, 184, 166, ${op.t1})`,
          animationName: "aurora-drift-2",
          animationDuration: "23s",
          animationDelay: "-7s",
        }}
      />
      {/* Soft green — bottom center */}
      <div
        className="aurora-blob"
        style={{
          width: 640, height: 640,
          bottom: "-16%", left: "28%",
          background: `rgba(74, 222, 128, ${op.g2})`,
          animationName: "aurora-drift-3",
          animationDuration: "26s",
          animationDelay: "-14s",
        }}
      />
    </div>
  );
}
