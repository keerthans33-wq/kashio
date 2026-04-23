import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getUser } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priceId = process.env.STRIPE_PRICE_ID_TAX_SUMMARY;
  if (!priceId || priceId === "price_xxx") {
    console.error("[checkout] STRIPE_PRICE_ID_TAX_SUMMARY is not set or is a placeholder");
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode:       "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata:   { userId },
      success_url: `${origin}/export/success`,
      cancel_url:  `${origin}/export`,
    });

    console.log("[checkout] session created:", session.id, "url:", session.url);

    if (!session.url) {
      console.error("[checkout] session.url is null — session id:", session.id);
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
