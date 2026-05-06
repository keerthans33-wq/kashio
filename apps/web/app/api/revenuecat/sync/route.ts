import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRODUCT_KEY } from "@/lib/plan";

const RC_ENTITLEMENT = "pro";

type RCEntitlement = {
  expires_date:             string | null;
  grace_period_expires_date: string | null;
  product_identifier:       string;
  purchase_date:            string;
};

type RCSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RCEntitlement>;
  };
};

function isEntitlementActive(e: RCEntitlement): boolean {
  if (e.expires_date === null) return true; // lifetime
  if (new Date(e.expires_date) > new Date()) return true;
  // grace period
  if (e.grace_period_expires_date && new Date(e.grace_period_expires_date) > new Date()) return true;
  return false;
}

export async function POST() {
  const userId = await getUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "RC not configured" }, { status: 500 });
  }

  // Verify entitlement server-side via RC REST API
  const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!rcRes.ok) {
    return NextResponse.json({ error: "RC API error" }, { status: 502 });
  }

  const data = await rcRes.json() as RCSubscriberResponse;
  const entitlement = data.subscriber?.entitlements?.[RC_ENTITLEMENT];
  const isActive = !!entitlement && isEntitlementActive(entitlement);

  await db.userEntitlement.upsert({
    where:  { userId_productKey: { userId, productKey: PRODUCT_KEY } },
    create: { userId, productKey: PRODUCT_KEY, isActive },
    update: { isActive },
  });

  return NextResponse.json({ ok: true, isActive });
}
