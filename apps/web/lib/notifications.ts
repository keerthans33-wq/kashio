/**
 * Local notification helpers — Capacitor iOS only.
 * All functions are best-effort: they never throw, never block the caller.
 * Dynamic imports keep this out of the web bundle entirely.
 */

import { isCapacitorIOS } from "./capacitor";

const PREF_ENABLED = "kashio_reminders_enabled";
const PREF_ASKED   = "kashio_reminders_asked";

export const NOTIF_ID = {
  REVIEW:  1,
  EXPORT:  2,
  RECEIPT: 3,
} as const;

// ── Preference helpers ─────────────────────────────────────────────────────────

export function getRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREF_ENABLED) === "true";
}

export function setRemindersEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_ENABLED, v ? "true" : "false");
}

export function hasAskedPermission(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREF_ASKED) === "true";
}

// ── Plugin access ──────────────────────────────────────────────────────────────

async function getPlugin() {
  if (!isCapacitorIOS()) return null;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
  } catch {
    return null;
  }
}

// ── Permission ─────────────────────────────────────────────────────────────────

export async function checkPermission(): Promise<"granted" | "denied" | "prompt"> {
  const plugin = await getPlugin();
  if (!plugin) return "denied";
  try {
    const { display } = await plugin.checkPermissions();
    return display as "granted" | "denied" | "prompt";
  } catch {
    return "denied";
  }
}

/**
 * Request iOS permission.
 * Only call this after showing an in-app explanation.
 * Returns true if granted.
 */
export async function requestPermission(): Promise<boolean> {
  localStorage.setItem(PREF_ASKED, "true");
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const { display } = await plugin.requestPermissions();
    const granted = display === "granted";
    setRemindersEnabled(granted);
    return granted;
  } catch {
    return false;
  }
}

// ── Cancel ─────────────────────────────────────────────────────────────────────

export async function cancelNotification(id: number): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id }] });
  } catch {
    // best-effort
  }
}

// ── Schedule ───────────────────────────────────────────────────────────────────

async function schedule(id: number, body: string, delayMs: number): Promise<void> {
  if (!getRemindersEnabled()) return;
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.schedule({
      notifications: [{
        id,
        title: "Kashio",
        body,
        schedule: { at: new Date(Date.now() + delayMs) },
        // Re-schedule replaces any existing notification with the same id
      }],
    });
  } catch {
    // best-effort
  }
}

/** 24 h after CSV import — cancelled when user visits /review */
export function scheduleReviewReminder(): Promise<void> {
  return schedule(
    NOTIF_ID.REVIEW,
    "Kashio found possible deductions waiting for review.",
    24 * 60 * 60 * 1000,
  );
}

/** 48 h after all items reviewed — cancelled after export */
export function scheduleExportReminder(): Promise<void> {
  return schedule(
    NOTIF_ID.EXPORT,
    "Your Kashio report is almost ready to export.",
    48 * 60 * 60 * 1000,
  );
}

/** 2 h after reaching 4/5 free receipt limit — cancelled after Pro upgrade */
export function scheduleReceiptLimitReminder(): Promise<void> {
  return schedule(
    NOTIF_ID.RECEIPT,
    "You're close to your free receipt upload limit.",
    2 * 60 * 60 * 1000,
  );
}
