import type { TcasPosterData } from "@/lib/content/tcas70-poster";

import { FitFrame } from "../FitFrame";
import { CELL, GRID_W } from "../pixelKit";
import { SHEET_H } from "./TcasPixelScene";
import { TcasPixelCover } from "./TcasPixelCover";
import { TcasPixelOverview } from "./TcasPixelOverview";
import { TcasPixelPortfolioTips } from "./TcasPixelPortfolioTips";

const SHEET_W_PX = GRID_W * CELL;
const SHEET_H_PX = SHEET_H * CELL;

/**
 * A full TCAS infographic: cover, one table sheet per `data.sheets` entry,
 * then the tips sheet. Every sheet is A4 portrait (1080x1524) so the set
 * prints straight to a PDF. On a phone each sheet scales down to the screen
 * width, and the page itself scrolls so pinch-zoom works.
 * Export: screenshot or print #tcas-<key>-cover, #tcas-<key>-1..n and
 * #tcas-<key>-tips.
 */
export function TcasPosterPage({ data }: { data: TcasPosterData }) {
  const sheets = [
    <TcasPixelCover key="cover" data={data} />,
    ...data.sheets.map((_, i) => <TcasPixelOverview key={i} data={data} sheet={i} />),
    <TcasPixelPortfolioTips key="tips" data={data} />,
  ];
  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-6 sm:py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-center gap-6 sm:gap-10">
        {sheets.map((sheet) => (
          <FitFrame key={sheet.key} width={SHEET_W_PX} height={SHEET_H_PX}>
            {sheet}
          </FitFrame>
        ))}
      </div>
    </div>
  );
}
