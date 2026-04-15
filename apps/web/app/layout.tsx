import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuroraBackground } from "@/components/ui/aurora-background";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Kashio",
  description: "Australian tax deduction tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full dark", "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body
        className="relative min-h-full flex flex-col antialiased"
        style={{ backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}
      >
        {/* Atmospheric aurora layer — sits behind all page content */}
        <AuroraBackground intensity="medium" />

        {/* Page content sits above the aurora */}
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
