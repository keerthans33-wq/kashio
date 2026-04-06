// Server-side auth helpers.
//
// requireUser() — for server components and actions: redirects to /auth if
//   the visitor is not signed in. Returns the Supabase user ID.
//
// getUser() — for API route handlers: returns the user ID or null without
//   redirecting (callers return a 401 Response themselves).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function makeServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // read-only in server components / actions
      },
    },
  );
}

export async function requireUser(): Promise<string> {
  const supabase = await makeServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth");
  return session.user.id;
}

export async function getUser(): Promise<string | null> {
  const supabase = await makeServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}
