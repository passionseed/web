"use client";

/**
 * The end card: the Radar mark, the call to action (Instagram: the CTA with
 * RADAR lit up; TikTok: the typeable link), the share line, over the Radar
 * map. Lines land a beat apart, drawn from the frame number. The CTA and the
 * share line break only between phrases (never inside a Thai word) and
 * shrink to fit instead. P'Seed stands below the share line: StoryReel
 * measures where it ends (`data-end-share`) and places the host there.
 */
import { useRef } from "react";

import { BADGE_GLYPHS, STORY_PALETTE } from "@/components/radar/guide/story/pixel-art";
import { PixelSprite } from "@/components/radar/guide/story/PixelSprite";
import { FRAME_MS } from "@/lib/radar-stories/timing";

import { SAFE, STORY_FRAME } from "./cast";
import { splitKeyword, type StoryEndCard } from "./endCard";
import { useFitText } from "./fit";
import { SceneArt, Dim } from "./StoryScene";
import { Phrased } from "./StoryText";
import { STORY_REEL_TIMING } from "./storyTimeline";

const RADAR_GREEN = "#5cff5c";
/** The card's column: centred, clear of the right rail on both sides. */
export const END_COLUMN = { side: STORY_FRAME.width - SAFE.right, top: SAFE.top + 10 } as const;
const CTA_PAD_X = 18;
const URL_PAD_X = 10;

/** Pixel radar glyph and the CAREER RADAR wordmark. */
export function RadarMark() {
  return (
    <div className="flex items-center justify-center gap-[14px]">
      <PixelSprite grid={BADGE_GLYPHS.radar} palette={{ "#": RADAR_GREEN, o: STORY_PALETTE.orange }} width={51.2} />
      <div className="flex flex-col leading-none">
        <span style={{ fontFamily: "var(--sr-pixel)", fontSize: 30, letterSpacing: "0.06em", color: "var(--sr-cream)" }}>CAREER RADAR</span>
        <span style={{ fontFamily: "var(--sr-mono)", fontSize: 12, letterSpacing: "0.24em", color: "var(--sr-gold)", marginTop: 6 }}>BY PASSION SEED</span>
      </div>
    </div>
  );
}

/** 0 before `atMs`, then in over three frames (a stepped pop). */
function pop(frameInCard: number, atMs: number): { opacity: number; transform: string } {
  const k = frameInCard - Math.round(atMs / FRAME_MS);
  if (k < 0) return { opacity: 0, transform: "scale(0.9)" };
  if (k < 3) return { opacity: 1, transform: `scale(${[0.92, 1.04, 1][k]})` };
  return { opacity: 1, transform: "none" };
}

/** Monospace link size so the whole link fits the CTA box on one line (Space Mono is 0.6em a character). */
export function endUrlSize(url: string): number {
  const room = STORY_FRAME.width - 2 * END_COLUMN.side - 2 * CTA_PAD_X - 2 * URL_PAD_X;
  return Math.min(24, Math.floor(room / (url.length * 0.6)));
}

function lightKeyword(keyword: string) {
  return function Lit(text: string) {
    return splitKeyword(text, keyword).map((part, i) =>
      part.keyword ? (
        <span key={i} className="mx-[2px] inline-block px-[8px]" style={{ backgroundColor: "var(--sr-orange)", color: "var(--sr-ink)", fontFamily: "var(--sr-pixel)", letterSpacing: "0.04em" }}>
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );
  };
}

export function EndCardView({ card, frameInCard }: { card: StoryEndCard; frameInCard: number }) {
  const T = STORY_REEL_TIMING;
  const cta = useRef<HTMLParagraphElement>(null);
  const share = useRef<HTMLParagraphElement>(null);
  useFitText(cta, { base: 32, min: 20 });
  useFitText(share, { base: 21, min: 15 });
  return (
    <div className="absolute inset-0" data-end={card.kind}>
      <SceneArt scene="radar" frame={0} />
      <Dim amount={0.72} />
      <div className="absolute flex flex-col items-center gap-[22px]" style={{ left: END_COLUMN.side, right: END_COLUMN.side, top: END_COLUMN.top }}>
        <RadarMark />
        <div className="sr-box w-full pb-[20px] pt-[16px] text-center" style={{ ["--sr-border" as string]: "var(--sr-orange)", paddingLeft: CTA_PAD_X, paddingRight: CTA_PAD_X, ...pop(frameInCard, T.endCtaMs) }}>
          {card.kind === "comment" ? (
            <p ref={cta} className="sr-big m-0">
              <Phrased line={card.lineTh} decorate={lightKeyword(card.keyword)} />
            </p>
          ) : (
            <>
              <p ref={cta} className="sr-big m-0">
                <Phrased line={card.headlineTh} />
              </p>
              <p className="m-0 mt-[12px] inline-block py-[4px]" style={{ fontFamily: "var(--sr-mono)", fontWeight: 700, fontSize: endUrlSize(card.url), color: "var(--sr-ink)", backgroundColor: "var(--sr-orange)", paddingLeft: URL_PAD_X, paddingRight: URL_PAD_X }}>
                {card.url}
              </p>
            </>
          )}
        </div>
        <p
          ref={share}
          data-end-share=""
          className="sr-big m-0 min-w-0 max-w-full px-[12px] py-[4px]"
          style={{ fontWeight: 600, color: "var(--sr-cream)", backgroundColor: "var(--sr-night)", ...pop(frameInCard, T.endFriendMs) }}
        >
          <Phrased line={card.friendTh} />
        </p>
      </div>
    </div>
  );
}
