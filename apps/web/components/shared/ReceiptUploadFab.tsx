"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Receipt, CheckCircle, AlertCircle } from "lucide-react";
import { ReceiptDrawer, type DrawerToast } from "@/components/shared/ReceiptDrawer";

type ToastKind  = "success" | "error";
type ToastState = { type: ToastKind; message: string } | null;
type UsageData  = { count: number; limit: number; isPro: boolean };

function usageLabel({ isPro }: UsageData): string {
  return isPro ? "Receipts unlocked" : "Add receipts";
}

function usageLabelFull({ count, limit, isPro }: UsageData): string {
  if (isPro) {
    return count === 0 ? "Receipts unlocked" : `${count} of ${limit} receipts used`;
  }
  return count === 0
    ? `${limit} free receipts included`
    : `${count} of ${limit} free receipts used`;
}

export function ReceiptUploadFab() {
  const toastTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [toast,       setToast]       = useState<ToastState>(null);
  const [usage,       setUsage]       = useState<UsageData | null>(null);

  const fetchUsage = useCallback(() => {
    fetch("/api/receipts/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UsageData | null) => { if (data) setUsage(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  function showToast(type: ToastKind, message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function handleDrawerToast(t: DrawerToast) {
    if (t) showToast(t.type, t.message);
  }

  return (
    <>
      {/* Toast — anchored bottom-right, above the FAB */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="fab-toast"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 8,  scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-48 sm:bottom-28 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-medium"
            style={{
              backgroundColor: toast.type === "success"
                ? "rgba(13, 20, 33, 0.97)"
                : "rgba(20, 10, 10, 0.97)",
              border:    toast.type === "success"
                ? "1px solid rgba(34,197,94,0.30)"
                : "1px solid rgba(248,113,113,0.30)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
              maxWidth:  "calc(100vw - 2rem)",
            }}
            role="status"
            aria-live="polite"
          >
            {toast.type === "success"
              ? <CheckCircle size={16} className="shrink-0" style={{ color: "#22C55E"  }} />
              : <AlertCircle size={16} className="shrink-0" style={{ color: "#f87171" }} />
            }
            <span style={{ color: "var(--text-primary)" }}>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB container — mobile: above bottom nav; sm+: standard position */}
      <div className="fixed right-5 z-40 flex flex-col items-end gap-2.5 fab-position">
        {/* Usage label — mobile + desktop */}
        <AnimatePresence>
          {usage && (
            <motion.button
              key="usage-label"
              onClick={() => setDrawerOpen(true)}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1    }}
              exit={{    opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-full whitespace-nowrap font-semibold backdrop-blur-xl transition-transform duration-150 hover:scale-[1.03]"
              style={{
                padding:    "8px 16px",
                fontSize:   "13px",
                color:      "#FFFFFF",
                border:     "1px solid rgba(52,211,153,0.40)",
                backgroundColor: "rgba(52,211,153,0.10)",
                boxShadow:  "0 0 24px rgba(52,211,153,0.20), 0 2px 8px rgba(0,0,0,0.35)",
              }}
              aria-label="View receipts"
            >
              {usageLabel(usage)}
            </motion.button>
          )}
        </AnimatePresence>

        {/* FAB button */}
        <motion.button
          onClick={() => setDrawerOpen(true)}
          aria-label="Upload receipt"
          className="flex items-center justify-center rounded-full"
          style={{
            width:           64,
            height:          64,
            backgroundColor: "#22C55E",
            boxShadow:       "0 0 35px rgba(34,197,94,0.55), 0 4px 16px rgba(0,0,0,0.45)",
          }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Receipt size={26} strokeWidth={2} style={{ color: "#0A1F12" }} />
        </motion.button>
      </div>

      {/* Bottom drawer */}
      <ReceiptDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        usageLabel={usage ? usageLabelFull(usage) : undefined}
        onToast={handleDrawerToast}
        onCountChange={fetchUsage}
      />
    </>
  );
}
