"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Receipt, CheckCircle, AlertCircle } from "lucide-react";
import { ReceiptDrawer, type DrawerToast } from "@/components/shared/ReceiptDrawer";
import { motion, AnimatePresence } from "motion/react";

type UsageData  = { count: number; limit: number; isPro: boolean };
type ToastKind  = "success" | "error";
type ToastState = { type: ToastKind; message: string } | null;

function buildSubtitle(usage: UsageData): string {
  if (usage.isPro) {
    return usage.count === 0
      ? "Unlocked · 0 receipts uploaded"
      : `${usage.count} receipt${usage.count !== 1 ? "s" : ""} uploaded`;
  }
  const remaining = usage.limit - usage.count;
  return remaining > 0
    ? `${remaining} free upload${remaining !== 1 ? "s" : ""} remaining`
    : `${usage.count} of ${usage.limit} free receipts used`;
}

export function ReceiptStatusCard() {
  const toastTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [usage,  setUsage]       = useState<UsageData | null>(null);
  const [open,   setOpen]        = useState(false);
  const [toast,  setToast]       = useState<ToastState>(null);

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
      {/* Inline toast for this card */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="receipt-card-toast"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1    }}
            exit={{    opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[12px] font-medium"
            style={{
              backgroundColor: toast.type === "success" ? "rgba(13,20,33,0.97)" : "rgba(20,10,10,0.97)",
              border: toast.type === "success"
                ? "1px solid rgba(34,197,94,0.30)"
                : "1px solid rgba(248,113,113,0.30)",
            }}
            role="status"
            aria-live="polite"
          >
            {toast.type === "success"
              ? <CheckCircle size={14} className="shrink-0" style={{ color: "#22C55E"  }} />
              : <AlertCircle size={14} className="shrink-0" style={{ color: "#f87171" }} />
            }
            <span style={{ color: "var(--text-primary)" }}>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(true)}
        className="w-full text-left flex items-center gap-4 rounded-2xl px-5 py-4 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: "rgba(13,20,33,0.88)",
          border:          "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border:          "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Receipt size={16} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
            Receipts
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {usage ? buildSubtitle(usage) : "Loading…"}
          </p>
        </div>

        <span className="shrink-0 text-[12px] font-semibold" style={{ color: "#22C55E" }}>
          Upload
        </span>
      </button>

      <ReceiptDrawer
        open={open}
        onOpenChange={setOpen}
        usageLabel={usageLabel}
        onToast={handleDrawerToast}
        onCountChange={fetchUsage}
      />
    </>
  );
}
