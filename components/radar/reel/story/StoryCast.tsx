"use client";

/**
 * The characters on the story stage. Student, friend and mother are pixel
 * sprites (PixelSprite, crisp SVG; cast.ts CAST_LOOK): their mouths flap
 * while their line types, and everyone else breathes (a step up and down)
 * and blinks on their own beat, so the stage is never frozen, the hook
 * included. P'Seed is the guide's own GuideNPC on a clock (its moods,
 * flicker, blink and mouth set from the frame number), kept mounted for the
 * whole reel so its frames stay loaded, and moved to its spot; it drops in
 * with a sparkle on its first line in a scene. All from the frame number.
 */
import type { CSSProperties } from "react";

import { GuideNPC } from "@/components/radar/guide/story/GuideNPC";
import { MOUTH_FLAP_MS } from "@/components/radar/guide/story/GuideNPC";
import { PixelSprite } from "@/components/radar/guide/story/PixelSprite";
import { STORY_PALETTE } from "@/components/radar/guide/story/pixel-art";
import type { HostMood } from "@/lib/radar-guide/story";
import { FRAME_MS } from "@/lib/radar-stories/timing";

import { CAST_LOOK, spriteSize, STAGE_FLOOR } from "./cast";
import { STORY_REEL_TIMING, type CastWho } from "./storyTimeline";

/** Not speaking: a touch darker, so the eye finds the speaker. */
const LISTENER_FILTER = "brightness(0.78) saturate(0.9)";
/** P'Seed listening: barely dimmed, or the yellow flame turns olive. */
export const HOST_LISTENER_FILTER = "brightness(0.95)";

/** Each character breathes and blinks on its own beat (frames). */
const IDLE_PHASE: Readonly<Record<CastWho, number>> = { student: 0, friend: 7, parent: 15, host: 0 };
const BREATH_FRAMES = 14;
const BLINK_EVERY = 78;
const BLINK_AT = 10;
const BLINK_FRAMES = 4;

/** Idle breathing: up one step (2px) every other BREATH_FRAMES. */
export function idleBob(f: number, who: CastWho): number {
  return Math.floor((f + IDLE_PHASE[who]) / BREATH_FRAMES) % 2 === 1 ? -2 : 0;
}

/** Eyes shut for BLINK_FRAMES every BLINK_EVERY frames (the first blink within the hook). */
export function blinking(f: number, who: CastWho): boolean {
  const k = (((f - BLINK_AT - IDLE_PHASE[who]) % BLINK_EVERY) + BLINK_EVERY) % BLINK_EVERY;
  return k < BLINK_FRAMES;
}

export interface CastPlacement {
  who: CastWho;
  /** Centre x on the frame. */
  x: number;
  enterF: number;
}

/** Whether a speaker's mouth is open at frame `f` (flaps every MOUTH_FLAP_MS while talking). */
export function mouthOpen(f: number, startF: number, talkF: number): boolean {
  if (f < startF || f >= startF + talkF) return false;
  return Math.floor(((f - startF) * FRAME_MS) / MOUTH_FLAP_MS) % 2 === 1;
}

/** Entrance: drops from 24px above in whole steps over the first frames. */
function entranceOffset(f: number, enterF: number): number {
  const k = f - enterF;
  if (k >= STORY_REEL_TIMING.enterFrames || k < 0) return 0;
  return -Math.round(((STORY_REEL_TIMING.enterFrames - k) / STORY_REEL_TIMING.enterFrames) * 6) * 4;
}

function Sparkle({ x, top, f, enterF }: { x: number; top: number; f: number; enterF: number }) {
  const k = f - enterF;
  if (k < 0 || k >= STORY_REEL_TIMING.enterFrames + 4) return null;
  const spread = 10 + k * 6;
  const dots = [
    [-1, -0.2],
    [1, -0.1],
    [-0.7, 0.6],
    [0.8, 0.5],
    [0, -0.8],
  ];
  return (
    <>
      {dots.map(([dx, dy], i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: Math.round(x + dx * spread * 2) - 4,
            top: Math.round(top + 60 + dy * spread * 2) - 4,
            width: 8,
            height: 8,
            backgroundColor: i % 2 ? STORY_PALETTE.litGold : STORY_PALETTE.cream,
            opacity: k > STORY_REEL_TIMING.enterFrames ? 0.5 : 1,
          }}
        />
      ))}
    </>
  );
}

export function AvatarActor({
  who,
  x,
  frame,
  enterF,
  speaking,
  talking,
}: {
  who: Exclude<CastWho, "host">;
  x: number;
  frame: number;
  enterF: number;
  speaking: boolean;
  talking: boolean;
}) {
  const look = CAST_LOOK[who];
  const frames = look.frames!;
  const { w, h } = spriteSize(who);
  // A talking speaker bobs 2px every 240ms (the guide's rgs-bob); everyone else breathes.
  const bob = talking ? (Math.floor((frame * FRAME_MS) / 240) % 2 === 1 ? -2 : 0) : idleBob(frame, who);
  const grid = talking ? frames.talk : blinking(frame, who) ? frames.blink : frames.idle;
  const style: CSSProperties = {
    left: Math.round(x - w / 2),
    top: STAGE_FLOOR - h + entranceOffset(frame, enterF) + bob,
    filter: speaking ? undefined : LISTENER_FILTER,
  };
  return (
    <div className="absolute" style={style} data-who={who} data-speaking={speaking ? "true" : "false"}>
      <PixelSprite grid={grid} palette={look.palette!} width={w} />
    </div>
  );
}

/** P'Seed, mounted once. `visible` false keeps it loaded but off stage. */
export function HostActor({
  x,
  floor = STAGE_FLOOR,
  cell = CAST_LOOK.host.cell,
  frame,
  enterF,
  visible,
  speaking,
  talking,
  mood,
  clock,
}: {
  x: number;
  floor?: number;
  cell?: number;
  frame: number;
  enterF: number;
  visible: boolean;
  speaking: boolean;
  talking: boolean;
  mood: HostMood;
  /** GuideNPC's clock: ms on screen and ms in the current pose. */
  clock: { ms: number; poseMs: number };
}) {
  const size = 32 * cell;
  const top = floor - size + (visible ? entranceOffset(frame, enterF) : 0);
  return (
    <>
      <div
        className="absolute"
        style={{
          left: Math.round(x - size / 2),
          top,
          opacity: visible ? 1 : 0,
          filter: visible && !speaking ? HOST_LISTENER_FILTER : undefined,
        }}
        data-who="host"
        data-speaking={speaking ? "true" : "false"}
      >
        <GuideNPC mood={mood} talking={talking} cell={cell} clock={clock} />
      </div>
      {visible ? <Sparkle x={x} top={top} f={frame} enterF={enterF} /> : null}
    </>
  );
}
