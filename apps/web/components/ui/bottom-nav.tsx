"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, ClipboardList, FileText, Monitor } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/import",    label: "Import",    Icon: Upload                       },
  { href: "/review",    label: "Review",    Icon: ClipboardList                },
  { href: "/export",    label: "Export",    Icon: FileText                     },
  { href: "/wfh",       label: "WFH",       Icon: Monitor                      },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden"
      style={{
        backgroundColor:      "rgba(5, 7, 14, 0.92)",
        borderTop:            "1px solid rgba(255,255,255,0.07)",
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        paddingBottom:        "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-16" style={{ maxWidth: 430, margin: "0 auto" }}>
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-[3px] transition-opacity duration-150 active:opacity-60"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <span
                className="flex items-center justify-center rounded-xl transition-all duration-150"
                style={{
                  width:           36,
                  height:          28,
                  backgroundColor: active ? "rgba(34,197,94,0.14)" : "transparent",
                }}
              >
                <Icon
                  size={active ? 20 : 19}
                  strokeWidth={active ? 2.25 : 1.75}
                  style={{ color: active ? "#22C55E" : "rgba(255,255,255,0.38)" }}
                />
              </span>
              <span
                className="text-[9.5px] font-medium tracking-wide leading-none"
                style={{ color: active ? "#22C55E" : "rgba(255,255,255,0.38)" }}
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
