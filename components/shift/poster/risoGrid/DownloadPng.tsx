"use client";

/**
 * Download links for the SHIFT[2] grid preview. They serve PNGs exported by
 * scripts/export-shift2-grid.mjs (a real browser screenshot of each slide),
 * because in-browser rasterising drops the riso grain and paper margin and
 * can re-break Thai lines. Re-run the script after editing a slide.
 */

import { gridPngUrl as pngUrl } from "./gridPng";

const BUTTON =
  "inline-block rounded-md bg-neutral-800 px-4 py-2 font-mono text-sm text-neutral-100 hover:bg-neutral-700";

export function DownloadPng({ id, label }: { id: string; label?: string }) {
  return (
    <a className={BUTTON} href={pngUrl(id)} download={`${id}.png`}>
      {label ?? `Download ${id}.png`}
    </a>
  );
}

/** Saves every slide of one post, one file each. */
export function DownloadAll({ ids, label }: { ids: string[]; label: string }) {
  const saveAll = async () => {
    for (const id of ids) {
      const link = document.createElement("a");
      link.href = pngUrl(id);
      link.download = `${id}.png`;
      link.click();
      // Browsers drop rapid back-to-back downloads; space them out.
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  };
  return (
    <button type="button" className={BUTTON} onClick={saveAll}>
      {label}
    </button>
  );
}
