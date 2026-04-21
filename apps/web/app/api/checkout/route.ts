import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priceId = process.env.STRIPE_PRICE_ID_TAX_SUMMARY;
  if (!priceId) return NextResponse.json({ error: "Price not configured" }, { status: 500 });

  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode:       "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata:   { userId },
    success_url: `${origin}/export?unlocked=1`,
    cancel_url:  `${origin}/export`,
  });

  return NextResponse.json({ url: session.url });
}
