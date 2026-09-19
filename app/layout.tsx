import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import {
  Space_Mono,
  Libre_Franklin,
  Krub,
  Bai_Jamjuree,
  Mitr,
  Poppins,
  Reenie_Beanie,
  Kodchasan,
  Noto_Sans_Thai,
  Noto_Serif_Thai,
  Instrument_Serif,
  Athiti,
  Tiny5,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { createClient } from "@/utils/supabase/server";
import { Layout } from "@/components/layout";
import ServiceWorkerRegistration from "@/components/service-worker";
import ServiceWorkerCleanup from "@/components/service-worker-cleanup";
import ErrorBoundary from "@/components/error-boundary";
import { DevHealthCheck } from "@/components/dev-health-check";
import { TOSAcceptanceModal } from "@/components/TOSAcceptanceModal";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { DirectionFinderProvider } from "@/components/education/direction-finder/direction-finder-context";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

const libreFranklin = Libre_Franklin({
  /* 500 is loaded because headings set Medium: without it the browser falls
     back to 400 for Latin while Thai renders true 500, so a mixed heading
     reads two different weights. */
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-libre-franklin",
});

const krub = Krub({
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-krub",
  preload: false,
});

const baiJamjuree = Bai_Jamjuree({
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-bai-jamjuree",
  preload: false,
});

const mitr = Mitr({
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-mitr",
  preload: false,
});

const poppins = Poppins({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  preload: false,
});

const reenieBeanie = Reenie_Beanie({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-reenie-beanie",
  preload: false,
});

const kodchasan = Kodchasan({
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-kodchasan",
  preload: false,
});

const notoSansThai = Noto_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  preload: false,
});

const notoSerifThai = Noto_Serif_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai"],
  variable: "--font-noto-serif-thai",
  preload: false,
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  preload: false,
});

const athiti = Athiti({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-athiti",
  preload: false,
});

const tiny5 = Tiny5({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-tiny5",
  preload: false,
});

export const metadata: Metadata = {
  // Required for Open Graph: without it Next emits a relative image path, and
  // scrapers like Instagram cannot fetch a relative URL, so they fall back to
  // guessing an image from the page.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://passionseed.org"
  ),
  title: {
    default: "PassionSeed | Empowering Youth Agency & Real-World Proof of Work",
    template: "%s | PassionSeed",
  },
  description:
    "Empowering high school and university students to break free from passive certificate-collecting, test-drive real careers, and ship empirical projects with real user telemetry for TCAS 1.",
  keywords: [
    "PassionSeed",
    "TCAS 1",
    "พอร์ต TCAS 1",
    "ทำพอร์ต TCAS",
    "SHIFT sandbox",
    "TechSeed",
    "ผลงานวิศวะคอม",
    "Hackathon นักเรียน",
    "Career exploration",
    "Proof of work",
  ],
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    title: "PassionSeed | Empowering Youth Agency & Real-World Proof of Work",
    description:
      "Break free from passive compliance. Build real things through authentic experimentation and unignorable proof of work.",
    siteName: "PassionSeed",
    // Without an explicit image, scrapers guess and pick the first thing they
    // find on the page, which is why shared links showed a random card image.
    images: [
      {
        url: "/og-passionseed.jpg",
        width: 1200,
        height: 630,
        alt: "Passion Seed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Passion Seed",
    description: "Discover and nurture your passions",
    images: ["/og-passionseed.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Passion Seed",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.webp", sizes: "16x16", type: "image/webp" },
      { url: "/favicon-32x32.webp", sizes: "32x32", type: "image/webp" },
    ],
    apple: [
      { url: "/apple-touch-icon.webp", sizes: "180x180", type: "image/webp" },
    ],
    other: [
      {
        url: "/android-chrome-192x192.webp",
        sizes: "192x192",
        type: "image/webp",
      },
      {
        url: "/android-chrome-512x512.webp",
        sizes: "512x512",
        type: "image/webp",
      },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b21b6",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {
    // Supabase is unreachable (e.g. Docker not running in dev).
    // Continue rendering with no session — auth-gated pages will
    // show their own error/login state.
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": "https://passionseed.org/#organization",
        "name": "PassionSeed",
        "url": "https://passionseed.org",
        "logo": "https://passionseed.org/passionseed-logo.svg",
        "description":
          "Empowering young people to break free from passive compliance, build real things through authentic experimentation, and take ownership of their own trajectory.",
        "sameAs": [
          "https://www.instagram.com/passionseed",
          "https://github.com/passionseed"
        ],
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Bangkok",
          "addressCountry": "TH"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://passionseed.org/#website",
        "url": "https://passionseed.org",
        "name": "PassionSeed",
        "publisher": {
          "@id": "https://passionseed.org/#organization"
        }
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${libreFranklin.variable} ${spaceMono.variable} ${krub.variable} ${baiJamjuree.variable} ${mitr.variable} ${poppins.variable} ${reenieBeanie.variable} ${kodchasan.variable} ${notoSansThai.variable} ${notoSerifThai.variable} ${instrumentSerif.variable} ${athiti.variable} ${tiny5.variable}`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          <LanguageProvider>
            <DirectionFinderProvider>
              <ErrorBoundary>
                <Layout>{children}</Layout>
                <SonnerToaster />
                <DevHealthCheck />
                <TOSAcceptanceModal />
                {/* ServiceWorker temporarily disabled to fix localhost errors */}
                {/* <ServiceWorkerRegistration /> */}
                {/* Removes stale service workers left over from when it was enabled */}
                <ServiceWorkerCleanup />
              </ErrorBoundary>
            </DirectionFinderProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
