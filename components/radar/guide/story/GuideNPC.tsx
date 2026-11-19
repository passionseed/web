"use client";

/**
 * The host as a pixel NPC, P'Seed (GUIDE_HOST in lib/radar-guide/story.ts;
 * the name tag lives on the DialogueBox, so the sprite itself is decorative):
 * the PassionSeed flame with a mic.
 *
 * - Talking: the mouth flaps between the idle and talk frames and the body bobs.
 * - Quiet: HOST_IDLE_LOOP, the flame flickers and the eyes blink.
 * - "wow" holds the cheer frame and hops; "wink" holds the wink and leans.
 * - Reduced motion keeps it still on one frame.
 *
 * Every frame stays mounted so switching never flickers while an image loads.
 * If a webp fails to load, the same grid is drawn as inline SVG, so the NPC
 * never disappears.
 *
 * With `clock` (story reels, components/radar/reel/story) there are no timers:
 * the frame and every CSS animation are set from the clock, so a page seeked
 * to any moment draws the same picture.
 */
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import type { HostMood } from "@/lib/radar-guide/story";
import { PixelSprite } from "./PixelSprite";
import { HOST_GRID, HOST_GRIDS, HOST_PALETTE } from "./pixel-art";
import { HOST_FRAME_NAMES, HOST_IDLE_LOOP, hostFrame, hostHeldFrame, hostIdleFrameAt, hostSpriteSrc } from "./story-logic";
import "./story.css";

export interface GuideNPCProps {
  mood?: HostMood;
  talking?: boolean;
  reducedMotion?: boolean;
  /** Screen px per sprite cell (the grid is 32x32 cells): 2 or 3. */
  cell?: number;
  className?: string;
  /**
   * Drive the NPC from a clock instead of timers (filming): `ms` since it
   * appeared, `poseMs` since its current pose (talking, a held mood, or
   * quiet) began.
   */
  clock?: { ms: number; poseMs: number };
}

export const MOUTH_FLAP_MS = 140;

export function GuideNPC({ mood = "idle", talking = false, reducedMotion = false, cell = 2, className, clock }: GuideNPCProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [loopStep, setLoopStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const held = hostHeldFrame(mood);
  const flap = talking && !reducedMotion && !held;
  const idling = !talking && !reducedMotion && !held;
  const clocked = clock !== undefined;

  useEffect(() => {
    if (!flap || clocked) return;
    const id = window.setInterval(() => setMouthOpen((open) => !open), MOUTH_FLAP_MS);
    return () => {
      window.clearInterval(id);
      setMouthOpen(false);
    };
  }, [flap, clocked]);

  useEffect(() => {
    if (!idling || clocked) return;
    const id = window.setTimeout(
      () => setLoopStep((i) => (i + 1) % HOST_IDLE_LOOP.length),
      HOST_IDLE_LOOP[loopStep].ms
    );
    return () => window.clearTimeout(id);
  }, [idling, loopStep, clocked]);

  const open = clock ? Math.floor(clock.poseMs / MOUTH_FLAP_MS) % 2 === 1 : mouthOpen;
  const frame = idling ? (clock ? hostIdleFrameAt(clock.ms) : HOST_IDLE_LOOP[loopStep].frame) : hostFrame(mood, flap && open);
  const width = HOST_GRID.w * cell;
  const height = HOST_GRID.h * cell;

  return (
    <div
      className={`rgs-npc ${talking && !held ? "rgs-npc--talking" : ""} ${className ?? ""}`}
      style={{ width, height, ...(clock && talking && !held ? seeked([clock.poseMs]) : null) }}
      data-frame={frame}
      data-pose={held ?? (talking ? "talk" : "idle")}
      data-still={reducedMotion ? "true" : undefined}
      aria-hidden="true"
    >
      <div className="rgs-npc__body" style={clock ? seeked([held ? clock.poseMs : clock.ms, clock.ms]) : undefined}>
        {failed ? (
          <PixelSprite grid={HOST_GRIDS[frame]} palette={HOST_PALETTE} width={width} />
        ) : (
          HOST_FRAME_NAMES.map((f) => (
            <Image
              key={f}
              src={hostSpriteSrc(f)}
              alt=""
              width={width}
              height={height}
              unoptimized
              draggable={false}
              className="rgs-pixelated rgs-npc__frame"
              data-active={f === frame ? "true" : "false"}
              onError={() => setFailed(true)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Paused CSS animations shown `ms` in, one value per animation in the rule's
 * list (story.css: the entrance or the hop/lean first, the flame glow second).
 */
function seeked(ms: number[]): CSSProperties {
  return { animationPlayState: "paused", animationDelay: ms.map((m) => `${-Math.round(m)}ms`).join(", ") };
}
