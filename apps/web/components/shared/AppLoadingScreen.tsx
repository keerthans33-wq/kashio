"use client";

import { useEffect, useState } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";

export function AppLoadingScreen() {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const cap = isCapacitorIOS();
    setIos(cap);
    if (cap) {
      // Hide the native splash screen now that React has rendered.
      // capacitor.config.ts sets launchAutoHide: false so we control this manually,
      // preventing the blank-screen gap before JS loads.
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 300 }))
        .catch(() => {});
    }
  }, []);

  if (!ios) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#22C55E]" />
      </div>
    );
  }

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
            filter: drop-shadow(0 0 22px rgba(34,197,94,0.5));
          }
        }
        @keyframes kashio-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40%            { opacity: 1;    transform: scale(1);    }
        }
        @keyframes kashio-glow-ring {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 0.22; transform: scale(1.08); }
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
        {/* Ambient glow ring behind logo */}
        <div
          style={{
            position:        "absolute",
            width:           220,
            height:          220,
            borderRadius:    "50%",
            background:      "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)",
            animation:       "kashio-glow-ring 2.8s ease-in-out infinite",
          }}
        />

        {/* Logo */}
        <div style={{ animation: "kashio-logo-pulse 2.8s ease-in-out infinite", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Kashio" style={{ height: 68, width: "auto" }} />
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 36 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width:           7,
                height:          7,
                borderRadius:    "50%",
                backgroundColor: "#22C55E",
                animation:       `kashio-dot 1.5s ease-in-out ${i * 0.22}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
