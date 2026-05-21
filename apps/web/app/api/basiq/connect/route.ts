// POST /api/basiq/connect
//
// Called when the user wants to connect their bank via Basiq.
// 1. Looks up or creates a BankConnection record for this user.
// 2. Generates a Basiq consent URL.
// 3. Returns the URL so the client can redirect the user to it.

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createBasiqUserForKashioUser, updateBasiqUser, getAuthLink } from "../../../../lib/basiq/client";
import { getUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    // Look up an existing Basiq connection for this user.
    let connection = await db.bankConnection.findUnique({
      where: { userId_provider: { userId, provider: "basiq" } },
    });

    if (!connection) {
      const basiqUserId = await createBasiqUserForKashioUser(email, mobile);
      connection = await db.bankConnection.create({
        data: { userId, provider: "basiq", basiqUserId },
      });
    } else {
      if (!connection.basiqUserId) {
        return NextResponse.json({ error: "Connection is missing a Basiq user ID." }, { status: 500 });
      }
      // Update mobile so Basiq pre-fills the correct number, and reactivate if disconnected.
      await Promise.all([
        updateBasiqUser(connection.basiqUserId, mobile),
        db.bankConnection.update({
          where: { id: connection.id },
          data:  { status: "active" },
        }),
      ]);
    }

    if (!connection.basiqUserId) {
      return NextResponse.json({ error: "Could not resolve Basiq user ID." }, { status: 500 });
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
