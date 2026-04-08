"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("LOGIN RESULT:", data, error);

    if (error) {
      alert(error.message);
      return;
    }

    // ✅ IMPORTANT: redirect after login
    window.location.href = "/import";
  }

  async function handleSignup() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("SIGNUP RESULT:", data, error);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created! Now log in.");
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>Sign In</button>
      <button onClick={handleSignup}>Create Account</button>

      <br /><br />

      <button onClick={handleGoogleLogin}>
        Continue with Google
      </button>
    </div>
  );
}
