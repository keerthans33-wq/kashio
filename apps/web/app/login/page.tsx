"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";
import { isCapacitorIOS } from "../../lib/capacitor";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

type Mode = "signin" | "signup";

function friendlyError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Wrong email or password.";
  if (msg.includes("Email not confirmed"))        return "Confirm your email first, then sign in.";
  if (msg.includes("User already registered"))   return "Account already exists — sign in instead.";
  if (msg.includes("Password should be at least")) return "Password must be at least 6 characters.";
  if (msg.includes("rate limit"))                return "Too many attempts. Wait a moment and try again.";
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("Load failed") ||
    msg.includes("NetworkError") ||
    msg.includes("Network request failed") ||
    msg.includes("offline")
  ) return "No internet connection. Check your network and try again.";
  return msg;
}

export default function LoginPage() {
  const [mode,      setMode]      = useState<Mode>("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,      setLoading]      = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Please wait…");
  const [error,        setError]        = useState<string | null>(null);
  const [message,      setMessage]      = useState<string | null>(null);

  function reset() { setError(null); setMessage(null); }

  async function sha256(plain: string): Promise<string> {
    const data = new TextEncoder().encode(plain);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function handleSubmit() {
    reset();
    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
      setError("Enter your first and last name."); return;
    }
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoadingLabel(mode === "signin" ? "Signing in…" : "Creating your account…");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(friendlyError(error.message)); setLoading(false); return; }
        const userType = data.user?.user_metadata?.user_type;
        window.location.href = userType ? "/import" : "/onboarding";
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
        });
        if (error) { setError(friendlyError(error.message)); setLoading(false); return; }
        if (!data.session) {
          setMessage("Check your email for a confirmation link, then sign in.");
          setLoading(false);
          return;
        }
        window.location.href = "/onboarding";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(friendlyError(msg));
      setLoading(false);
    }
  }

  async function handleApple() {
    reset();
    setLoadingLabel("Signing in with Apple…");
    setLoading(true);

    if (isCapacitorIOS()) {
      try {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");

        // Apple requires the nonce to be SHA-256 hashed before sending to Apple,
        // and the raw nonce sent to Supabase for verification.
        const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const hashedNonce = await sha256(rawNonce);

        const result = await SignInWithApple.authorize({
          clientId: "au.com.kashio.app",
          redirectURI: "kashio://auth/callback",
          scopes: "email name",
          nonce: hashedNonce,
        });

        const { identityToken } = result.response;
        if (!identityToken) throw new Error("Apple sign-in returned no identity token.");

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: identityToken,
          nonce: rawNonce,
        });

        if (error) throw error;

        // Trigger welcome email for new accounts. Fire-and-forget.
        fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});

        const userType = data.user?.user_metadata?.user_type;
        window.location.href = userType ? "/import" : "/onboarding";
      } catch (err: any) {
        // Code 1001 = user dismissed the Apple sign-in sheet — not a real error.
        if (err?.code === 1001 || String(err?.message ?? "").toLowerCase().includes("cancel")) {
          setLoading(false);
          return;
        }
        setError(friendlyError(err instanceof Error ? err.message : "Apple sign-in failed. Please try again."));
        setLoading(false);
      }
      return;
    }

    // Web: standard OAuth redirect — Supabase handles Apple's OAuth server.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleGoogle() {
    reset();
    setLoadingLabel("Redirecting to Google…");
    setLoading(true);

    // iOS Capacitor: use SFSafariViewController + kashio:// deep-link callback
    if (isCapacitorIOS()) {
      const redirectTo = "kashio://auth/callback";
      console.log("[Kashio] Starting iOS Google OAuth with redirectTo:", redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options:  {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url, presentationStyle: "popover" });
        // Stay in loading — CapacitorAuthHandler handles the callback.
      }
      return;
    }

    // Web: standard redirect
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:  `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[360px]">

        {/* Logo + tagline */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex justify-center mb-1"><Logo height={80} /></div>
          <p className="mt-1 text-[15px]" style={{ color: "var(--text-muted)" }}>Your tax deductions, sorted.</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-2xl p-6 space-y-5"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card-lg)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        >

          {/* Mode tabs */}
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: "var(--bg-elevated)" }}>
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); reset(); }}
                className="flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150"
                style={mode === m
                  ? { backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }
                  : { backgroundColor: "transparent", color: "var(--text-muted)" }
                }
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Google */}
          <Button
            onClick={handleGoogle}
            disabled={loading}
            variant="secondary"
            className="w-full gap-3"
          >
            {loading && loadingLabel === "Redirecting to Google…" ? (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading && loadingLabel === "Redirecting to Google…" ? loadingLabel : "Continue with Google"}
          </Button>

          {/* Apple — white button per Apple HIG for dark surfaces */}
          <button
            type="button"
            onClick={handleApple}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-[14px] font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: "#FFFFFF", color: "#000000" }}
          >
            {loading && loadingLabel === "Signing in with Apple…" ? (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.42.07 2.41.74 3.24.8 1.23-.24 2.41-.93 3.72-.84 1.57.12 2.75.72 3.52 1.84-3.22 1.93-2.46 5.98.48 7.13-.57 1.39-1.32 2.76-2.96 3.93zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            )}
            {loading && loadingLabel === "Signing in with Apple…" ? loadingLabel : "Sign in with Apple"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--bg-border)" }} />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {/* Name fields — signup only */}
            {mode === "signup" && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>First name</label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); reset(); }}
                    className="h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                    style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Last name</label>
                  <input
                    type="text"
                    autoComplete="family-name"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); reset(); }}
                    className="h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                    style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); reset(); }}
                className="h-11 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); reset(); }}
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

          {/* Forgot password — signin only */}
          {mode === "signin" && (
            <div className="text-right -mt-1">
              <a href="/auth/forgot-password" className="text-xs" style={{ color: "var(--text-muted)" }}>
                Forgot password?
              </a>
            </div>
          )}

          {/* Feedback */}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-sm" style={{ color: "#22C55E" }}>{message}</p>
            </div>
          )}

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading && loadingLabel !== "Redirecting to Google…" && loadingLabel !== "Signing in with Apple…"
              ? loadingLabel
              : mode === "signin" ? "Sign in" : "Create account"}
          </Button>

        </motion.div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          Kashio is not a tax adviser. Always verify with your accountant.
        </p>

      </div>
    </main>
  );
}
