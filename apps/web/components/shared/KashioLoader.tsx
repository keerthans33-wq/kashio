/**
 * Branded loading screen — works in both server and client components.
 * fullScreen=true  → fixed overlay covering the whole viewport (app startup, auth check)
 * fullScreen=false → centered within the content area (page-level loading.tsx files)
 */

const DOTS = [0, 1, 2];

const STYLES = `
  @keyframes kl-pulse {
    0%, 100% { opacity: 1;    transform: scale(1);     filter: drop-shadow(0 0 10px rgba(34,197,94,0.25)); }
    50%       { opacity: 0.84; transform: scale(0.963); filter: drop-shadow(0 0 28px rgba(34,197,94,0.58)); }
  }
  @keyframes kl-dot {
    0%, 80%, 100% { opacity: 0.18; transform: scale(0.68); }
    40%            { opacity: 1;   transform: scale(1);    }
  }
  @keyframes kl-glow {
    0%, 100% { opacity: 0.10; transform: scale(1);    }
    50%       { opacity: 0.24; transform: scale(1.10); }
  }
`;

export function KashioLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        style={
          fullScreen
            ? {
                position:        "fixed",
                inset:           0,
                zIndex:          9999,
                backgroundColor: "#05070E",
                display:         "flex",
                flexDirection:   "column",
                alignItems:      "center",
                justifyContent:  "center",
                paddingTop:      "env(safe-area-inset-top)",
                paddingBottom:   "env(safe-area-inset-bottom)",
              }
            : {
                display:         "flex",
                flexDirection:   "column",
                alignItems:      "center",
                justifyContent:  "center",
                minHeight:       "62vh",
              }
        }
      >
        {fullScreen && (
          <div
            style={{
              position:     "absolute",
              width:        220,
              height:       220,
              borderRadius: "50%",
              background:   "radial-gradient(circle, rgba(34,197,94,0.22) 0%, transparent 70%)",
              animation:    "kl-glow 2.8s ease-in-out infinite",
            }}
          />
        )}

        {/* Logo */}
        <div
          style={{
            position:    "relative",
            animation:   "kl-pulse 2.8s ease-in-out infinite",
            marginBottom: 28,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Kashio"
            style={{ height: fullScreen ? 64 : 48, width: "auto" }}
          />
        </div>

        {/* Animated dots */}
        <div style={{ display: "flex", gap: 7 }}>
          {DOTS.map((i) => (
            <div
              key={i}
              style={{
                width:           6,
                height:          6,
                borderRadius:    "50%",
                backgroundColor: "#22C55E",
                animation:       `kl-dot 1.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {fullScreen && (
          <p
            style={{
              marginTop:     20,
              fontSize:      13,
              color:         "rgba(255,255,255,0.32)",
              letterSpacing: "0.04em",
            }}
          >
            Preparing your workspace…
          </p>
        )}
      </div>
    </>
  );
}
