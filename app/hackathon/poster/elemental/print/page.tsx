import type { Metadata } from "next";

import { ElementalKeyPoster, H, H_A4, W } from "@/components/hackathon/poster/elemental/ElementalKeyPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { posterRange, posterSource } from "@/lib/hackathon/elemental/poster-numbers";

/**
 * Numbered copies of the Elemental key poster for printing (Big, 2026-11-26).
 * Each copy's QR code opens the hackathon page with ?src=poster-<n>, and its
 * number is printed under the code, so the admin's sign-ups by source show
 * which copy brought each sign-up.
 *
 *   /hackathon/poster/elemental/print              copies 1 to 30, A4-shaped
 *   /hackathon/poster/elemental/print?from=31&to=40
 *   /hackathon/poster/elemental/print?format=feed  the 4:5 Instagram shape instead
 *
 * Printing from the browser gives one copy per page, at the poster's own size.
 * For a print shop, scripts/render-numbered-posters.mjs writes a JPEG per copy
 * and a much smaller PDF of them.
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: numbered posters to print`,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ElementalPosterPrintPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const numbers = posterRange(first(params.from), first(params.to));
  const firstNo = numbers[0];
  const lastNo = numbers[numbers.length - 1];
  // A4 by default: the print shop said the 4:5 poster leaves A4 part empty (Big, 2026-11-26).
  const format = first(params.format) === "feed" ? "feed" : "a4";
  const height = format === "a4" ? H_A4 : H;

  return (
    <main className="el-print">
      <style>{`
        @page { size: ${W}px ${height}px; margin: 0; }
        .el-print { background: #111; padding: 24px 0; }
        .el-print-note { max-width: ${W}px; margin: 0 auto 24px; padding: 0 16px; color: #ddd; font: 15px/1.5 ui-monospace, monospace; }
        .el-print-sheet { width: ${W}px; height: ${height}px; margin: 0 auto 24px; break-after: page; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media screen and (max-width: ${W}px) { .el-print { overflow-x: auto; } }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: none !important; }
          .el-print { background: none; padding: 0; }
          .el-print-note { display: none; }
          .el-print-sheet { margin: 0; }
          .el-print-sheet:last-child { break-after: auto; }
        }
      `}</style>
      <p className="el-print-note">
        Posters {firstNo}–{lastNo} ({numbers.length} {numbers.length === 1 ? "copy" : "copies"}), {format === "a4" ? "A4 shape" : "4:5 shape"}. Each QR opens the hackathon page with{" "}
        <code>?src={posterSource(firstNo)}</code> for copy {firstNo}, and so on.
        Note which number goes up where. Other numbers: <code>?from=31&amp;to=40</code>. The 4:5 shape: <code>?format=feed</code>.
        <br />
        For a print shop, run <code>node scripts/render-numbered-posters.mjs --from {firstNo} --to {lastNo} --out &lt;dir&gt;</code>:
        one JPEG per copy and a PDF of them. The browser&apos;s own Save as PDF works but makes a very large file.
      </p>
      {numbers.map((n) => (
        <div key={n} className="el-print-sheet" data-poster-no={n}>
          <ElementalKeyPoster id={`elemental-key-blue-${n}`} sky="blue" posterNo={n} format={format} />
        </div>
      ))}
    </main>
  );
}
