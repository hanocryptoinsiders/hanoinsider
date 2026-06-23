import type { Metadata } from "next";
import "../styles.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hanoinsiders.com"),
  title: "Hano Insiders - Premium Crypto Intelligence",
  description: "A premium crypto intelligence dashboard with curated market context, educational insights, and short analysis for serious beginners.",
  openGraph: {
    title: "Hano Insiders - Premium Crypto Intelligence",
    description: "Curated market overview, coin pages, educational insights, and short market analysis for Hano Insiders members.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hano Insiders - Premium Crypto Intelligence",
    description: "A premium crypto intelligence dashboard for serious beginners.",
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300..900;1,300..900&family=Sora:wght@100..800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
