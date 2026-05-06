import { Capacitor } from "@capacitor/core";

export function isCapacitorIOS(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
