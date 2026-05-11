"use client";

import { useEffect, useState } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";

export function AppLoadingScreen() {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const cap = isCapacitorIOS();
    setIos(cap);
    if (cap) {
      console.log("[Kashio] Kashio splash mounted");
      // Hide the native splash screen now that React has rendered its own
      // loading screen. capacitor.config.ts sets launchAutoHide: false so we
      // own the timing. The 300ms fade prevents a hard cut.
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 300 }))
        .catch((e) => console.warn("[Kashio] SplashScreen.hide failed:", e));
    }
  }, []);

  // ── Web fallback: plain spinner ─────────────────────────────────────────
  if (!ios) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#22C55E]" />
      </div>
    );
  }

  // ── iOS: branded loading screen ─────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes kashio-logo-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(34,197,94,0.25));
          }
          50% {
            opacity: 0.88;
            transform: scale(0.965);
            filter: drop-shadow(0 0 24px rgba(34,197,94,0.55));
          }
        }
        @keyframes kashio-dot {
          0%, 80%, 100% { opacity: 0.22; transform: scale(0.70); }
          40%            { opacity: 1;   transform: scale(1);    }
        }
        @keyframes kashio-glow {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 0.24; transform: scale(1.1); }
        }
      `}</style>

      <div
        style={{
          position:        "fixed",
          inset:           0,
          backgroundColor: "#05070E",
          zIndex:          9999,
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          paddingTop:      "env(safe-area-inset-top)",
          paddingBottom:   "env(safe-area-inset-bottom)",
        }}
      >
        {/* Ambient glow behind logo */}
        <div
          style={{
            position:     "absolute",
            width:        240,
            height:       240,
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(34,197,94,0.20) 0%, transparent 70%)",
            animation:    "kashio-glow 2.8s ease-in-out infinite",
          }}
        />

        {/* Logo */}
        <div style={{ position: "relative", animation: "kashio-logo-pulse 2.8s ease-in-out infinite" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Kashio" style={{ height: 66, width: "auto" }} />
        </div>

        {/* Tagline */}
        <p
          style={{
            marginTop:   20,
            fontSize:    13,
            color:       "rgba(255,255,255,0.40)",
            letterSpacing: "0.04em",
          }}
        >
          Preparing your tax workspace…
        </p>

        {/* Animated dots */}
        <div style={{ display: "flex", gap: 7, marginTop: 28 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width:           6,
                height:          6,
                borderRadius:    "50%",
                backgroundColor: "#22C55E",
                animation:       `kashio-dot 1.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
