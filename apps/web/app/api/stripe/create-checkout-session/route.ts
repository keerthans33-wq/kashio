import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getUserWithEmail } from "@/lib/auth";
import { PRODUCT_KEY } from "@/lib/plan";

export { PRODUCT_KEY };

// Single checkout endpoint for Kashio Pro subscriptions.
// Called by all paywall UIs: PaywallGate (/export), ProPaywallModal (receipts),
// ReviewPaywallCard (/review). One subscription unlocks all features via isProUser().
//
// Body: { interval?: "month" | "year", cancelPath?: string }
//   interval   — defaults to "month"; selects the Stripe price to charge
//   cancelPath — the path to return to if the user cancels checkout (default: "/export")
export async function POST(req: Request) {
  const user = await getUserWithEmail();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    interval?:   "month" | "year";
    cancelPath?: string;
  };
  const interval   = body.interval   === "year" ? "year" : "month";
  const cancelPath = body.cancelPath ?? "/export";

  // Resolve price ID for the requested billing interval.
  // Falls back to the legacy STRIPE_PRICE_ID for existing deployments.
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID
    ?? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
    ?? process.env.STRIPE_PRICE_ID;
  const annualPriceId  = process.env.STRIPE_ANNUAL_PRICE_ID
    ?? process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
    ?? process.env.STRIPE_PRICE_ID;
  const priceId = interval === "year" ? annualPriceId : monthlyPriceId;

  if (!priceId || priceId.startsWith("price_xxx")) {
    console.error("[checkout] Stripe price ID not configured for interval:", interval);
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode:                 "subscription",
      // Card only — prevents Stripe Link from intercepting with a saved account.
      payment_method_types: ["card"],
      line_items:           [{ price: priceId, quantity: 1 }],

      metadata: {
        user_id: user.id,
        product: PRODUCT_KEY,
      },

      // Store user_id on the subscription itself so customer.subscription.deleted
      // can look up the right entitlement row without a separate customer lookup.
      subscription_data: {
        metadata: {
          user_id: user.id,
          product: PRODUCT_KEY,
        },
      },

      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}${cancelPath}`,

      // Australian GST — requires price tax_behavior="exclusive" + AU tax registration.
      automatic_tax: { enabled: true },
    });

    if (!session.url) {
      console.error("[checkout] session.url is null — id:", session.id);
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    console.log("[checkout] subscription session created:", session.id, "interval:", interval);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
