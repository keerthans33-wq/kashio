"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

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

        <div className="mb-8">
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Who is this for?
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            This helps Kashio find the right deductions for you.
          </p>
        </div>

        <div className="space-y-3">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className="flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  backgroundColor: isSelected ? "rgba(124,58,237,0.10)" : "var(--bg-card)",
                  border: isSelected ? "1px solid var(--violet-from)" : "1px solid var(--bg-elevated)",
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
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          {loading ? "Saving…" : "Continue"}
        </button>

      </div>
    </main>
  );
}
