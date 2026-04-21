"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function ExportSuccess() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/export"), 3500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <motion.div
        className="w-full max-w-sm text-center space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Icon */}
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            backgroundColor: "rgba(34,197,94,0.10)",
            border:          "1px solid rgba(34,197,94,0.22)",
            boxShadow:       "0 0 40px rgba(34,197,94,0.12)",
          }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: "#22C55E" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        {/* Copy */}
        <div className="space-y-2">
          <h1
            className="text-[24px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Payment successful
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Your report is being unlocked. You'll be taken to your export in a moment.
          </p>
        </div>

        {/* Subtle redirect hint */}
        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Redirecting you now…
        </p>
      </motion.div>
    </div>
  );
}
