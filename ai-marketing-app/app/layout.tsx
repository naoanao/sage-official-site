import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app";

export const metadata: Metadata = {
  title: "Growl — 今週やること3つ",
  description: "マーケを知らない飲食店・サロンオーナーが、マーケを意識しないまま成長できるAIアプリ。5問答えるだけで今週やるべき集客施策が3つ届きます。",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "Growl — 今週やること3つ",
    description: "AIが今週の集客施策を3つに絞ってくれる。フレームワーク不要・登録不要・1分で完了。飲食店・サロン・EC向け。",
    url: APP_URL,
    siteName: "Growl",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Growl — AIが今週の集客施策を3つ届けます",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Growl — 今週やること3つ",
    description: "AIが今週の集客施策を3つに絞ってくれる。登録不要・1分で完了。",
    images: [`${APP_URL}/og-image.png`],
  },
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Growl",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
