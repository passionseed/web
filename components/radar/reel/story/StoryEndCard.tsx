/**
 * The end card: the Radar mark, the call to action (Instagram: the CTA with
 * RADAR lit up; TikTok: the typeable link), the share line, over the Radar
 * map. P'Seed stands below it (StoryReel moves the host there). Lines land a
 * beat apart, drawn from the frame number.
 */
import { BADGE_GLYPHS, STORY_PALETTE } from "@/components/radar/guide/story/pixel-art";
import { PixelSprite } from "@/components/radar/guide/story/PixelSprite";
import { FRAME_MS } from "@/lib/radar-stories/timing";

import { SAFE, STORY_FRAME } from "./cast";
import { splitKeyword, type StoryEndCard } from "./endCard";
import { SceneArt, Dim } from "./StoryScene";
import { STORY_REEL_TIMING } from "./storyTimeline";

const RADAR_GREEN = "#5cff5c";

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

export function EndCardView({ card, frameInCard }: { card: StoryEndCard; frameInCard: number }) {
  const T = STORY_REEL_TIMING;
  const urlSize = card.kind === "link" ? Math.min(24, Math.floor(340 / (card.url.length * 0.6))) : 0;
  return (
    <div className="absolute inset-0" data-end={card.kind}>
      <SceneArt scene="radar" frame={0} />
      <Dim amount={0.72} />
      <div className="absolute flex flex-col items-center gap-[22px]" style={{ left: 22, right: 22, top: SAFE.top + 10 }}>
        <RadarMark />
        <div className="sr-box w-full px-[18px] pb-[20px] pt-[16px] text-center" style={{ ["--sr-border" as string]: "var(--sr-orange)", ...pop(frameInCard, T.endCtaMs) }}>
          {card.kind === "comment" ? (
            <p className="sr-big m-0" style={{ fontSize: 34 }}>
              {splitKeyword(card.lineTh, card.keyword).map((part, i) =>
                part.keyword ? (
                  <span key={i} className="mx-[2px] inline-block px-[8px]" style={{ backgroundColor: "var(--sr-orange)", color: "var(--sr-ink)", fontFamily: "var(--sr-pixel)", letterSpacing: "0.04em" }}>
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
          ) : (
            <>
              <p className="sr-big m-0" style={{ fontSize: 32 }}>
                {card.headlineTh}
              </p>
              <p className="m-0 mt-[12px] inline-block px-[10px] py-[4px]" style={{ fontFamily: "var(--sr-mono)", fontWeight: 700, fontSize: urlSize, color: "var(--sr-ink)", backgroundColor: "var(--sr-orange)" }}>
                {card.url}
              </p>
            </>
          )}
        </div>
        <p
          className="sr-big m-0 px-[12px] py-[4px]"
          style={{ fontSize: 21, fontWeight: 600, color: "var(--sr-cream)", backgroundColor: "var(--sr-night)", maxWidth: STORY_FRAME.width - 56, ...pop(frameInCard, T.endFriendMs) }}
        >
          {card.friendTh}
        </p>
      </div>
    </div>
  );
}
