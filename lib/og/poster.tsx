import React from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PX, bands, building, cloud, disc, sprite, reflect, glints, boat,
  STUDENT, STUDENT_PALETTE, BIRD, BIRD_PALETTE, GULL, waveBand, type Rect,
} from "../../components/shift/poster/pixel/pixelKit";

export const OG_SIZE = { width: 1200, height: 630 };
export interface PosterCopy {
  title: string;
  subtitle: string;
  label?: string;
  footer?: string;
  theme?: "dawn" | "dusk" | "bloom";
}

/** The SHIFT[1] world, recomposed with a quiet left sky for social-preview type. */
function scene(theme: PosterCopy["theme"]): string {
  const dusk = theme === "dusk";
  const bloom = theme === "bloom";
  const sky = dusk ? ["#221c36", "#49405f", "#ac817d"] : bloom ? ["#f2d5bd", "#f6e1c8", "#fff0d2"] : [PX.skyTop, PX.sky, PX.skyHaze];
  const skyline: Rect[] = [];
  for (let i = 0; i < 16; i++) skyline.push(...building(i * 14, 61 + (i * 7 % 9), 12, 77, { body: dusk ? "#615367" : PX.far }));
  skyline.push(...building(140, 49, 14, 77, { body: PX.mid, window: PX.windowDark, lit: 0.25 }));
  skyline.push(...building(176, 38, 12, 77, { body: PX.near, window: PX.windowDark, lit: 0.4, roof: "garden" }));
  skyline.push(...building(190, 22, 10, 77, { body: PX.near, window: PX.windowDark, lit: 0.6, roof: "antenna" }));
  const hero = [...sprite(STUDENT, STUDENT_PALETTE, 5, 1), ...sprite(BIRD, BIRD_PALETTE, 18, 5), ...boat(0, 15, 26)]
    .map(([x, y, w, h, fill]): Rect => [151 + x * 1.8, 44 + y * 1.8, w * 1.8, h * 1.8, fill]);
  const rects: Rect[] = [
    ...bands(0, 200, [[0, sky[0]], [28, sky[1]], [56, sky[2]], [77, sky[2]]]),
    ...disc(132, 57, 9, PX.sun), ...cloud(137, 22, [4, 5, 3]), ...cloud(175, 12, [3, 4]),
    ...sprite(GULL, { W: dusk ? PX.cream : PX.mid }, 153, 11),
    ...sprite(GULL, { W: dusk ? PX.cream : PX.mid }, 163, 17),
    ...skyline, ...bands(0, 200, [[77, PX.waterLight], [81, PX.water], [94, PX.water]]),
    ...reflect(skyline, 77, 13), ...reflect(hero, 80, 8), ...hero,
    ...glints(81, 92, 15, 200), ...waveBand(92, PX.ink, 12, 200, 105),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 200 105" shape-rendering="crispEdges">${rects.map(([x,y,w,h,fill]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`).join("")}</svg>`;
}

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]> | undefined;
function loadFonts() {
  return fonts ??= Promise.all([
    readFile(path.join(process.cwd(), "lib/og/fonts/Tiny5-Regular.ttf")),
    readFile(path.join(process.cwd(), "lib/og/fonts/Kodchasan-Bold.ttf")),
  ]).then(([pixel, thai]) => [
    { name: "Pixel", data: pixel, weight: 400, style: "normal" },
    { name: "Thai", data: thai, weight: 700, style: "normal" },
  ]);
}

function shorten(text: string, limit: number): string {
  // Grapheme boundaries keep Thai combining marks attached to their letters.
  const letters = Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (part) => part.segment);
  return letters.length > limit ? `${letters.slice(0, limit - 1).join("").trimEnd()}…` : text;
}

export async function renderPoster(input: PosterCopy) {
  const copy = { ...input, title: shorten(input.title, 56), subtitle: shorten(input.subtitle, 100) };
  const isThai = /[\u0e00-\u0e7f]/.test(copy.title);
  const titleSize = isThai ? (copy.title.length > 24 ? 52 : 66) : copy.title.length > 36 ? 60 : copy.title.length > 18 ? 76 : copy.title.length > 12 ? 86 : copy.title.length > 8 ? 104 : 124;
  const ink = copy.theme === "dusk" ? PX.cream : PX.ink;
  const art = `data:image/svg+xml;base64,${Buffer.from(scene(copy.theme)).toString("base64")}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Thai", color: ink }}>
      {/* SVG is embedded so Satori preserves the coarse pixel grid. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: 50, top: 36, display: "flex", fontFamily: "Pixel", fontSize: 25, letterSpacing: 2 }}>
        PASSIONSEED / {copy.label ?? "BUILD YOUR OWN WAY"}
      </div>
      <div style={{ position: "absolute", left: 48, top: 91, width: 800, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: isThai ? "Thai" : "Pixel", fontSize: titleSize, lineHeight: isThai ? 1.35 : 0.95, letterSpacing: isThai ? 0 : -1, maxHeight: 252, overflow: "hidden", textShadow: copy.theme === "dusk" ? "4px 4px #221c36" : `4px 4px ${PX.cloudShade}` }}>
          {copy.title}
        </div>
        <div style={{ display: "flex", marginTop: 20, width: 710, fontSize: 27, lineHeight: 1.5 }}>
          {copy.subtitle}
        </div>
      </div>
      <div style={{ position: "absolute", left: 50, bottom: 20, right: 48, display: "flex", justifyContent: "space-between", alignItems: "center", color: PX.cream }}>
        <div style={{ display: "flex", fontSize: 22 }}>{copy.footer ?? "ลองจริง สร้างจริง ค้นพบทางของตัวเอง"}</div>
        <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 25, color: PX.accentLight }}>PASSIONSEED.ORG</div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
