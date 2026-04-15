/**
 * AuroraBackground
 *
 * Fixed full-viewport atmospheric layer. Renders layered green/teal radial
 * blobs that slowly drift via CSS keyframe animations. Sits at z-0, never
 * intercepts pointer events.
 *
 * intensity:
 *   "subtle"  — barely-there glow (login, export)
 *   "medium"  — balanced presence (default, most screens)
 *   "strong"  — richer atmosphere (home / hero moments)
 */

type Intensity = "subtle" | "medium" | "strong";

const OPACITY: Record<Intensity, { g1: number; g2: number; t1: number }> = {
  subtle: { g1: 0.06, g2: 0.05, t1: 0.04 },
  medium: { g1: 0.10, g2: 0.08, t1: 0.07 },
  strong: { g1: 0.15, g2: 0.12, t1: 0.11 },
};

export function AuroraBackground({ intensity = "medium" }: { intensity?: Intensity }) {
  const op = OPACITY[intensity];

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Blob 1 — green, top-right quadrant */}
      <div
        className="aurora-blob"
        style={{
          width:  680,
          height: 680,
          top:    "-12%",
          right:  "-8%",
          background: `rgba(34, 197, 94, ${op.g1})`,
          animationName:     "aurora-drift-1",
          animationDuration: "18s",
        }}
      />

      {/* Blob 2 — teal, center-left */}
      <div
        className="aurora-blob"
        style={{
          width:  500,
          height: 500,
          top:    "28%",
          left:   "-8%",
          background: `rgba(20, 184, 166, ${op.t1})`,
          animationName:     "aurora-drift-2",
          animationDuration: "23s",
          animationDelay:    "-7s",
        }}
      />

      {/* Blob 3 — soft green, bottom-center */}
      <div
        className="aurora-blob"
        style={{
          width:  620,
          height: 620,
          bottom: "-14%",
          left:   "30%",
          background: `rgba(74, 222, 128, ${op.g2})`,
          animationName:     "aurora-drift-3",
          animationDuration: "26s",
          animationDelay:    "-14s",
        }}
      />
    </div>
  );
}
