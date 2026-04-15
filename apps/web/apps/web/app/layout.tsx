import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Kashio",
  description: "Australian tax deduction tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("h-full dark", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Restore saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch{}` }} />
      </head>
      <body className="min-h-full flex flex-col antialiased" style={{ backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  );
}
