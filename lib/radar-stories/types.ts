/**
 * Story reels: the shared script contract. Short vertical storytelling videos
 * (9:16, 1080x1920, 20 to 40 seconds) for Instagram Reels and TikTok, told in
 * Career Radar's pixel world by pixel characters, dialogue boxes and big Thai
 * text over the reel soundtrack. The host is P'Seed (GUIDE_HOST in
 * lib/radar-guide/story.ts); the protagonist is a Thai high-school student
 * (ม.4 to ม.6) drawn as the pixel student avatar.
 *
 * This file is the contract the script writers work to: keep it exactly in
 * step with the spec (docs/radar-guide/README.md, "Story reels"). Scripts live
 * in lib/radar-stories/scripts/*.ts; lib/radar-stories/lint.ts checks the house
 * rules; scripts/radar-guide/story.ts films them.
 */

export type Who = "student" | "friend" | "parent" | "host" | "text";
export type Mood = "idle" | "talk" | "wow" | "serious" | "wink";
export type Scene =
  | "bedroom-night" // student on the bed with a phone, late
  | "classroom" // desks, board, teacher's desk (no teacher drawn)
  | "dinner-table" // family dinner
  | "school-gate" // after school, friends leaving
  | "phone-feed" // full-screen phone UI, scrolling
  | "radar" // Career Radar's world: the level map
  | `career:${string}`; // a career guide's scene, e.g. "career:ux-design/work"
//                         = public/radar/guides/ux-design/work.webp

export interface StoryBeat {
  who: Who;
  /** What is said or shown. At most 60 characters. */
  lineTh: string;
  /** P'Seed's face when who = "host". */
  mood?: Mood;
  scene: Scene;
  /** How long the beat stays (default from line length). */
  ms?: number;
  /** Show the line as huge centred text (hooks, twists). */
  big?: boolean;
  /**
   * The words that sting, drawn in the speaker's colour so the eye lands on
   * them first. Must sit inside one phrase of lineTh (lint checks).
   */
  stressTh?: string;
}

export interface StoryScript {
  /** kebab-case, unique, e.g. "lost-01-dinner". */
  id: string;
  series: "lost" | "round1" | "career";
  /** Career slug when series = "career". */
  slug?: string;
  /** Internal name. */
  titleTh: string;
  /** First 1.5 s, huge text. At most 28 characters. */
  hookTh: string;
  /** Two alternates for Trial Reels. */
  hookVariantsTh: [string, string];
  /** 6 to 10 beats. */
  beats: StoryBeat[];
  /** The CTA card, e.g. "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้". */
  endCardTh: string;
  /** "ส่งให้เพื่อนที่ ..." share trigger line. */
  sendToFriendTh: string;
  /** Follows the Instagram template in docs/radar-guide/README.md. */
  captionIgTh: string;
  /** Follows the TikTok template. */
  captionTtTh: string;
  /** Every number or factual claim. */
  factRefs: { claim: string; source: string; url: string }[];
}

/** The scenes every story can use without a career; art in public/radar/stories/<scene>.webp. */
export const GENERIC_SCENES = ["bedroom-night", "classroom", "dinner-table", "school-gate", "phone-feed", "radar"] as const;
export type GenericScene = (typeof GENERIC_SCENES)[number];

export const STORY_WHO: readonly Who[] = ["student", "friend", "parent", "host", "text"];
export const STORY_MOODS: readonly Mood[] = ["idle", "talk", "wow", "serious", "wink"];
export const STORY_SERIES: readonly StoryScript["series"][] = ["lost", "round1", "career"];
