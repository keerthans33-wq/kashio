"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useUser } from "../../../lib/user-context";

const USER_TYPE_LABEL: Record<string, string> = {
  employee:    "Employee",
  contractor:  "Contractor",
  sole_trader: "Sole trader",
};

const links = [
  { href: "/import", label: "1. Import" },
  { href: "/review", label: "2. Review" },
  { href: "/export", label: "3. Export" },
  { href: "/wfh",    label: "WFH log" },
];

export default function Nav() {
  const pathname = usePathname();
  const { userType } = useUser();

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-elevated)" }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-14 items-center gap-4 sm:gap-8">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/kashio - 2.PNG"
              alt="Kashio"
              height={28}
              width={100}
              className="h-7 w-auto"
            />
          </Link>

          <div className="flex flex-1 gap-3 sm:gap-6 overflow-x-auto">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium border-b-2 pb-0.5 whitespace-nowrap transition-colors duration-150"
                  style={{
                    borderColor:  active ? "var(--violet-from)" : "transparent",
                    color:        active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {userType && USER_TYPE_LABEL[userType] && (
            <span className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
              style={{ borderColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              {USER_TYPE_LABEL[userType]}
            </span>
          )}

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="text-sm transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
