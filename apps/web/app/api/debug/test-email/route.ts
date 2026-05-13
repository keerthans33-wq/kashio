import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Temporary diagnostic route — DELETE after confirming email works.
// Accessible only to logged-in users. Resets welcomeEmailSent and
// attempts a live send, returning the full Resend response or error.
export async function POST() {
  const userId = await requireUser();

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RESEND_API_KEY is not set in this environment" }, { status: 500 });
  }

  // Get the user's email from Supabase
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
  const email = user?.email;
  if (!email) {
    return NextResponse.json({ error: "No email found for user" }, { status: 400 });
  }

  // Reset the flag so this user can receive the email
  await db.userProfile.upsert({
    where:  { userId },
    update: { welcomeEmailSent: false },
    create: { userId, welcomeEmailSent: false },
  });

  // Attempt send and return full result
  const resend = new Resend(key);
  const result = await resend.emails.send({
    from:    "Kashio <hello@kashio.com.au>",
    to:      email,
    subject: "Welcome to Kashio (test)",
    html:    "<p>This is a test send from the diagnostic endpoint.</p>",
  });

  if (result.error) {
    return NextResponse.json({
      status:  "failed",
      email,
      keyPrefix: key.slice(0, 10) + "...",
      error: result.error,
    }, { status: 500 });
  }

  // Mark as sent now that we know it works
  await db.userProfile.update({
    where: { userId },
    data:  { welcomeEmailSent: true },
  });

  return NextResponse.json({
    status:    "sent",
    email,
    keyPrefix: key.slice(0, 10) + "...",
    resendId:  result.data?.id,
  });
}
