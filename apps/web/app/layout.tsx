import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" style={{ backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  );
}
