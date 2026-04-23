"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Button } from "@/components/ui/button";

// Maps Supabase error messages to plain, friendly language.
function friendlyError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Wrong email or password. Please try again.";
  if (message.includes("User already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (message.includes("Email not confirmed"))
    return "Please check your email and click the confirmation link first.";
  if (message.includes("Password should be at least"))
    return "Password must be at least 6 characters.";
  if (message.includes("invalid format") || message.includes("valid email"))
    return "Please enter a valid email address.";
  if (message.includes("rate limit") || message.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  // Fall back to the original message if we don't have a mapping
  return message;
}

export default function AuthPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<{ text: string; error: boolean } | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const userType = session.user.user_metadata?.user_type;
      window.location.href = userType ? "/import" : "/onboarding";
    });
  }, []);

  // Basic checks before hitting Supabase
  function validate(): string | null {
    if (!email)    return "Please enter your email.";
    if (!password) return "Please enter your password.";
    return null;
  }

  async function handleSignIn() {
    const validationError = validate();
    if (validationError) { setMessage({ text: validationError, error: true }); return; }

    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: friendlyError(error.message), error: true });
    } else {
      const userType = data.user?.user_metadata?.user_type;
      window.location.href = userType ? "/import" : "/onboarding";
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setMessage(null);
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

        {/* Logo / heading */}
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>Kashio</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Sign in to your account</p>
        </div>

        {/* Google — primary CTA */}
        <Button
          variant="secondary"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full gap-3"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-border)" }} />
        </div>

        {/* Email + password */}
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors duration-150"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors duration-150"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Message */}
        {message && (
          <p className={`mt-3 text-sm ${message.error ? "text-red-400" : "text-green-500"}`}>
            {message.text}
          </p>
        )}

        {/* Sign in button */}
        <Button onClick={handleSignIn} disabled={loading} className="mt-4 w-full">
          {loading ? "Please wait…" : "Sign in"}
        </Button>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <a href="/auth/signup" className="font-medium" style={{ color: "var(--violet-from)" }}>
            Create one
          </a>
        </p>

      </div>
    </main>
  );
}
