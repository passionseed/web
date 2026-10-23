import Image from "next/image";
import type { ReactNode } from "react";

export interface GallerySheet {
  id: string;
  width: number;
  height: number;
  alt: string;
  /** The live sheet, rendered only for export (`?render=1`). */
  live: ReactNode;
  caption?: ReactNode;
}

export type SheetSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** True when scripts/render-poster.mjs is screenshotting the live sheets. */
export async function isRenderMode(searchParams: SheetSearchParams): Promise<boolean> {
  return (await searchParams).render === "1";
}

/**
 * Poster sheets for people browsing the site: the exported images, scaled to
 * the screen, so the page loads fast and the fonts are exactly what ships.
 * With `render` true it shows the live sheets instead, which is what
 * render-poster.mjs screenshots. Re-export after a copy change so the two
 * match: node scripts/render-poster.mjs ... --publish <dir>.
 */
export function SheetGallery({ sheets, dir, render }: { sheets: GallerySheet[]; dir: string; render: boolean }) {
  if (render) {
    return (
      <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
        {/* Keep the Next.js dev indicator out of exported screenshots. */}
        <style>{"nextjs-portal{display:none!important}"}</style>
        <div className="flex flex-wrap items-start gap-10">
          {sheets.map((s) => (
            <figure key={s.id} className="flex flex-col gap-4" style={{ width: s.width }}>
              {s.live}
              {s.caption && (
                <figcaption className="font-mono text-[15px] leading-[24px] text-neutral-400">{s.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-[1584px] flex-col items-center gap-8 sm:gap-12">
        {sheets.map((s, i) => {
          const src = `${dir}/${s.id}.webp`;
          return (
            <figure key={s.id} className="w-full" style={{ maxWidth: s.width }}>
              <a href={src} target="_blank" rel="noreferrer" aria-label={`Open ${s.alt} full size`}>
                <Image
                  src={src}
                  alt={s.alt}
                  width={s.width}
                  height={s.height}
                  sizes={`(max-width: ${s.width + 48}px) 100vw, ${s.width}px`}
                  priority={i === 0}
                  className="h-auto w-full rounded-lg"
                />
              </a>
              {s.caption && (
                <figcaption className="mt-3 font-mono text-xs leading-relaxed text-neutral-400 sm:text-sm">
                  {s.caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </main>
  );
}
