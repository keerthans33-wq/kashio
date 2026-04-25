"use client";

import Nav from "../components/shell/Nav";
import { ThemeToggle } from "../components/shell/ThemeToggle";
import { UserContext, useUserContext } from "../../lib/user-context";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const userState = useUserContext();

  if (userState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#22C55E]" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={userState}>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <div className="flex-1">{children}</div>
        <footer style={{ borderTop: "1px solid var(--bg-border)" }}>
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between gap-4" style={{ opacity: 0.45 }}>
            <ThemeToggle />
            <div className="flex items-center gap-4">
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
              <a
                href="https://kashio.com.au/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Privacy
              </a>
              <a
                href="https://kashio.com.au/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Terms
              </a>
              <a
                href="https://kashio.com.au/legal/disclaimer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                Disclaimer
              </a>
            </div>
          </div>
        </footer>
      </div>
    </UserContext.Provider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
