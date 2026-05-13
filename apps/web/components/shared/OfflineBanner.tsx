"use client";

import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

export function OfflineBanner() {
  const { online } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
          style={{
            backgroundColor: "rgba(245,158,11,0.10)",
            borderBottom:    "1px solid rgba(245,158,11,0.20)",
          }}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2">
            <WifiOff size={13} strokeWidth={2} style={{ color: "#F59E0B", flexShrink: 0 }} />
            <p className="text-[12px] font-medium" style={{ color: "#F59E0B" }}>
              You&apos;re offline. Some features may not work until you&apos;re connected again.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
