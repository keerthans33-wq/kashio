"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ACTIVE_CATEGORIES } from "../../../lib/rules/categories";

export function ReviewFilters({ categories = ACTIVE_CATEGORIES }: { categories?: string[] }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [open, setOpen] = useState(false);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    value === "" ? next.delete(key) : next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  const category   = params.get("category") ?? "";
  const confidence = params.get("confidence") ?? "";
  const sort       = params.get("sort") ?? "";
  const hasFilters = category || confidence || sort;

  const chipBase   = "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 border";
  const chipActive = { background: "rgba(34,197,94,1)", borderColor: "rgba(34,197,94,1)", color: "#0A1F12" };
  const chipIdle   = { borderColor: "rgba(255,255,255,0.10)", color: "var(--text-muted)", background: "transparent" };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm transition-colors duration-150"
          style={{ color: hasFilters ? "var(--text-secondary)" : "var(--text-muted)" }}
        >
          {/* Filter icon */}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {open ? "Hide filters" : "Filter"}
          {hasFilters && !open && (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />
          )}
        </button>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="text-xs transition-colors duration-150 hover:opacity-100"
            style={{ color: "var(--text-muted)", opacity: 0.7 }}
          >
            Reset
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-4 space-y-3.5">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium w-14 shrink-0" style={{ color: "var(--text-muted)" }}>Category</span>
                {["", ...categories].map((c) => (
                  <button key={c} onClick={() => update("category", c)} className={chipBase} style={category === c ? chipActive : chipIdle}>
                    {c === "" ? "All" : c}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium w-14 shrink-0" style={{ color: "var(--text-muted)" }}>Match</span>
                {[
                  { value: "",       label: "All" },
                  { value: "HIGH",   label: "Strong" },
                  { value: "MEDIUM", label: "Possible" },
                  { value: "LOW",    label: "Weak" },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => update("confidence", value)} className={chipBase} style={confidence === value ? chipActive : chipIdle}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium w-14 shrink-0" style={{ color: "var(--text-muted)" }}>Sort</span>
                {[
                  { value: "",           label: "Date" },
                  { value: "amount",     label: "Amount" },
                  { value: "confidence", label: "Certainty" },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => update("sort", value)} className={chipBase} style={sort === value ? chipActive : chipIdle}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
