// POST /api/basiq/connect
//
// Called when the user wants to connect their bank via Basiq.
// 1. Looks up or creates a BasiqConnection record (one per app install for MVP).
// 2. Generates a Basiq consent URL.
// 3. Returns the URL so the client can redirect the user to it.

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createBasiqUser, getAuthLink } from "../../../../lib/basiq/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // The redirect URL is where Basiq sends the user after they connect their bank.
  // The caller passes a redirectPath (e.g. "/import") so any page can trigger the flow.
  const origin = req.headers.get("origin") ?? "";
  const body = await req.json().catch(() => ({}));
  const redirectPath: string = typeof body.redirectPath === "string" ? body.redirectPath : "/connect";
  const redirectUrl = `${origin}${redirectPath}?connected=true`;

  try {
    // Check if we already have a Basiq user stored.
    let connection = await db.basiqConnection.findFirst();

    if (!connection) {
      // No connection yet — create a new Basiq user.
      // For MVP, we use a placeholder email. Replace with real user email if you add auth.
      const basiqUserId = await createBasiqUser("user@kashio.app");
      connection = await db.basiqConnection.create({
        data: { basiqUserId },
      });
    }

    // Generate a fresh consent link (links expire, so always create a new one).
    const authLink = await getAuthLink(connection.basiqUserId, redirectUrl);

    return NextResponse.json({ authLink });
  } catch (err) {
    console.error("Basiq connect error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not connect to Basiq." },
      { status: 500 },
    );
  }
}
