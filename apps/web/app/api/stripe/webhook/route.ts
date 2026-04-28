import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { PRODUCT_KEY } from "../create-checkout-session/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[webhook] signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.user_id;

    if (!userId) {
      console.error("[webhook] checkout.session.completed missing user_id in metadata:", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      // 1. Record the payment
      await db.payment.upsert({
        where:  { stripeSessionId: session.id },
        create: {
          userId,
          stripeSessionId:       session.id,
          stripePaymentIntentId: typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
          amountTotal:   session.amount_total  ?? 0,
          currency:      session.currency      ?? "aud",
          paymentStatus: session.payment_status ?? "paid",
        },
        update: {
          paymentStatus: session.payment_status ?? "paid",
        },
      });

      // 2. Grant entitlement
      await db.userEntitlement.upsert({
        where:  { userId_productKey: { userId, productKey: PRODUCT_KEY } },
        create: { userId, productKey: PRODUCT_KEY, isActive: true },
        update: { isActive: true },
      });

      // 3. Keep legacy reportUnlocked flag for backward compat
      await db.userProfile.upsert({
        where:  { userId },
        create: { userId, reportUnlocked: true },
        update: { reportUnlocked: true },
      });

      console.log("[webhook] report unlocked for user:", userId);
    } catch (err) {
      console.error("[webhook] DB error for session", session.id, ":", err instanceof Error ? err.message : err);
      // Return 500 so Stripe retries
      return NextResponse.json({ error: "DB write failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
