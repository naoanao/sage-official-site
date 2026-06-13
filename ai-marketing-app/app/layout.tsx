import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-ai.com";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "G-Y1B7VSVBDK";
// Meta Pixel: コンバージョン計測用。NEXT_PUBLIC_META_PIXEL_ID が設定された時のみ有効化（未設定なら無害）。
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

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
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA4_ID}');`}
        </Script>
        {META_PIXEL_ID ? (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
          </Script>
        ) : null}
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
