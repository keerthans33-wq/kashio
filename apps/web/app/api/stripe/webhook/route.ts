import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { PRODUCT_KEY } from "@/lib/plan";

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

  // ── checkout.session.completed ─────────────────────────────────────────────
  // Fires once when the user completes the Stripe checkout flow.
  // Grants Pro access by writing UserEntitlement.isActive = true.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.user_id;

    if (!userId) {
      console.error("[webhook] checkout.session.completed missing user_id in metadata:", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      // 1. Record the payment / subscription start.
      await db.payment.upsert({
        where:  { stripeSessionId: session.id },
        create: {
          userId,
          stripeSessionId:       session.id,
          // payment_intent is null for subscriptions; subscription ID is in session.subscription
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

      // 2. Grant Pro entitlement.
      //    One subscription unlocks Export, Receipts, Review, and Dashboard.
      await db.userEntitlement.upsert({
        where:  { userId_productKey: { userId, productKey: PRODUCT_KEY } },
        create: { userId, productKey: PRODUCT_KEY, isActive: true },
        update: { isActive: true },
      });

      // 3. Mirror to legacy UserProfile.reportUnlocked for backward compat.
      await db.userProfile.upsert({
        where:  { userId },
        create: { userId, reportUnlocked: true },
        update: { reportUnlocked: true },
      });

      console.log("[webhook] Pro granted for user:", userId);
    } catch (err) {
      console.error("[webhook] DB error for session", session.id, ":", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "DB write failed" }, { status: 500 });
    }
  }

  // ── customer.subscription.deleted ─────────────────────────────────────────
  // Fires when the user cancels their subscription (at period end) or when
  // Stripe hard-cancels after too many failed renewal payments.
  // Revokes Pro access by setting UserEntitlement.isActive = false.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId       = subscription.metadata?.user_id;

    if (!userId) {
      console.error("[webhook] customer.subscription.deleted missing user_id in metadata:", subscription.id);
      return NextResponse.json({ received: true });
    }

    try {
      await db.userEntitlement.updateMany({
        where: { userId, productKey: PRODUCT_KEY },
        data:  { isActive: false },
      });

      // Mirror to legacy flag.
      await db.userProfile.updateMany({
        where: { userId },
        data:  { reportUnlocked: false },
      });

      console.log("[webhook] Pro revoked for user:", userId, "subscription:", subscription.id);
    } catch (err) {
      console.error("[webhook] DB error revoking Pro for user", userId, ":", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "DB write failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
