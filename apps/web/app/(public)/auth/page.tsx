"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { isCapacitorIOS } from "../../../lib/capacitor";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

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
  if (
    message.includes("Failed to fetch") ||
    message.includes("Load failed") ||
    message.includes("NetworkError") ||
    message.includes("Network request failed") ||
    message.includes("offline")
  ) return "No internet connection. Check your network and try again.";
  return message;
}

export default function AuthPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Please wait…");
  const [message,      setMessage]      = useState<{ text: string; error: boolean } | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const userType = session.user.user_metadata?.user_type;
      window.location.href = userType ? "/import" : "/onboarding";
    });
  }, []);

  async function sha256(plain: string): Promise<string> {
    const data = new TextEncoder().encode(plain);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Basic checks before hitting Supabase
  function validate(): string | null {
    if (!email)    return "Please enter your email.";
    if (!password) return "Please enter your password.";
    return null;
  }

  async function handleSignIn() {
    const validationError = validate();
    if (validationError) { setMessage({ text: validationError, error: true }); return; }

    setLoadingLabel("Signing in…");
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ text: friendlyError(error.message), error: true });
      } else {
        const userType = data.user?.user_metadata?.user_type;
        window.location.href = userType ? "/import" : "/onboarding";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessage({ text: friendlyError(msg), error: true });
    }
    setLoading(false);
  }

  async function handleApple() {
    setLoadingLabel("Signing in with Apple…");
    setLoading(true);
    setMessage(null);

    if (isCapacitorIOS()) {
      try {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");

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

        fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});

        const userType = data.user?.user_metadata?.user_type;
        window.location.href = userType ? "/import" : "/onboarding";
      } catch (err: any) {
        if (err?.code === 1001 || String(err?.message ?? "").toLowerCase().includes("cancel")) {
          setLoading(false);
          return;
        }
        setMessage({ text: friendlyError(err instanceof Error ? err.message : "Apple sign-in failed. Please try again."), error: true });
        setLoading(false);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage({ text: error.message, error: true });
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoadingLabel("Redirecting to Google…");
    setLoading(true);
    setMessage(null);

    // iOS Capacitor: open OAuth in SFSafariViewController and handle the
    // kashio:// deep-link callback in CapacitorAuthHandler.
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
      if (error) {
        setMessage({ text: error.message, error: true });
        setLoading(false);
        return;
      }
      if (data?.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url, presentationStyle: "popover" });
        // Loading stays true — CapacitorAuthHandler handles the session and navigation.
      }
      return;
    }

    // Web: standard redirect flow
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
          <div className="flex justify-center mb-2"><Logo height={80} /></div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Sign in to your account</p>
        </div>

        {/* Google — primary CTA */}
        <Button
          variant="secondary"
          onClick={handleGoogle}
          disabled={loading}
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
          className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-[14px] font-medium transition-opacity disabled:opacity-50 hover:opacity-90 mt-3"
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

        {/* Forgot password */}
        <div className="mt-1 text-right">
          <a href="/auth/forgot-password" className="text-xs" style={{ color: "var(--text-muted)" }}>
            Forgot password?
          </a>
        </div>

        {/* Message */}
        {message && (
          <p className={`mt-3 text-sm ${message.error ? "text-red-400" : "text-green-500"}`}>
            {message.text}
          </p>
        )}

        {/* Sign in button */}
        <Button onClick={handleSignIn} disabled={loading} className="mt-4 w-full">
          {loading && loadingLabel !== "Redirecting to Google…" && loadingLabel !== "Signing in with Apple…"
            ? loadingLabel
            : "Sign in"}
        </Button>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <a href="/auth/signup" className="font-medium" style={{ color: "var(--accent-green)" }}>
            Create one
          </a>
        </p>

      </div>
    </main>
  );
}
