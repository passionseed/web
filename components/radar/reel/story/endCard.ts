/**
 * The story reel's end card per platform (docs/radar-guide/README.md, Caption
 * templates). Instagram: the script's CTA with the RADAR comment keyword (the
 * comment-to-DM flow). TikTok has no comment-to-DM flow, so its card shows
 * the typeable link from the TikTok caption instead. Pure.
 */
import { GUIDE_INDEX } from "../../../../lib/radar-guides/index";
import type { StoryScript } from "../../../../lib/radar-stories/types";

export type StoryPlatform = "ig" | "tt";
export const STORY_PLATFORMS: readonly StoryPlatform[] = ["ig", "tt"];
export const STORY_KEYWORD = "RADAR";

export type StoryEndCard =
  | { kind: "comment"; lineTh: string; keyword: string; friendTh: string }
  | { kind: "link"; headlineTh: string; url: string; friendTh: string };

/** The typeable link a TikTok viewer types: from the caption, else the career alias, else the Radar hub. */
export function storyTiktokUrl(script: Pick<StoryScript, "captionTtTh" | "series" | "slug">): string {
  const inCaption = /passionseed\.org\/[A-Za-z0-9\-/]+/.exec(script.captionTtTh ?? "");
  if (inCaption) return inCaption[0].replace(/\/+$/, "");
  const alias = script.series === "career" && script.slug ? GUIDE_INDEX[script.slug]?.alias ?? script.slug : null;
  return alias ? `passionseed.org/r/${alias}` : "passionseed.org/radar";
}

export function storyEndCard(script: Pick<StoryScript, "endCardTh" | "sendToFriendTh" | "captionTtTh" | "series" | "slug">, platform: StoryPlatform): StoryEndCard {
  const friendTh = script.sendToFriendTh.trim();
  if (platform === "tt") return { kind: "link", headlineTh: "ข้อมูลเต็ม พิมพ์", url: storyTiktokUrl(script), friendTh };
  return { kind: "comment", lineTh: script.endCardTh.trim(), keyword: STORY_KEYWORD, friendTh };
}

/** Splits a CTA around the keyword so the card can light it up. */
export function splitKeyword(text: string, keyword: string = STORY_KEYWORD): { text: string; keyword: boolean }[] {
  return text
    .split(new RegExp(`(${keyword})`))
    .filter(Boolean)
    .map((part) => ({ text: part, keyword: part === keyword }));
}
