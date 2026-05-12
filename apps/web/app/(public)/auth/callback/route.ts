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

    // Fire-and-forget: send welcome email to new users only.
    // Does not block the redirect — failure is logged but swallowed.
    sendWelcomeEmailIfNew(data.user.id, data.user.email ?? null).catch((err) =>
      console.error("[welcome-email] failed:", err)
    );

    // Allow internal next-redirect (e.g. password reset). Only allow paths starting with /.
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
