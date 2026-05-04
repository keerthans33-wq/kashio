"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const links: { href: string; label: string; exact?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/import",    label: "Import" },
  { href: "/review",    label: "Review" },
  { href: "/export",    label: "Export" },
  { href: "/wfh",       label: "WFH" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        backgroundColor:     "rgba(5, 7, 14, 0.88)",
        borderBottom:        "1px solid var(--bg-border)",
        backdropFilter:      "blur(16px)",
        WebkitBackdropFilter:"blur(16px)",
      }}
    >
      <div className="flex items-stretch h-12 px-2">
        {/* Nav links */}
        <div className="flex flex-1 items-stretch overflow-x-auto scrollbar-none">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 flex items-center px-4 text-[13px] font-medium whitespace-nowrap transition-all duration-150"
                style={{
                  color:        active ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: active ? "2px solid var(--violet-from)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="shrink-0 flex items-center px-4 text-[13px] font-medium transition-colors duration-150 whitespace-nowrap hover:text-white"
          style={{ color: "var(--text-muted)" }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
