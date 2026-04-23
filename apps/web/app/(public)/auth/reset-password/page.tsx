"use client";

import { useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!password)               { setError("Please enter a new password."); return; }
    if (password.length < 6)     { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)    { setError("Passwords don't match."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = "/auth"; }, 2500);
    }
    setLoading(false);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-7 py-8"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card-lg)" }}
      >
        <div className="mb-7 text-center">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>New password</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {done ? "Password updated" : "Choose a new password for your account."}
          </p>
        </div>

        {done ? (
          <div
            className="rounded-xl px-4 py-4 text-center"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="text-sm" style={{ color: "#22C55E" }}>
              Password updated. Taking you to sign in…
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>New password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Same password again"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <Button onClick={handleSubmit} disabled={loading} className="mt-4 w-full">
              {loading ? "Updating…" : "Update password"}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
