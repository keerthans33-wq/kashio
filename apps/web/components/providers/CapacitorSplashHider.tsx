"use client";

import { useEffect } from "react";

/**
 * Hides the Capacitor native splash screen once React has mounted.
 * Placed in the root layout so it fires on EVERY route — login, onboarding,
 * dashboard — regardless of whether the user is authenticated.
 *
 * Using launchAutoHide: false in capacitor.config.ts means nothing hides the
 * splash automatically. Without this component the splash sticks if the user
 * lands on a route outside the (app) layout (e.g. /login).
 */
export function CapacitorSplashHider() {
  useEffect(() => {
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {});
  }, []);

  return null;
}
