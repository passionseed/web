/**
 * Link-preview card for code guides (cover and each level), drawn from code
 * only: no database, no network. Night palette, chunky pixel frame, Kodchasan
 * for Thai. Used by app/radar/[slug]/opengraph-image.tsx (cover) and
 * app/radar/[slug]/(guide)/[page]/opengraph-image.tsx (levels).
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { OG_SIZE } from "@/lib/og/poster";

const NIGHT = "#120a14";
const CREAM = "#fff1e6";

let thaiFont: Promise<Buffer> | undefined;
function loadThaiFont() {
  return (thaiFont ??= readFile(path.join(process.cwd(), "lib/og/fonts/Kodchasan-Bold.ttf")));
}

/** Grapheme-safe clip, so Thai marks stay on their letters. */
export function shortenTh(text: string, limit: number): string {
  const letters = Array.from(
    new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text),
    (part) => part.segment
  );
  return letters.length > limit ? `${letters.slice(0, limit - 1).join("").trimEnd()}…` : text;
}

export interface GuideOgInput {
  careerTh: string;
  headlineTh: string;
  /** A short stat line (page og.stat), shown large in the accent colour. */
  statTh?: string | null;
  /** "LV 3" for a level, "11 ด่าน" for the cover. */
  badge: string;
  accent: string;
}

export async function renderGuideOg({ careerTh, headlineTh, statTh, badge, accent }: GuideOgInput) {
  const headline = shortenTh(headlineTh, 60);
  const stat = statTh ? shortenTh(statTh, 18) : null;
  const pixel = 12;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: NIGHT,
          padding: pixel * 2,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            border: `${pixel}px solid ${accent}`,
            boxShadow: `inset 0 0 0 ${pixel}px ${NIGHT}, inset 0 0 0 ${pixel * 2}px ${accent}55`,
            color: CREAM,
            fontFamily: "Thai",
            backgroundImage: `linear-gradient(180deg, ${NIGHT} 0%, #1f1030 70%, #2a1238 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: pixel * 2, height: pixel * 2, background: accent }} />
              <div style={{ fontSize: 30, letterSpacing: 4, color: "rgba(255,241,230,0.75)" }}>CAREER RADAR</div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                padding: "6px 18px",
                background: accent,
                color: NIGHT,
              }}
            >
              {badge}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 40, color: accent }}>{shortenTh(careerTh, 28)}</div>
            <div style={{ fontSize: headline.length > 34 ? 60 : 76, lineHeight: 1.2 }}>{headline}</div>
            {stat ? <div style={{ fontSize: 64, lineHeight: 1, color: accent }}>{stat}</div> : null}
          </div>

          <div style={{ display: "flex", fontSize: 28, color: "rgba(255,241,230,0.6)" }}>passionseed.org/radar</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Thai", data: await loadThaiFont(), weight: 700, style: "normal" }],
    }
  );
}
