import {
  BEAT,
  CAMERA,
  CTA_BEATS,
  REEL_SECONDS,
  type ReelScene,
  type SceneId,
  type TestimonialReel,
} from "./testimonialReel";
import type { CameraShot, ReelCues } from "./reelEngine";

export type { ReelCues } from "./reelEngine";

/**
 * When things happen inside a Reel. The component animates from these times
 * and the soundtrack (scripts/shift-reel-audio.py) is scored from the same
 * cue sheet, so picture and sound cannot drift apart.
 */

export const HOOK_BEATS = { headline: 1, title: 2, swap: 4 } as const;
/** Quote scenes: headline on the cut, card one beat later, words after. */
export const QUOTE_BEATS = { card: 1, words: 2 } as const;
const COUNT_SECONDS = 1;

export const at = (scene: ReelScene, beats: number) => scene.start + beats * BEAT;

export function scene(reel: TestimonialReel, id: SceneId): ReelScene {
  return reel.scenes.find((s) => s.id === id)!;
}

export function chunks(s: ReelScene): string[] {
  return s.caption ? s.caption.split("|") : [];
}

export function chunkTime(s: ReelScene, i: number): number {
  return at(s, QUOTE_BEATS.words + i);
}

export function reelCues(reel: TestimonialReel): ReelCues {
  const hook = scene(reel, "hook");
  const proof = scene(reel, "proof");
  const cta = scene(reel, "cta");
  const quotes = reel.scenes.filter((s) => s.caption);
  return {
    seconds: REEL_SECONDS,
    beat: BEAT,
    cuts: reel.scenes.map((s) => s.start),
    slams: [hook.start, at(hook, HOOK_BEATS.headline), proof.start, cta.start, at(cta, CTA_BEATS.price)],
    pops: [
      at(hook, HOOK_BEATS.title),
      at(hook, HOOK_BEATS.swap),
      at(proof, 1),
      ...quotes.flatMap((s) => chunks(s).map((_, i) => chunkTime(s, i))),
      ...[CTA_BEATS.line, CTA_BEATS.marker, CTA_BEATS.seats, CTA_BEATS.deadline, CTA_BEATS.url].map((b) => at(cta, b)),
    ].sort((a, b) => a - b),
    count: reel.proof.count ? [proof.start, proof.start + COUNT_SECONDS] : null,
    coin: at(cta, CTA_BEATS.price),
  };
}

export const COUNT_DURATION = COUNT_SECONDS;

/** Testimonial camera: each scene's pan from CAMERA. */
export function testimonialShots(reel: TestimonialReel): CameraShot[] {
  return reel.scenes.map((s) => ({ start: s.start, end: s.end, pan: CAMERA[s.id] }));
}
