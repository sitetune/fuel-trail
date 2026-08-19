import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/config/brand";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3021";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${brand.name} · ${brand.tagline}`,
  description: `${brand.tagline} ${brand.valueLine}`,
  applicationName: brand.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/fuel-trail-logo.svg", type: "image/svg+xml" }],
    apple: "/icons/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} · Every gallon. Every truck. Under control.`,
    description: brand.valueLine,
    images: [
      {
        url: "/images/og-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Blue semi-truck fueling at night with FuelTrail receipt overlays",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} · Every gallon. Every truck. Under control.`,
    description: brand.valueLine,
    images: ["/images/og-hero.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: brand.colors.ink,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="min-h-full bg-warm font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-route focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
