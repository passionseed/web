import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SHIFT Beta Board | PassionSeed",
  description: "Shared Excalidraw whiteboard for the SHIFT beta cohort.",
};

const BOARD_URL =
  "https://excalidraw.com/#room=bf11a2dc20853d449c6a,1UK_QMslTmcvSn3sGamC5g";

export default function ShiftBetaBoardPage() {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0f0d1a]">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2">
        <p className="text-sm font-medium text-white/80">
          SHIFT Beta Board
        </p>
        <a
          href={BOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/50 underline-offset-2 transition-colors hover:text-white/90 hover:underline"
        >
          Open in new tab
        </a>
      </header>
      <iframe
        src={BOARD_URL}
        title="SHIFT Beta Excalidraw Board"
        className="min-h-0 w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
