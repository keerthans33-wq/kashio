"use client";

import Nav from "../components/shell/Nav";
import { ThemeToggle } from "../components/shell/ThemeToggle";
import { UserContext, useUserContext } from "../../lib/user-context";
import { ReceiptUploadFab } from "../../components/shared/ReceiptUploadFab";
import { BottomNav } from "../../components/ui/bottom-nav";
import { RevenueCatProvider } from "../../components/providers/RevenueCatProvider";
import { AppLoadingScreen } from "../../components/shared/AppLoadingScreen";
import { OfflineBanner } from "../../components/shared/OfflineBanner";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const userState = useUserContext();

  if (userState.loading) {
    return <AppLoadingScreen />;
  }

  return (
    <UserContext.Provider value={userState}>
      <RevenueCatProvider>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <OfflineBanner />

        {/* pb-36 clears both the fixed bottom nav (64px) and the receipt FAB (~126px top edge) on mobile */}
        <div className="flex-1 pb-36 sm:pb-0">{children}</div>

        <ReceiptUploadFab />
        <BottomNav />

        {/* Footer hidden on mobile — bottom nav takes its place */}
        <footer className="hidden sm:block" style={{ borderTop: "1px solid var(--bg-border)" }}>
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between gap-4" style={{ opacity: 0.45 }}>
            <ThemeToggle />
            <div className="flex items-center gap-4">
              <a
                href="mailto:support@kashio.com.au?subject=Kashio%20issue&body=Page%3A%20%0A%0AWhat%20happened%3A%20%0A%0AWhat%20I%20expected%3A%20"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Report an issue
              </a>
              <a
                href="mailto:info@kashio.com.au?subject=Kashio%20feedback"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Send feedback
              </a>
              <a
                href="/privacy"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Terms
              </a>
              <a
                href="/support"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Support
              </a>
            </div>
          </div>
        </footer>
      </div>
      </RevenueCatProvider>
    </UserContext.Provider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
