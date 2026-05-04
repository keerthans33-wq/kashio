import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getUserWithEmail } from "@/lib/auth";
import { PRODUCT_KEY } from "@/lib/plan";

export { PRODUCT_KEY };

// This is the single checkout endpoint for Kashio Pro.
// It is called by both the Export paywall (PaywallGate) and the Receipt paywall
// (ProPaywallModal) — there is only one Pro plan and one Stripe price.
// On success, the webhook writes UserEntitlement { productKey: PRODUCT_KEY, isActive: true },
// which simultaneously unlocks Export and full Receipt storage via isProUser() in lib/plan.ts.
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

  try {
    const session = await getStripe().checkout.sessions.create({
      mode:                 "payment",
      // Explicitly restrict to card only — prevents Stripe Link from intercepting the flow
      // when customer_email matches a saved Link account.
      payment_method_types: ["card"],
      line_items:           [{ price: priceId, quantity: 1 }],

      // Do NOT pre-fill customer_email here — Stripe uses it to look up saved Link accounts
      // and redirects the user through Link auth before showing the card form.
      // Instead, Stripe captures the email the customer types during checkout and uses
      // that for receipt/invoice delivery automatically.
      // NOTE: enable "Successful payments" in Dashboard → Settings → Customer emails
      // for Stripe to actually send the receipt.

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
