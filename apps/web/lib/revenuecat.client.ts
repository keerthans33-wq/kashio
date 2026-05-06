"use client";

import { Purchases } from "@revenuecat/purchases-capacitor";
import type { PurchasesPackage, CustomerInfo } from "@revenuecat/purchases-capacitor";

export { type PurchasesPackage, type CustomerInfo };

export const RC_ENTITLEMENT = "pro";

export async function configureRC(appUserID: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
  await Purchases.configure({ apiKey, appUserID });
}

export async function getOfferings() {
  return Purchases.getOfferings();
}

export async function purchasePackage(aPackage: PurchasesPackage) {
  return Purchases.purchasePackage({ aPackage });
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo() {
  return Purchases.getCustomerInfo();
}

export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return RC_ENTITLEMENT in (customerInfo.entitlements?.active ?? {});
}
