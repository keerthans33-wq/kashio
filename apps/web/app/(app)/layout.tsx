"use client";

import Nav from "../components/shell/Nav";
import { ThemeToggle } from "../components/shell/ThemeToggle";
import { UserContext, useUserContext } from "../../lib/user-context";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const userState = useUserContext();

  if (userState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={userState}>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <div className="flex-1">{children}</div>
        <footer style={{ borderTop: "1px solid var(--bg-elevated)" }}>
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-end gap-4" style={{ opacity: 0.45 }}>
            <ThemeToggle />
            <a
              href="mailto:feedback@kashio.app?subject=Kashio%20issue&body=Page%3A%20%0A%0AWhat%20happened%3A%20%0A%0AWhat%20I%20expected%3A%20"
              className="text-xs transition-opacity hover:opacity-100"
              style={{ color: "var(--text-muted)" }}
            >
              Report an issue
            </a>
            <a
              href="mailto:feedback@kashio.app?subject=Kashio%20feedback"
              className="text-xs transition-opacity hover:opacity-100"
              style={{ color: "var(--text-muted)" }}
            >
              Send feedback
            </a>
          </div>
        </footer>
      </div>
    </UserContext.Provider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
