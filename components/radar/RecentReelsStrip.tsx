import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import type { RecentRadarReel } from "@/lib/radar/recent-reels";

/**
 * "จากคลิปไหน?": the hub's strip of recent reels (spec section 1, bio links).
 * Bio links always land on the hub, so a student who saw an older reel taps
 * it here and opens that career at that guide page (level). Renders nothing
 * when no reel is mapped yet.
 */
export function RecentReelsStrip({ reels }: { reels: RecentRadarReel[] }) {
  if (reels.length === 0) return null;

  return (
    <section aria-labelledby="radar-recent-reels-heading" className="radar-index-page">
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <h2
          id="radar-recent-reels-heading"
          className="font-radar-thai text-base font-semibold text-white"
        >
          จากคลิปไหน?
        </h2>
        <p className="mt-0.5 font-radar-thai text-sm text-white/65">
          แตะคลิปที่เห็น แล้วเล่นต่อตรงด่านนั้นได้เลย
        </p>
        <ul className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {reels.map((reel) => (
            <li key={`${reel.fieldSlug}-${reel.pageKey ?? "top"}`} className="shrink-0 snap-start">
              <RecentReelTile reel={reel} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentReelTile({ reel }: { reel: RecentRadarReel }) {
  return (
    <Link
      href={reel.href}
      className="flex min-h-[64px] w-[15rem] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-2 pr-3 text-left transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/[0.12]"
    >
      <span className="relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10">
        {reel.posterUrl ? (
          <Image
            src={reel.posterUrl}
            alt=""
            width={40}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <Play aria-hidden className="h-4 w-4 text-white/70" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-radar-thai text-sm font-semibold text-white">
          {reel.careerLabelTh}
        </span>
        {reel.pageTitleTh ? (
          <span className="block truncate font-radar-thai text-xs text-white/65">
            {reel.pageTitleTh}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
