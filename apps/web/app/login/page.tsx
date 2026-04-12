"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

type Mode = "signin" | "signup";

function friendlyError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Wrong email or password.";
  if (msg.includes("Email not confirmed"))        return "Confirm your email first, then sign in.";
  if (msg.includes("User already registered"))   return "Account already exists — sign in instead.";
  if (msg.includes("Password should be at least")) return "Password must be at least 6 characters.";
  if (msg.includes("rate limit"))                return "Too many attempts. Wait a moment and try again.";
  return msg;
}

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [message, setMessage]   = useState<string | null>(null);

  function reset() { setError(null); setMessage(null); }

  async function handleSubmit() {
    reset();
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(friendlyError(error.message)); setLoading(false); return; }
      const userType = data.user?.user_metadata?.user_type;
      window.location.href = userType ? "/import" : "/onboarding";
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(friendlyError(error.message)); setLoading(false); return; }
      if (!data.session) {
        setMessage("Check your email for a confirmation link, then sign in.");
        setLoading(false);
        return;
      }
      window.location.href = "/onboarding";
    }
  }

  async function handleGoogle() {
    reset();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold tracking-tight text-white">Kashio</span>
          <p className="mt-1 text-sm text-violet-200">Your tax deductions, sorted.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">

          {/* Mode tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); reset(); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all duration-150 ${
                  mode === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); reset(); }}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); reset(); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
              />
            </div>
          </div>

          {error   && <p className="text-sm text-red-500">{error}</p>}
          {message && (
            <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

        </div>

        <p className="mt-6 text-center text-xs text-violet-300">
          Kashio is not a tax adviser. Always verify with your accountant.
        </p>
      </div>
    </main>
  );
}
