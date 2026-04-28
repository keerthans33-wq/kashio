import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getUserWithEmail } from "@/lib/auth";

export const PRODUCT_KEY = "kashio_tax_summary_report";

export async function POST(req: Request) {
  // All Stripe logic runs server-side only — the secret key never reaches the client.
  const user = await getUserWithEmail();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priceId = process.env.STRIPE_PRICE_ID ?? process.env.STRIPE_PRICE_ID_TAX_SUMMARY;
  if (!priceId || priceId.startsWith("price_xxx")) {
    console.error("[checkout] STRIPE_PRICE_ID is not configured");
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  // Resolve the email to pre-fill in Stripe Checkout.
  // UserProfile has no separate billing_email field, so we use the Supabase auth email.
  // If you later add a billing_email column to UserProfile, look it up here first and
  // fall back to user.email only when it's null.
  const customerEmail = user.email ?? undefined;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode:                 "payment",
      // Explicitly restrict to card only — prevents Stripe Link from intercepting the flow
      // when customer_email matches a saved Link account.
      payment_method_types: ["card"],
      line_items:           [{ price: priceId, quantity: 1 }],

      // Pre-filling customer_email lets Stripe associate the payment with this address
      // and is required for automatic receipt/invoice delivery.
      // NOTE: Stripe only sends the receipt email automatically if
      // "Successful payments" is enabled in Dashboard → Settings → Customer emails.
      customer_email: customerEmail,

      metadata: {
        user_id: user.id,
        product: PRODUCT_KEY,
      },

      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/export`,

      // Applies Australian GST automatically based on the customer's location.
      // Requires: price tax_behavior = "exclusive" + AU tax registration in Stripe Tax.
      automatic_tax: { enabled: true },

      // Stripe creates a proper invoice PDF for each payment and emails it
      // to customer_email once the payment succeeds.
      invoice_creation: { enabled: true },
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
