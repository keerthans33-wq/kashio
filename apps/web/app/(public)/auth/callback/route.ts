import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isValidUserType } from "../../../../lib/user-context";

// Handles the OAuth callback from Google (and any other provider).
// Exchanges the one-time ?code= for a real session server-side,
// where cookies can be reliably read and written.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
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
    if (!error) {
      // New users (no valid user_type) go to onboarding, returning users go to import
      const userType = data.user?.user_metadata?.user_type;
      return NextResponse.redirect(`${origin}${isValidUserType(userType) ? "/import" : "/onboarding"}`);
    }
  }

  // Something went wrong — send back to login
  return NextResponse.redirect(`${origin}/login`);
}
