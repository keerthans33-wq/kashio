import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isValidUserType } from "../../../../lib/userType";
import { sendWelcomeEmailIfNew } from "../../../../lib/email/sendWelcomeEmail";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("Auth callback error:", error?.message);
      return NextResponse.redirect(`${origin}/login`);
    }

    // Only send welcome email if the account was created in the last 10 minutes.
    // This gates out every returning-user login before hitting the DB.
    // The sendWelcomeEmailIfNew function also checks welcomeEmailSent as a
    // secondary guard against edge-case double-fires.
    const accountAgeMs = Date.now() - new Date(data.user.created_at).getTime();
    if (accountAgeMs < 10 * 60 * 1000) {
      sendWelcomeEmailIfNew(data.user.id, data.user.email ?? null).catch((err) =>
        console.error("[welcome-email] failed:", err)
      );
    }

    // Password reset link — Supabase sets type=recovery
    if (searchParams.get("type") === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

    // Allow internal next-redirect. Only allow paths starting with /.
    const next = searchParams.get("next");
    if (next?.startsWith("/")) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const userType = data.user.user_metadata?.user_type;
    return NextResponse.redirect(
      `${origin}${isValidUserType(userType) ? "/import" : "/onboarding"}`
    );
  } catch (err) {
    console.error("Auth callback exception:", err);
    return NextResponse.redirect(`${origin}/login`);
  }
}
