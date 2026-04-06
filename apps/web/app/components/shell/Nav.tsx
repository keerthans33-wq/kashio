"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "../../../lib/supabase";

const links = [
  { href: "/import", label: "1. Import" },
  { href: "/review", label: "2. Review" },
  { href: "/export", label: "3. Export" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex h-14 items-center gap-4 sm:gap-8">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/kashio - 1.PNG"
              alt="Kashio"
              height={32}
              width={120}
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/kashio - 2.PNG"
              alt="Kashio"
              height={32}
              width={120}
              className="h-8 w-auto hidden dark:block"
            />
          </Link>
          <div className="flex flex-1 gap-3 sm:gap-6 overflow-x-auto">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium border-b-2 pb-0.5 transition-colors ${
                    active
                      ? "border-violet-500 text-gray-900 dark:text-gray-100"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <ThemeToggle />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
