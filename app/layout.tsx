import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import type { ReactNode } from "react";

import { WebVitals } from "@/components/observability/WebVitals";
import { themeInitializationScript } from "@/lib/theme";

import "./globals.css";

const arabicSans = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "إلام | Elam",
  description: "منصة تعليمية لطلاب الهندسة",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${arabicSans.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-surface text-body">
        <Script id="elam-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <WebVitals />
        <a className="skipLink" href="#main-content">
          تخطَّ إلى المحتوى الرئيسي
        </a>
        {children}
      </body>
    </html>
  );
}
