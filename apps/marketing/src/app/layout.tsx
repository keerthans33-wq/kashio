import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kashio — Find tax deductions in your everyday spending",
    template: "%s | Kashio",
  },
  description:
    "Kashio scans your bank transactions, flags what may be claimable, and gives you a clear summary before tax time. Built for Australian employees, contractors, and sole traders.",
  metadataBase: new URL("https://kashio.com.au"),
  openGraph: {
    siteName: "Kashio",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
