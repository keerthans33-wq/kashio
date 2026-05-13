"use client";

import { KashioLoader } from "./KashioLoader";

/**
 * Full-screen loading screen shown while the auth session is being resolved.
 * SplashScreen.hide() is handled by CapacitorSplashHider in the root layout,
 * so this component is purely visual.
 */
export function AppLoadingScreen() {
  return <KashioLoader fullScreen />;
}
