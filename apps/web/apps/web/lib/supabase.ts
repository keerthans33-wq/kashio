import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient stores the session in cookies so that server components,
// server actions, and API routes can all read it via lib/auth.ts.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
