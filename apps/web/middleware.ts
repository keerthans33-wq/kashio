// Supabase session middleware — required for @supabase/ssr to work correctly.
//
// On every request this middleware:
//  1. Creates a Supabase server client that can read + write cookies
//  2. Calls getUser() to refresh the access token if it's near expiry
//  3. Writes the updated session back to the response cookies
//
// Without this, the session cookie set by createBrowserClient (after sign-in)
// isn't propagated to server components, so requireUser() returns null and
// AuthGuard redirects signed-in users back to /auth.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        // Write updated cookies back to both the request and the response
        // so subsequent server reads in this request cycle see them too.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the token if needed and updates cookies.
  // Do not add any logic between createServerClient and getUser().
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
