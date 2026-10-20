import type { TcasPosterData } from "@/lib/content/tcas70-poster";

import { TcasPixelCover } from "./TcasPixelCover";
import { TcasPixelOverview } from "./TcasPixelOverview";
import { TcasPixelPortfolioTips } from "./TcasPixelPortfolioTips";

/**
 * A full TCAS infographic: cover, one table sheet per `data.sheets` entry,
 * then the tips sheet. Every sheet is A4 portrait (1080x1524) so the set
 * prints straight to a PDF.
 * Export: screenshot or print #tcas-<key>-cover, #tcas-<key>-1..n and
 * #tcas-<key>-tips.
 */
export function TcasPosterPage({ data }: { data: TcasPosterData }) {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-center gap-10">
        <TcasPixelCover data={data} />
        {data.sheets.map((_, i) => (
          <TcasPixelOverview key={i} data={data} sheet={i} />
        ))}
        <TcasPixelPortfolioTips data={data} />
      </div>
    </div>
  );
}
