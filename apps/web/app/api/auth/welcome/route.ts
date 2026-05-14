import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendWelcomeEmailIfNew } from "@/lib/email/sendWelcomeEmail";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Called by the iOS Capacitor auth handler after exchangeCodeForSession.
// The web /auth/callback route handles this automatically, but iOS exchanges
// the code client-side and never hits that route.
export async function POST() {
  try {
    const userId = await requireUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Only proceed for accounts created in the last 10 minutes (new sign-ups).
    const accountAgeMs = user?.created_at
      ? Date.now() - new Date(user.created_at).getTime()
      : Infinity;
    if (accountAgeMs < 10 * 60 * 1000) {
      await sendWelcomeEmailIfNew(userId, user?.email ?? null);
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Fire-and-forget — never block the iOS auth flow
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
