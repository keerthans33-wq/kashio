"use client";

import { useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit() {
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>Reset password</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {sent ? "Check your inbox" : "Enter your email and we'll send a reset link."}
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-xl px-4 py-4 text-center"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="text-sm" style={{ color: "#22C55E" }}>
              Reset link sent to <strong>{email}</strong>. Check your email and follow the link.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <Button onClick={handleSubmit} disabled={loading} className="mt-4 w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </>
        )}

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          <a href="/auth" className="font-medium" style={{ color: "var(--accent-green)" }}>Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
