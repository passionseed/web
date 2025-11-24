import type React from "react";
import type { Metadata } from "next";
import { Space_Mono, Libre_Franklin } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { createClient } from "@/utils/supabase/server";
import { Layout } from "@/components/layout";
import ServiceWorkerRegistration from "@/components/service-worker";
import ErrorBoundary from "@/components/error-boundary";
import { DevHealthCheck } from "@/components/dev-health-check";
import { TOSAcceptanceModal } from "@/components/TOSAcceptanceModal";

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

export const metadata: Metadata = {
  title: "Passion Seed",
  description: "Discover and nurture your passions",
  manifest: "/manifest.json",
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
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${libreFranklin.variable} ${spaceMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <Layout>{children}</Layout>
            <Toaster />
            <DevHealthCheck />
            <TOSAcceptanceModal />
            {/* ServiceWorker temporarily disabled to fix localhost errors */}
            {/* <ServiceWorkerRegistration /> */}
          </ErrorBoundary>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
