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

/** The Instagram Story base (1080×1920): the same poster moved down, with a box for the link sticker. */
export type StoryBase = PosterBase & {
  /** How far down the poster sits. */
  top: number;
  sticker: { x: number; y: number; width: number; height: number };
};

const DIR = path.join(process.cwd(), "lib/hackathon/elemental/share");
const FONTS = path.join(process.cwd(), "lib/og/fonts");
type Assets = { meta: PosterBase; image: Buffer; story: StoryBase; storyImage: Buffer; mono: Buffer; thai: Buffer };
let assets: Promise<Assets> | undefined;
function load() {
  return (assets ??= Promise.all([
    readFile(path.join(DIR, "poster-base.json"), "utf8"),
    readFile(path.join(DIR, "poster-base.jpg")),
    readFile(path.join(DIR, "poster-base.story.json"), "utf8"),
    readFile(path.join(DIR, "poster-base.story.jpg")),
    readFile(path.join(FONTS, "SpaceMono-Regular.ttf")),
    // Space Mono has no Thai: "ครู" falls back to Trirong, the poster's Thai face.
    readFile(path.join(FONTS, "Trirong-Regular.ttf")),
  ]).then(([meta, image, story, storyImage, mono, thai]) => ({
    meta: JSON.parse(meta) as PosterBase,
    image,
    story: JSON.parse(story) as StoryBase,
    storyImage,
    mono,
    thai,
  })));
}

export async function posterVersion(): Promise<string> {
  return (await load()).meta.version;
}

/** The Story base's version, for ?v= on format=story links (it can change without the 4:5 poster changing). */
export async function storyVersion(): Promise<string> {
  return (await load()).story.version;
}

const fontsFor = ({ mono, thai }: Pick<Assets, "mono" | "thai">) => [
  { name: "Space Mono", data: mono, weight: 400 as const, style: "normal" as const },
  { name: "Trirong", data: thai, weight: 400 as const, style: "normal" as const },
];

/**
 * Every share link's code at the same size, version 5 (37×37 cells), so
 * students' and teachers' codes print alike: 8px cells in the 2x image, 4px
 * once Instagram or LINE halves it. A link too long for it (none today) gets
 * the smallest version that fits.
 */
function qrCode(url: string) {
  try {
    return QRCode.create(url, { errorCorrectionLevel: "M", version: 5 });
  } catch {
    return QRCode.create(url, { errorCorrectionLevel: "M" });
  }
}

/**
 * The QR code as an SVG of ink cells on nothing, at most px wide, in whole
 * pixels per cell so the edges stay crisp (and land on whole pixels again
 * when Instagram or LINE halves the image). size is what it came to.
 */
function qrSvg(url: string, px: number): { svg: Buffer; size: number } {
  const { modules } = qrCode(url);
  const n = modules.size;
  const size = n * Math.floor(px / n);
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return {
    svg: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="${EL.ink}"/></svg>`),
    size,
  };
}

/** "No. 1A2B 3C4D": the code in two groups of four, as the pages print it (CodeText). */
export const posterLabel = (code: string, kind: ShareKind = "student") => {
  const c = code.toUpperCase();
  return `${kind === "teacher" ? "ครู · " : ""}No. ${c.slice(0, 4)} ${c.slice(4)}`;
};

/**
 * The sharer's QR code in the empty cream block, and their code under it,
 * right-aligned with it, in Space Mono (satori, so the font is the poster's).
 */
async function codeLayers(base: PosterBase, code: string, kind: ShareKind, fonts: Pick<Assets, "mono" | "thai">): Promise<sharp.OverlayOptions[]> {
  const s = base.scale;
  const room = Math.round(base.qr.size * s);
  const qr = qrSvg(linkUrl(kind, code), room);
  const inset = Math.floor((room - qr.size) / 2); // centred where the poster's own code was
  const label = await new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
        <span style={{ fontFamily: "Space Mono, Trirong", fontSize: 14 * s, lineHeight: `${18 * s}px`, letterSpacing: "0.04em", color: EL.cream, opacity: 0.8 }}>
          {posterLabel(code, kind)}
        </span>
      </div>
    ),
    { width: Math.round(base.block.width * s), height: Math.round(22 * s), fonts: fontsFor(fonts) },
  ).arrayBuffer();
  return [
    { input: qr.svg, left: Math.round(base.qr.x * s) + inset, top: Math.round(base.qr.y * s) + inset },
    { input: Buffer.from(label), left: Math.round(base.block.x * s), top: Math.round((base.block.y + base.block.height + 4) * s) },
  ];
}

/** A JPEG of the poster with this sharer's QR code and code. */
export async function renderSharePoster(code: string, kind: ShareKind = "student"): Promise<Buffer> {
  const assets = await load();
  return sharp(assets.image)
    .composite(await codeLayers(assets.meta, code, kind, assets))
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

// copy: placeholder — Angpao rewrites
/** What the dashed box on the Story says: put Instagram's link sticker (with the sharer's link) here. */
export const STORY_STICKER_LABEL = "แปะลิงก์ตรงนี้";

/** The words in the sticker box, the same for everyone, so they're drawn once per server. */
let stickerLabel: Promise<Buffer> | undefined;
function stickerLayer(story: StoryBase, fonts: Pick<Assets, "mono" | "thai">): Promise<Buffer> {
  const s = story.scale;
  return (stickerLabel ??= new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "Space Mono, Trirong", fontSize: 26 * s, lineHeight: `${34 * s}px`, color: EL.cream, opacity: 0.72 }}>
          [{STORY_STICKER_LABEL}]
        </span>
      </div>
    ),
    { width: story.sticker.width * s, height: story.sticker.height * s, fonts: fontsFor(fonts) },
  )
    .arrayBuffer()
    .then((b) => Buffer.from(b)));
}

/**
 * This sharer's poster as an Instagram Story, 1080×1920 (2x): the key poster
 * moved down below Instagram's top bar, the sky carried on above it and the
 * dark foot below it, with their QR code and code as on the 4:5 poster and a
 * dashed box saying where to put the link sticker (their link goes in the
 * sticker, so viewers can tap it).
 */
export async function renderShareStory(code: string, kind: ShareKind = "student"): Promise<Buffer> {
  const assets = await load();
  const { story } = assets;
  const s = story.scale;
  return sharp(assets.storyImage)
    .composite([
      ...(await codeLayers(story, code, kind, assets)),
      { input: await stickerLayer(story, assets), left: story.sticker.x * s, top: story.sticker.y * s },
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
    { ...plate, fonts: fontsFor({ mono, thai }) },
  ).arrayBuffer();

  return sharp(image)
    .extract({ left: 0, top: 0, width: meta.width * s, height: cropHeight })
    .resize(width, height)
    .composite([{ input: Buffer.from(label), left: width - plate.width - 40, top: height - plate.height - 36 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
