import type React from "react";
import type { Metadata } from "next";
import {
  Space_Mono,
  Libre_Franklin,
  Krub,
  Bai_Jamjuree,
  Mitr,
  Poppins,
  Reenie_Beanie,
  Kodchasan,
} from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { createClient } from "@/utils/supabase/server";
import { Layout } from "@/components/layout";
import ServiceWorkerRegistration from "@/components/service-worker";
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
  weight: ["400", "700"],
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

export const metadata: Metadata = {
  title: "Passion Seed",
  description: "Discover and nurture your passions",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    title: "Passion Seed",
    description: "Discover and nurture your passions",
    siteName: "Passion Seed",
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${libreFranklin.variable} ${spaceMono.variable} ${krub.variable} ${baiJamjuree.variable} ${mitr.variable} ${poppins.variable} ${reenieBeanie.variable} ${kodchasan.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <DirectionFinderProvider>
              <ErrorBoundary>
                <Layout>{children}</Layout>
                <SpeedInsights />
                <SonnerToaster />
                <DevHealthCheck />
                <TOSAcceptanceModal />
                {/* ServiceWorker temporarily disabled to fix localhost errors */}
                {/* <ServiceWorkerRegistration /> */}
              </ErrorBoundary>
            </DirectionFinderProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
