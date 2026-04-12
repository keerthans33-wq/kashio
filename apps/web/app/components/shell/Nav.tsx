"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/import", label: "Import" },
  { href: "/review", label: "Review" },
  { href: "/export", label: "Export" },
  { href: "/wfh",    label: "WFH" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-elevated)" }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-12 items-center gap-4 sm:gap-6">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/kashio - 2.PNG"
              alt="Kashio"
              height={24}
              width={80}
              className="h-6 w-auto"
            />
          </Link>

          {/* Nav links — scrollable on very small screens */}
          <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-150"
                  style={{
                    color:           active ? "var(--text-primary)" : "var(--text-muted)",
                    backgroundColor: active ? "var(--bg-elevated)"  : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <ThemeToggle />

          {/* Sign out */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="shrink-0 text-xs transition-colors duration-150 hover:text-gray-300"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>

        </div>
      </div>
    </nav>
  );
}
