"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const links = [
  { href: "/import", label: "Import" },
  { href: "/review", label: "Review" },
  { href: "/export", label: "Export" },
  { href: "/wfh",    label: "WFH" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-border)" }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-12 items-stretch gap-4 sm:gap-6">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center">
            <Image
              src="/kashio - 2.PNG"
              alt="Kashio"
              height={24}
              width={80}
              className="h-6 w-auto"
            />
          </Link>

          {/* Nav links — scrollable on very small screens */}
          <div className="flex flex-1 items-stretch gap-1 overflow-x-auto scrollbar-none">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 flex items-center px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150"
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
            className="shrink-0 flex items-center text-xs transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>

        </div>
      </div>
    </nav>
  );
}
