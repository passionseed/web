import { Apple, Smartphone } from "lucide-react";
import Link from "next/link";
import React from "react";
import QRCode from "react-qr-code";

export default function DownloadPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background glow effects for the Dusk theme feel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <main className="ei-card relative z-10 w-full max-w-lg p-8 sm:p-12 text-center rounded-2xl shadow-2xl space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Get PassionSeed
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Your educational companion for daily reflection, tracking your growth, and participating in workshops anywhere you go.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-8">
          <div className="flex flex-col items-center gap-3">
            <a
              href="https://f005.backblazeb2.com/file/pseed-dev/build/build-1775718768983.apk"
              download="passionseed-app.apk"
              className="ei-button-dusk w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Smartphone className="w-5 h-5" />
              <span>Android APK</span>
            </a>
            <div className="bg-white p-3 rounded-xl">
              <QRCode
                value="https://f005.backblazeb2.com/file/pseed-dev/build/build-1775718768983.apk"
                size={120}
              />
            </div>
            <p className="text-xs text-muted-foreground">Scan to download</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <a
              href="https://testflight.apple.com/join/EtPfnhJW"
              target="_blank"
              rel="noopener noreferrer"
              className="ei-button-dusk w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Apple className="w-5 h-5" />
              <span>iOS TestFlight</span>
            </a>
            <div className="bg-white p-3 rounded-xl">
              <QRCode
                value="https://testflight.apple.com/join/EtPfnhJW"
                size={120}
              />
            </div>
            <p className="text-xs text-muted-foreground">Scan to download</p>
          </div>
        </div>

        <div className="pt-8 text-sm text-muted-foreground space-y-2 border-t border-border/50">
          <p>
            <strong>Android:</strong> You may need to enable "Install from unknown sources" in your settings.
          </p>
          <p>
            <strong>iOS:</strong> Please install Apple's TestFlight app from the App Store first.
          </p>
        </div>
      </main>
    </div>
  );
}
