import type { Metadata } from "next";
import Image from "next/image";

import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { DownloadAll, DownloadPng } from "@/components/shift/poster/risoGrid/DownloadPng";
import { GRID_PNG_DIR } from "@/components/shift/poster/risoGrid/gridPng";
import { SaveImage } from "@/components/shift/poster/risoGrid/SaveImage";
import { RisoGridCover, RisoGridPanorama, type TileLetter } from "@/components/shift/poster/risoGrid/RisoGridCovers";
import { OFFER_SLIDES } from "@/components/shift/poster/risoGrid/slidesOffer";
import { VOICE_SLIDES } from "@/components/shift/poster/risoGrid/slidesVoices";
import { WHY_SLIDES } from "@/components/shift/poster/risoGrid/slidesWhy";
import { SHIFT_COHORT_2 } from "@/lib/content/shift-cohort";

/**
 * SHIFT[2] IG grid, in the riso print of the CampHub poster: three carousels
 * (1080x1440) whose covers join into one dawn on the profile row.
 *   A: why it works, and what students told us after SHIFT[0] (5 slides)
 *   B: students in their own words, then the pilot's projects (5)
 *   C: the offer: CampHub cover recut, outcomes, price, parents, apply (5)
 * Export: the Download button under each slide saves #shift2-grid-{a,b,c}-{n}
 * as a PNG; #shift2-grid-panorama is the grid preview only.
 * Post C first, then B, then A.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT_2.name} IG Grid`,
  robots: { index: false, follow: false },
};

const POSTS: Record<TileLetter, (() => React.ReactNode)[]> = {
  a: WHY_SLIDES,
  b: VOICE_SLIDES,
  c: OFFER_SLIDES,
};

/** Post order on IG, so the profile row ends up A, B, C left to right. */
const POST_ORDER: { letter: TileLetter; title: string }[] = [
  { letter: "c", title: "Post 1 · C · Offer (post first)" },
  { letter: "b", title: "Post 2 · B · Student voices" },
  { letter: "a", title: "Post 3 · A · Why it works (lands top-left)" },
];

const slideId = (letter: TileLetter, n: number) => `shift2-grid-${letter}-${n}`;

/** Every slide id of one post, cover first. */
const postIds = (letter: TileLetter) =>
  [1, ...POSTS[letter].map((_, i) => i + 2)].map((n) => slideId(letter, n));

/** A slide with its own download button underneath. */
function Downloadable({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-start gap-3">
      {children}
      <DownloadPng id={id} />
    </div>
  );
}

/**
 * Phones: thumbnails two to a row so a whole slide fits on screen. Tapping
 * one opens the full PNG in the phone's own viewer (pinch to zoom, long
 * press to save). The live 1080px slides only render from md up, where the
 * export script reads them.
 */
function MobileGallery() {
  return (
    <div className="space-y-10 md:hidden">
      <p className="text-sm leading-relaxed text-neutral-400">
        แตะรูปเพื่อเปิดเต็มจอ ซูมได้ แล้วกดค้างเพื่อบันทึกรูปภาพ หรือกดปุ่ม บันทึกรูป
      </p>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-300">ตัวอย่างหน้าโปรไฟล์</h2>
        <a href={`${GRID_PNG_DIR}/shift2-grid-panorama.png`} target="_blank" rel="noreferrer">
          <Image
            src={`${GRID_PNG_DIR}/shift2-grid-panorama.png`}
            alt="SHIFT[2] grid preview"
            width={3320}
            height={1440}
            unoptimized
            className="h-auto w-full"
          />
        </a>
      </section>
      {POST_ORDER.map(({ letter, title }) => (
        <section key={letter} className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-300">{title}</h2>
          <div className="grid grid-cols-2 gap-3">
            {postIds(letter).map((id, i) => (
              <figure key={id} className="space-y-2">
                <a href={`${GRID_PNG_DIR}/${id}.png`} target="_blank" rel="noreferrer" className="block">
                  <Image
                    src={`${GRID_PNG_DIR}/${id}.png`}
                    alt={`${title}, slide ${i + 1}`}
                    width={1080}
                    height={1440}
                    unoptimized
                    className="h-auto w-full rounded"
                  />
                </a>
                <figcaption className="space-y-1.5">
                  <p className="text-center font-mono text-xs text-neutral-500">{i + 1}</p>
                  <SaveImage id={id} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Desktop: the live slides at full size, each with its download button. */
function LiveSlides() {
  return (
    <div className="hidden flex-col gap-16 md:flex">
      <section className="space-y-4">
        <h2 className="font-mono text-lg text-neutral-300">Profile grid preview (not for posting)</h2>
        <RisoGridPanorama id="shift2-grid-panorama" />
      </section>
      {POST_ORDER.map(({ letter, title }) => {
        const ids = postIds(letter);
        return (
          <section key={letter} className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="font-mono text-lg text-neutral-300">{title}</h2>
              <DownloadAll ids={ids} label={`Download all ${ids.length}`} />
            </div>
            <div className="flex gap-6">
              <Downloadable id={ids[0]}>
                <RisoGridCover letter={letter} />
              </Downloadable>
              {POSTS[letter].map((Slide, i) => (
                <Downloadable key={Slide.name} id={ids[i + 1]}>
                  <Slide />
                </Downloadable>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function Shift2GridPage() {
  return (
    <div className="min-h-screen bg-neutral-950 p-4 md:overflow-auto md:p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      <MobileGallery />
      <LiveSlides />
    </div>
  );
}
