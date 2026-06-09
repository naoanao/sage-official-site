import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app";

export const metadata: Metadata = {
  title: "Growl — Just 3 actions this week",
  description: "AI picks your 3 highest-impact marketing actions every week — with copy already written. No agency, no guesswork. Answer 5 questions and get started free.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "Growl — Just 3 actions this week",
    description: "AI picks your 3 highest-impact marketing actions every week — with copy already written. No signup required. Free to start.",
    url: APP_URL,
    siteName: "Growl",
    locale: "en_US",
    type: "website",
    // opengraph-image.tsx generates /opengraph-image automatically
  },
  twitter: {
    card: "summary_large_image",
    title: "Growl — Just 3 actions this week",
    description: "AI picks your 3 highest-impact marketing actions — with copy already written. Free to start.",
    // twitter:image is auto-injected from opengraph-image.tsx
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Growl",
  },
  // icon.tsx / apple-icon.tsx が自動でファビコン・Appleアイコンを生成する
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Analytics />
        {/* Fazier badge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div style={{position:'fixed' as const,bottom:'16px',right:'16px',zIndex:9999}}>
          <a href="https://www.fazier.com" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.fazier.com/badges/launched-on-fazier.svg" alt="Launched on Fazier" width={120} height={40} />
          </a>
        </div>
      </body>
    </html>
  );
}
