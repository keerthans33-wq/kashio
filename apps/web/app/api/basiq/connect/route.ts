// POST /api/basiq/connect
//
// Called when the user wants to connect their bank via Basiq.
// 1. Looks up or creates a BasiqConnection record (one per app install for MVP).
// 2. Generates a Basiq consent URL.
// 3. Returns the URL so the client can redirect the user to it.

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createBasiqUser, updateBasiqUser, getAuthLink } from "../../../../lib/basiq/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // The redirect URL is where Basiq sends the user after they connect their bank.
  // The caller passes a redirectPath (e.g. "/import") so any page can trigger the flow.
  const origin = req.headers.get("origin") ?? "";
  const body = await req.json().catch(() => ({}));
  const redirectPath: string = typeof body.redirectPath === "string" ? body.redirectPath : "/connect";
  const redirectUrl = `${origin}${redirectPath}?connected=true`;
  const email: string = typeof body.email === "string" ? body.email.trim() : "user@kashio.app";
  const rawMobile: string = typeof body.mobile === "string" ? body.mobile.trim() : "";

  if (!rawMobile) {
    return NextResponse.json({ error: "Mobile number is required to connect your bank." }, { status: 400 });
  }

  // Normalise to E.164 — strips spaces, converts leading 0 to +61.
  const digits = rawMobile.replace(/[\s\-().]/g, "");
  const mobile = digits.startsWith("+") ? digits : `+61${digits.replace(/^0/, "")}`;


  try {
    // Check if we already have a Basiq user stored.
    let connection = await db.basiqConnection.findFirst();

    if (!connection) {
      const basiqUserId = await createBasiqUser(email, mobile);
      connection = await db.basiqConnection.create({ data: { basiqUserId } });
    } else {
      // Always update the stored mobile so Basiq pre-fills the correct number
      // on their desktop consent page (which reads from the user record).
      await updateBasiqUser(connection.basiqUserId, mobile);
    }

    const authLink = await getAuthLink(connection.basiqUserId, redirectUrl, mobile);

    return NextResponse.json({ authLink });
  } catch (err) {
    console.error("Basiq connect error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not connect to Basiq." },
      { status: 500 },
    );
  }
}
