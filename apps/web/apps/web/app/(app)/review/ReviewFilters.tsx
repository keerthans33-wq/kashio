"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

  const chipBase  = "rounded-full px-3 py-1 text-xs transition-all duration-150 border";
  const chipActive = { background: "var(--violet-from)", borderColor: "var(--violet-from)", color: "#fff" };
  const chipIdle   = { borderColor: "var(--bg-border)", color: "var(--text-muted)", background: "transparent" };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm transition-colors duration-150"
          style={{ color: hasFilters ? "var(--text-secondary)" : "var(--text-muted)" }}
        >
          {open ? "Hide filters" : "Filter"}
          {hasFilters && !open && (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--violet-from)" }} />
          )}
        </button>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm underline transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            Reset
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Category</span>
            {["", ...categories].map((c) => (
              <button key={c} onClick={() => update("category", c)} className={chipBase} style={category === c ? chipActive : chipIdle}>
                {c === "" ? "All" : c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Match</span>
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
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sort</span>
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
      )}
    </div>
  );
}
