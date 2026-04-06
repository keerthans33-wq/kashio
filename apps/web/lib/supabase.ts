import { createBrowserClient } from "@supabase/ssr";

// NEXT_PUBLIC_ vars are embedded at build time.
// Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your
// Vercel project settings (Settings → Environment Variables) before deploying.
//
// Using createBrowserClient (from @supabase/ssr) so the session is stored in
// cookies rather than localStorage — this lets server components and actions
// read the session via createServerClient in lib/auth.ts.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
