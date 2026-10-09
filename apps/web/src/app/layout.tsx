import type { Metadata } from "next";
import { Fraunces, Newsreader } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { SiteFooter } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/header";
import { themeInitScript } from "@/components/theme-toggle";
import { APP_URL } from "@/lib/og";
import { SITE } from "@/lib/site";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: SITE.title,
    template: "%s · Shipyard",
  },
  description:
    "Shipyard is a free film, TV and book tracker with a fanfiction home - Letterboxd for every story you've ever loved, and the ones you wish existed. Log, rank and review, then rewrite the endings.",
  applicationName: SITE.name,
  openGraph: {
    siteName: SITE.name,
    type: "website",
    url: APP_URL,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.tagline }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} ${newsreader.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
