"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: friendlyError(error.message), error: true });
    } else {
      window.location.href = "/import";
    }
    setLoading(false);
  }

  async function handleSignUp() {
    const validationError = validate();
    if (validationError) { setMessage({ text: validationError, error: true }); return; }

    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage({ text: friendlyError(error.message), error: true });
    } else {
      setMessage({ text: "Account created! Check your email to confirm before signing in.", error: false });
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage({ text: error.message, error: true });
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / heading */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Kashio</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Email + password */}
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        {/* Message */}
        {message && (
          <p className={`mt-3 text-sm ${message.error ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
            {message.text}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Please wait…" : "Sign in"}
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Create account
          </button>
        </div>

      </div>
    </main>
  );
}
