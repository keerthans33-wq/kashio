"use client";

import { useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

function friendlyError(message: string): string {
  if (message.includes("User already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (message.includes("Password should be at least"))
    return "Password must be at least 6 characters.";
  if (message.includes("invalid format") || message.includes("valid email"))
    return "Please enter a valid email address.";
  if (message.includes("rate limit") || message.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  return message;
}

const inputClass = "h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]";
const inputStyle = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  color: "var(--text-primary)",
} as const;

const LEGAL_VERSION = "2026-04-25";

export default function SignUpPage() {
  const [firstName,     setFirstName]     = useState("");
  const [lastName,      setLastName]      = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [message,       setMessage]       = useState<{ text: string; error: boolean } | null>(null);

  function validate(): string | null {
    if (!firstName.trim()) return "Please enter your first name.";
    if (!lastName.trim())  return "Please enter your last name.";
    if (!email)            return "Please enter your email.";
    if (!password)         return "Please enter your password.";
    if (!legalAccepted)    return "Please agree to the Terms and Conditions and Privacy Policy.";
    return null;
  }

  async function handleSignUp() {
    const err = validate();
    if (err) { setMessage({ text: err, error: true }); return; }

    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name:              firstName.trim(),
          last_name:               lastName.trim(),
          legal_terms_accepted:    true,
          legal_terms_accepted_at: new Date().toISOString(),
          legal_terms_version:     LEGAL_VERSION,
        },
      },
    });
    if (error) {
      setMessage({ text: friendlyError(error.message), error: true });
    } else {
      setMessage({ text: "Account created! Check your email to confirm before signing in.", error: false });
    }
    setLoading(false);
  }

  async function handleGoogle() {
    if (!legalAccepted) {
      setMessage({ text: "Please agree to the Terms and Conditions and Privacy Policy.", error: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    // TODO: Save legal_terms_accepted metadata for Google OAuth users after callback completes
    // (Supabase OAuth does not support passing user_metadata at sign-in time)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  {
        redirectTo:  `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setMessage({ text: error.message, error: true });
      setLoading(false);
    }
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
          <div className="flex justify-center mb-2"><Logo height={80} /></div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Create your account</p>
        </div>

        {/* Google */}
        <Button variant="secondary" onClick={handleGoogle} disabled={loading} className="w-full gap-3">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-border)" }} />
        </div>

        <div className="space-y-3">
          {/* Name row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>First name</label>
              <input
                type="text"
                autoComplete="given-name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Last name</label>
              <input
                type="text"
                autoComplete="family-name"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Legal acceptance checkbox */}
        <div className="flex items-start gap-2.5 mt-4">
          <input
            type="checkbox"
            id="legal-accept"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#22C55E]"
          />
          <label htmlFor="legal-accept" className="text-xs leading-relaxed cursor-pointer" style={{ color: "var(--text-muted)" }}>
            I agree to the{" "}
            <a
              href="https://kashio.com.au/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              Terms and Conditions
            </a>{" "}
            and{" "}
            <a
              href="https://kashio.com.au/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              Privacy Policy
            </a>.
          </label>
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.error ? "text-red-400" : "text-green-500"}`}>
            {message.text}
          </p>
        )}

        <Button onClick={handleSignUp} disabled={loading || !legalAccepted} className="mt-4 w-full">
          {loading ? "Please wait…" : "Create account"}
        </Button>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <a href="/auth" className="font-medium" style={{ color: "var(--accent-green)" }}>Sign in</a>
        </p>
      </div>
    </main>
  );
}
