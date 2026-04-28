import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getUserWithEmail } from "@/lib/auth";

export const PRODUCT_KEY = "kashio_tax_summary_report";

export async function POST(req: Request) {
  const user = await getUserWithEmail();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priceId = process.env.STRIPE_PRICE_ID ?? process.env.STRIPE_PRICE_ID_TAX_SUMMARY;
  if (!priceId || priceId.startsWith("price_xxx")) {
    console.error("[checkout] STRIPE_PRICE_ID is not configured");
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"],
      line_items:           [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        product: PRODUCT_KEY,
      },
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/export`,
      automatic_tax: { enabled: true },
    });

    if (!session.url) {
      console.error("[checkout] session.url is null — id:", session.id);
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    console.log("[checkout] session created:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
