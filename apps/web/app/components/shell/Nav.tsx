"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useUser } from "../../../lib/user-context";

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/import",    label: "Import" },
  { href: "/review",    label: "Review" },
  { href: "/export",    label: "Export" },
  { href: "/wfh",       label: "WFH" },
];

export default function Nav() {
  const pathname = usePathname();
  const { user }  = useUser();

  const [open, setOpen] = useState(false);
  const dropRef         = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close dropdown on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const initial = user?.email?.[0]?.toUpperCase() ?? "";

  async function handleSignOut() {
    setOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        backgroundColor:      "rgba(5, 7, 14, 0.88)",
        borderBottom:         "1px solid var(--bg-border)",
        backdropFilter:       "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-stretch h-12 pl-1 pr-2">

        {/* ── Tab links — scrollable, all 5 always visible ─────────────────── */}
        <div className="flex flex-1 items-stretch overflow-x-auto scrollbar-none min-w-0">
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 flex items-center whitespace-nowrap transition-colors duration-150 px-3 sm:px-4 text-xs sm:text-[13px] font-medium"
                style={{
                  color:        active ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                  borderBottom: active ? "2px solid #22C55E" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ── Profile / account button ──────────────────────────────────────── */}
        <div ref={dropRef} className="relative flex items-center pl-1">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={open}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-150"
            style={{
              backgroundColor: open
                ? "rgba(34,197,94,0.20)"
                : "rgba(255,255,255,0.08)",
              border: open
                ? "1px solid rgba(34,197,94,0.40)"
                : "1px solid rgba(255,255,255,0.12)",
              color: open ? "#22C55E" : "rgba(255,255,255,0.70)",
            }}
          >
            {initial || <User size={13} strokeWidth={2} />}
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl py-1.5 overflow-hidden"
                style={{
                  backgroundColor: "rgba(8, 12, 22, 0.97)",
                  border:          "1px solid rgba(255,255,255,0.09)",
                  boxShadow:       "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {/* Account info */}
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>
                    Signed in as
                  </p>
                  <p className="text-[13px] truncate font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>
                    {user?.email ?? "—"}
                  </p>
                </div>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors duration-100"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                >
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </nav>
  );
}
