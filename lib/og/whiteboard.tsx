import React from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { OG_SIZE } from "./poster";

/**
 * Link preview for whiteboards: warm paper, a dot grid, the board itself on a
 * tilted card, a few stickies and a friend's cursor so it reads as "come draw".
 */

export type WhiteboardCard = {
  title: string;
  subtitle: string;
  /** Small pill under the subtitle, e.g. how many people are on the board. */
  chip?: string;
  /** Who is shown holding the cursor. */
  cursorName?: string;
  /** Board thumbnail as a data URL (any format sharp reads). */
  thumbnail?: string | null;
};

const INK = "#2a2118";
const PAPER = "#fbf6ee";
const STICKIES = [
  { fill: "#ffe680", text: "ไอเดีย!", rotate: -6 },
  { fill: "#ffb3d1", text: "+1", rotate: 5 },
  { fill: "#a8d8ff", text: "ลองดู", rotate: -3 },
];

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]> | undefined;
function loadFonts() {
  return (fonts ??= Promise.all([
    readFile(path.join(process.cwd(), "lib/og/fonts/Tiny5-Regular.ttf")),
    readFile(path.join(process.cwd(), "lib/og/fonts/Kodchasan-Bold.ttf")),
  ]).then(([pixel, thai]) => [
    { name: "Pixel", data: pixel, weight: 400, style: "normal" },
    { name: "Thai", data: thai, weight: 700, style: "normal" },
  ]));
}

const dots = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><pattern id="d" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#d9c7ad"/></pattern></defs><rect width="1200" height="630" fill="url(#d)"/></svg>`,
).toString("base64")}`;

const cursor = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 17 20"><path d="M1 1l14 8-6.5 1.6L5.5 18z" fill="#e2711d" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
).toString("base64")}`;

/** Satori can't decode WebP (what the editor stores), so re-encode as PNG. */
async function toPng(dataUrl: string | null | undefined): Promise<string | null> {
  const match = dataUrl?.match(/^data:image\/[a-z+]+;base64,(.+)$/);
  if (!match) return null;
  try {
    const png = await sharp(Buffer.from(match[1], "base64"))
      .resize(560, 400, { fit: "inside", withoutEnlargement: false })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function shorten(text: string, limit: number): string {
  const letters = Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (p) => p.segment);
  return letters.length > limit ? `${letters.slice(0, limit - 1).join("").trimEnd()}…` : text;
}

export async function renderWhiteboardCard(input: WhiteboardCard) {
  const title = shorten(input.title, 40);
  const subtitle = shorten(input.subtitle, 80);
  const thumb = await toPng(input.thumbnail);
  const titleSize = title.length > 26 ? 54 : title.length > 14 ? 66 : 80;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: PAPER, fontFamily: "Thai", color: INK }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dots} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
      {/* Horizon: warm light low on the page */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 260,
          display: "flex",
          backgroundImage: "linear-gradient(to top, rgba(255,196,106,0.35), rgba(254,217,92,0.12) 45%, rgba(251,246,238,0))",
        }}
      />

      {/* Copy */}
      <div style={{ position: "absolute", left: 64, top: 52, display: "flex", fontFamily: "Pixel", fontSize: 24, letterSpacing: 2, color: "#b45a12" }}>
        PASSIONSEED / WHITEBOARD
      </div>
      <div style={{ position: "absolute", left: 60, top: 120, width: 560, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: titleSize, lineHeight: 1.3, maxHeight: 300, overflow: "hidden" }}>{title}</div>
        <div style={{ display: "flex", width: 120, height: 4, marginTop: 18, backgroundImage: "linear-gradient(90deg, #f0a43c, rgba(254,217,92,0))" }} />
        <div style={{ display: "flex", marginTop: 22, fontSize: 28, lineHeight: 1.5, color: "rgba(42,33,24,0.72)" }}>{subtitle}</div>
        {input.chip && (
          <div style={{ display: "flex", marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                padding: "6px 18px",
                borderRadius: 999,
                border: "1px solid rgba(217,119,6,0.35)",
                background: "rgba(254,237,200,0.7)",
                fontSize: 22,
                color: "#8a4510",
              }}
            >
              {input.chip}
            </div>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 64, bottom: 44, display: "flex", fontFamily: "Pixel", fontSize: 24, color: "#b45a12" }}>
        PASSIONSEED.ORG
      </div>

      {/* The board */}
      <div
        style={{
          position: "absolute",
          right: 70,
          top: 92,
          width: 470,
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 22,
          border: "1px solid rgba(186,128,62,0.22)",
          boxShadow: "0 30px 60px -20px rgba(120,70,20,0.35), 0 6px 16px rgba(120,70,20,0.12)",
          transform: "rotate(2.5deg)",
          overflow: "hidden",
        }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" style={{ maxWidth: 440, maxHeight: 330, objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", gap: 22 }}>
            {STICKIES.map((s) => (
              <div
                key={s.text}
                style={{
                  width: 120,
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: s.fill,
                  borderRadius: 10,
                  fontSize: 26,
                  transform: `rotate(${s.rotate}deg)`,
                  boxShadow: "0 8px 16px -8px rgba(60,35,10,0.35)",
                }}
              >
                {s.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stickies spilling off the card */}
      <div
        style={{
          position: "absolute",
          right: 470,
          top: 410,
          width: 128,
          height: 128,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffe680",
          borderRadius: 12,
          fontSize: 28,
          transform: "rotate(-8deg)",
          boxShadow: "0 14px 24px -10px rgba(60,35,10,0.4)",
        }}
      >
        มาวาดกัน
      </div>
      <div
        style={{
          position: "absolute",
          right: 46,
          top: 430,
          width: 104,
          height: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b5f0b0",
          borderRadius: 12,
          fontSize: 38,
          transform: "rotate(7deg)",
          boxShadow: "0 14px 24px -10px rgba(60,35,10,0.4)",
        }}
      >
        +1
      </div>

      {/* A friend's cursor */}
      <div style={{ position: "absolute", left: 770, top: 466, display: "flex", alignItems: "flex-start" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cursor} width={34} height={40} alt="" />
        <div
          style={{
            display: "flex",
            marginTop: 30,
            marginLeft: -6,
            padding: "6px 14px",
            borderRadius: 999,
            background: "#e2711d",
            color: "#fff",
            fontSize: 22,
          }}
        >
          {shorten(input.cursorName ?? "เพื่อน", 18)}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
