"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, CheckCircle, AlertCircle } from "lucide-react";
import { ReceiptDrawer, type DrawerToast } from "@/components/shared/ReceiptDrawer";

type ToastKind  = "success" | "error";
type ToastState = { type: ToastKind; message: string } | null;
type UsageData  = { count: number; limit: number; isPro: boolean };

export function ReceiptUploadFab() {
  const toastTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawerOpen, setDrawerOpen]  = useState(false);
  const [toast,      setToast]       = useState<ToastState>(null);
  const [usage,      setUsage]       = useState<UsageData | null>(null);

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

  const usageLabel = usage
    ? usage.isPro
      ? "Receipts unlocked"
      : `${usage.count} of ${usage.limit} free receipts used`
    : undefined;

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
            className="fixed bottom-28 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-medium"
            style={{
              backgroundColor: toast.type === "success"
                ? "rgba(13, 20, 33, 0.97)"
                : "rgba(20, 10, 10, 0.97)",
              border: toast.type === "success"
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

      {/* Small pill FAB */}
      <div
        className="fixed right-4 z-40"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
      >
        <motion.button
          onClick={() => setDrawerOpen(true)}
          aria-label="Upload receipt"
          className="flex items-center gap-1.5 rounded-full font-semibold"
          style={{
            paddingLeft:          16,
            paddingRight:         18,
            height:               38,
            fontSize:             13,
            color:                "#22C55E",
            backgroundColor:      "rgba(34,197,94,0.12)",
            border:               "1px solid rgba(34,197,94,0.28)",
            boxShadow:            "0 0 20px rgba(34,197,94,0.15), 0 2px 8px rgba(0,0,0,0.35)",
            backdropFilter:       "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Receipt
        </motion.button>
      </div>

      <ReceiptDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        usageLabel={usageLabel}
        onToast={handleDrawerToast}
        onCountChange={fetchUsage}
      />
    </>
  );
}
