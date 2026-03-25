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
      <head>
        {/* Runs before paint to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch {}
        `}} />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-white dark:bg-gray-900">{children}</body>
    </html>
  );
}
