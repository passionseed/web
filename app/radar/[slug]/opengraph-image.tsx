import React from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { OG_SIZE } from "@/lib/og/poster";
import { getCachedPublishedRadarField } from "@/lib/radar/server";
import { readableAccent } from "@/lib/radar/card-visuals";
import { radarFieldName, radarHookStat } from "@/lib/radar/field-meta";
import { renderGuideOg } from "@/components/radar/guide/shell/guide-og";
import { guideHookTh } from "@/components/radar/guide/shell/guide-routes";
import { guideVisible } from "@/lib/radar-guides";
import { loadGuide } from "@/lib/radar-guides/registry.server";

// Per-career link preview (spec 2.9). Overrides the hub's
// app/radar/opengraph-image.png for field pages. The alt text is per segment,
// so it is exported here: an opengraph-image.alt.txt only pairs with a static
// image file.
export const alt = "Career Radar: อาชีพนี้ทำงานอะไร เงินเดือนเท่าไร";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

const BACKGROUND = "#0a0a0a";

let thaiFont: Promise<Buffer> | undefined;
function loadThaiFont() {
  return (thaiFont ??= readFile(path.join(process.cwd(), "lib/og/fonts/Kodchasan-Bold.ttf")));
}

/** Grapheme-safe clip, so Thai marks stay on their letters. */
function shorten(text: string, limit: number): string {
  const letters = Array.from(
    new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text),
    (part) => part.segment
  );
  return letters.length > limit ? `${letters.slice(0, limit - 1).join("").trimEnd()}…` : text;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Code-guide careers: the cover card from code (no database).
  const guide = loadGuide(slug);
  if (guide && guideVisible(guide.meta)) {
    const first = [...guide.pages].sort((a, b) => a.order - b.order)[0];
    return renderGuideOg({
      careerTh: guide.meta.nameTh,
      headlineTh: guideHookTh(guide) || guide.meta.nameTh,
      statTh: first?.og.stat?.th ?? null,
      badge: `${guide.pages.length} ด่าน`,
      accent: guide.meta.accent,
    });
  }

  // Fails soft to a generic card: a preview must never 500.
  const field = await getCachedPublishedRadarField(slug).catch(() => null);
  const name = shorten(field ? radarFieldName(field) : "Career Radar", 28);
  const hook = field ? radarHookStat(field.radar_cards) : null;
  const accent = readableAccent(field?.color || "#3b82f6");
  const nameSize = name.length > 18 ? 76 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BACKGROUND,
          backgroundImage: `radial-gradient(circle at 85% 10%, ${accent}55 0%, transparent 45%), radial-gradient(circle at 0% 100%, ${accent}33 0%, transparent 40%)`,
          color: "#ffffff",
          fontFamily: "Thai",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: accent }} />
          <div style={{ fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.72)" }}>
            CAREER RADAR
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: nameSize, lineHeight: 1.15 }}>{name}</div>
          {hook ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <div style={{ fontSize: 88, lineHeight: 1, color: accent }}>{shorten(hook.stat, 14)}</div>
              {hook.label ? (
                <div style={{ fontSize: 32, lineHeight: 1.3, color: "rgba(255,255,255,0.78)", maxWidth: 640 }}>
                  {shorten(hook.label, 70)}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 40, color: "rgba(255,255,255,0.78)" }}>ทำงานอะไร เงินเดือนเท่าไร AI จะมาแทนไหม</div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.6)" }}>passionseed.org/radar</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Thai", data: await loadThaiFont(), weight: 700, style: "normal" }],
    }
  );
}
