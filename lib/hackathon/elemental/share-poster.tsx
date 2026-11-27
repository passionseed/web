import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import { linkUrl, type ShareKind } from "./share";

/**
 * One sharer's poster: the key poster exported without its QR code
 * (scripts/render-share-poster-base.mjs), with the sharer's own QR code drawn
 * into the empty cream block and their code under it, like the numbered
 * printed copies ("No. 101"). A teacher's says "ครู · No. CODE" and its QR
 * code tags ?src=t-<code>. The QR code goes on top of the grain, so it stays
 * sharp after LINE shrinks the image.
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
const FONTS = path.join(process.cwd(), "lib/og/fonts");
let assets: Promise<{ meta: PosterBase; image: Buffer; mono: Buffer; thai: Buffer }> | undefined;
function load() {
  return (assets ??= Promise.all([
    readFile(path.join(DIR, "poster-base.json"), "utf8"),
    readFile(path.join(DIR, "poster-base.jpg")),
    readFile(path.join(FONTS, "SpaceMono-Regular.ttf")),
    // Space Mono has no Thai: "ครู" falls back to Trirong, the poster's Thai face.
    readFile(path.join(FONTS, "Trirong-Regular.ttf")),
  ]).then(([meta, image, mono, thai]) => ({ meta: JSON.parse(meta) as PosterBase, image, mono, thai })));
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

export const posterLabel = (code: string, kind: ShareKind = "student") =>
  `${kind === "teacher" ? "ครู · " : ""}No. ${code.toUpperCase()}`;

/** A JPEG of the poster with this sharer's QR code and code. */
export async function renderSharePoster(code: string, kind: ShareKind = "student"): Promise<Buffer> {
  const { meta, image, mono, thai } = await load();
  const s = meta.scale;
  const qrPx = Math.round(meta.qr.size * s);
  const qr = Buffer.from(qrSvg(linkUrl(kind, code), qrPx));

  // The code under the block, right-aligned with it, in Space Mono (satori, so the font is the poster's).
  const labelW = Math.round(meta.block.width * s);
  const labelH = Math.round(22 * s);
  const label = await new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
        <span style={{ fontFamily: "Space Mono, Trirong", fontSize: 14 * s, lineHeight: `${18 * s}px`, letterSpacing: "0.04em", color: EL.cream, opacity: 0.8 }}>
          {posterLabel(code, kind)}
        </span>
      </div>
    ),
    {
      width: labelW,
      height: labelH,
      fonts: [
        { name: "Space Mono", data: mono, weight: 400, style: "normal" },
        { name: "Trirong", data: thai, weight: 400, style: "normal" },
      ],
    },
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

/** Link previews (og:image) are 1200×630. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * This sharer's poster as a link preview: the poster's top (the wordmark,
 * the dates, the sky with the fire's smoke) cropped to 1200×630, with their
 * "No. CODE" stamp, so a share link pasted in LINE shows their own poster.
 * The QR code stays off: a preview card is tapped, not scanned.
 */
export async function renderSharePosterOg(code: string, kind: ShareKind = "student"): Promise<Buffer> {
  const { meta, image, mono, thai } = await load();
  const s = meta.scale;
  const { width, height } = OG_SIZE;
  const cropHeight = Math.round((meta.width * s * height) / width);
  const plate = { width: 290, height: 48 };
  const label = await new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(12,13,12,0.82)" }}>
        <span style={{ fontFamily: "Space Mono, Trirong", fontSize: 24, lineHeight: "30px", letterSpacing: "0.04em", color: EL.cream }}>{posterLabel(code, kind)}</span>
      </div>
    ),
    {
      ...plate,
      fonts: [
        { name: "Space Mono", data: mono, weight: 400, style: "normal" },
        { name: "Trirong", data: thai, weight: 400, style: "normal" },
      ],
    },
  ).arrayBuffer();

  return sharp(image)
    .extract({ left: 0, top: 0, width: meta.width * s, height: cropHeight })
    .resize(width, height)
    .composite([{ input: Buffer.from(label), left: width - plate.width - 40, top: height - plate.height - 36 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
