import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/config/brand";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.tagline,
  applicationName: brand.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: brand.colors.navy,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} h-full`}>
      <body className="min-h-full bg-[#F7F8FA] font-sans text-[#0B1F33] antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
