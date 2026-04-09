import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function makeServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
}

// For server components and actions: redirects to /login if not signed in.
export async function requireUser(): Promise<string> {
  const supabase = await makeServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

// Like requireUser() but also returns user_type from metadata.
export async function requireUserWithType(): Promise<{ id: string; userType: string | null }> {
  const supabase = await makeServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { id: user.id, userType: user.user_metadata?.user_type ?? null };
}

// For API routes: returns the user ID or null (caller handles the 401).
export async function getUser(): Promise<string | null> {
  const supabase = await makeServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
