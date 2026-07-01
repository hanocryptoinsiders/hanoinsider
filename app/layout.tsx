import type { Metadata } from "next";
import "../styles.css";
import { Providers } from "@/components/Providers";

import { Inter, Cormorant_Garamond, IBM_Plex_Mono, IBM_Plex_Serif } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-mono",
  display: "swap",
});

const ibmSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-ibm-serif",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${ibmMono.variable} ${ibmSerif.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
