"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

const OPTIONS = [
  { id: "employee",    label: "Employee" },
  { id: "contractor",  label: "Contractor / Freelancer" },
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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Who is this for?</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">This helps Kashio find the right deductions for you.</p>

        <div className="mt-8 space-y-3">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={`flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-colors ${
                  isSelected
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? "border-violet-500 bg-violet-500" : "border-gray-300 dark:border-gray-600"
                }`}>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className={`text-sm font-semibold ${isSelected ? "text-violet-700 dark:text-violet-300" : "text-gray-900 dark:text-gray-100"}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Saving…" : "Continue"}
        </button>

      </div>
    </main>
  );
}
