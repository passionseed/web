import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import { shareUrl } from "./share";

/**
 * One sharer's poster: the key poster exported without its QR code
 * (scripts/render-share-poster-base.mjs), with the sharer's own QR code drawn
 * into the empty cream block and their code under it, like the numbered
 * printed copies ("No. 101"). The QR code goes on top of the grain, so it
 * stays sharp after LINE shrinks the image.
 */

export type PosterBase = {
  version: string;
  scale: number;
  qr: { x: number; y: number; size: number };
  block: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
};

const DIR = path.join(process.cwd(), "lib/hackathon/elemental/share");
let assets: Promise<{ meta: PosterBase; image: Buffer; mono: Buffer }> | undefined;
function load() {
  return (assets ??= Promise.all([
    readFile(path.join(DIR, "poster-base.json"), "utf8"),
    readFile(path.join(DIR, "poster-base.jpg")),
    readFile(path.join(process.cwd(), "lib/og/fonts/SpaceMono-Regular.ttf")),
  ]).then(([meta, image, mono]) => ({ meta: JSON.parse(meta) as PosterBase, image, mono })));
}

export async function posterVersion(): Promise<string> {
  return (await load()).meta.version;
}

/** The QR code as an SVG of ink cells on nothing, sized in whole cells so the edges stay crisp. */
function qrSvg(url: string, px: number): string {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="${EL.ink}"/></svg>`;
}

export const posterLabel = (code: string) => `No. ${code.toUpperCase()}`;

/** A JPEG of the poster with this sharer's QR code and code. */
export async function renderSharePoster(code: string): Promise<Buffer> {
  const { meta, image, mono } = await load();
  const s = meta.scale;
  const qrPx = Math.round(meta.qr.size * s);
  const qr = Buffer.from(qrSvg(shareUrl(code), qrPx));

  // The code under the block, right-aligned with it, in Space Mono (satori, so the font is the poster's).
  const labelW = Math.round(meta.block.width * s);
  const labelH = Math.round(22 * s);
  const label = await new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
        <span style={{ fontFamily: "Space Mono", fontSize: 14 * s, lineHeight: `${18 * s}px`, letterSpacing: "0.04em", color: EL.cream, opacity: 0.8 }}>
          {posterLabel(code)}
        </span>
      </div>
    ),
    { width: labelW, height: labelH, fonts: [{ name: "Space Mono", data: mono, weight: 400, style: "normal" }] },
  ).arrayBuffer();

  return sharp(image)
    .composite([
      { input: qr, left: Math.round(meta.qr.x * s), top: Math.round(meta.qr.y * s) },
      {
        input: Buffer.from(label),
        left: Math.round(meta.block.x * s),
        top: Math.round((meta.block.y + meta.block.height + 4) * s),
      },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}
