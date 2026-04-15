"use client";

/**
 * BottomNav
 *
 * Mobile-first bottom navigation bar. Glass surface, green active accent.
 * Each item has an icon + label. The active item glows softly.
 *
 * Usage (future):
 *   <BottomNav />
 *   — placed inside a layout that removes the top Nav.
 *
 * Items match the current Kashio route structure.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Upload,
  ClipboardList,
  FileText,
  Home,
} from "lucide-react";

const ITEMS = [
  { href: "/import", label: "Import",  Icon: Upload        },
  { href: "/review", label: "Review",  Icon: ClipboardList },
  { href: "/export", label: "Export",  Icon: FileText      },
  { href: "/wfh",    label: "WFH",     Icon: Home          },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50"
      style={{
        backgroundColor:     "rgba(5, 7, 14, 0.88)",
        borderTop:           "1px solid rgba(255,255,255,0.06)",
        backdropFilter:      "blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        paddingBottom:       "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto flex max-w-[430px] items-stretch h-16">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors duration-150"
                style={{
                  backgroundColor: active ? "rgba(34,197,94,0.12)" : "transparent",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.75}
                  style={{ color: active ? "#22C55E" : "#6B7280" }}
                />
              </span>
              <span
                className="text-[10px] font-medium tracking-wide"
                style={{ color: active ? "#22C55E" : "#6B7280" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
