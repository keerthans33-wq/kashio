"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "../../../lib/supabase";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { id: "employee",    label: "Employee" },
  { id: "contractor",  label: "Contractor" },
  { id: "sole_trader", label: "Sole trader" },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const existing = user?.user_metadata?.user_type;
      if (existing) setSelected(existing);
    });
  }, []);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.auth.updateUser({ data: { user_type: selected } });

    if (error) {
      setError("Couldn't save your selection. Please try again.");
      setLoading(false);
    } else {
      window.location.href = "/import";
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-12"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <div className="w-full max-w-[360px]">

        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-[30px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
            Who is this for?
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
            This helps Kashio find the right deductions for you.
          </p>
        </motion.div>

        <div className="space-y-3">
          {OPTIONS.map((option, i) => {
            const isSelected = selected === option.id;
            return (
              <motion.button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.07 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  backgroundColor: isSelected ? "rgba(124,58,237,0.10)" : "var(--bg-card)",
                  border: isSelected ? "1px solid rgba(124,58,237,0.5)" : "1px solid var(--bg-border)",
                  boxShadow: isSelected ? "0 0 16px rgba(124,58,237,0.12)" : "var(--shadow-card)",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150"
                  style={{
                    border: isSelected ? "2px solid var(--violet-from)" : "2px solid var(--text-muted)",
                    backgroundColor: isSelected ? "var(--violet-from)" : "transparent",
                  }}
                >
                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {option.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <Button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="mt-6 w-full"
        >
          {loading ? "Saving…" : "Continue"}
        </Button>

      </div>
    </main>
  );
}
