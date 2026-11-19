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
 */
import Image from "next/image";
import { useEffect, useState } from "react";
import type { HostMood } from "@/lib/radar-guide/story";
import { PixelSprite } from "./PixelSprite";
import { HOST_GRID, HOST_GRIDS, HOST_PALETTE } from "./pixel-art";
import { HOST_FRAME_NAMES, HOST_IDLE_LOOP, hostFrame, hostHeldFrame, hostSpriteSrc } from "./story-logic";
import "./story.css";

export interface GuideNPCProps {
  mood?: HostMood;
  talking?: boolean;
  reducedMotion?: boolean;
  /** Screen px per sprite cell (the grid is 32x32 cells): 2 or 3. */
  cell?: number;
  className?: string;
}

export const MOUTH_FLAP_MS = 140;

export function GuideNPC({ mood = "idle", talking = false, reducedMotion = false, cell = 2, className }: GuideNPCProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [loopStep, setLoopStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const held = hostHeldFrame(mood);
  const flap = talking && !reducedMotion && !held;
  const idling = !talking && !reducedMotion && !held;

  useEffect(() => {
    if (!flap) return;
    const id = window.setInterval(() => setMouthOpen((open) => !open), MOUTH_FLAP_MS);
    return () => {
      window.clearInterval(id);
      setMouthOpen(false);
    };
  }, [flap]);

  useEffect(() => {
    if (!idling) return;
    const id = window.setTimeout(
      () => setLoopStep((i) => (i + 1) % HOST_IDLE_LOOP.length),
      HOST_IDLE_LOOP[loopStep].ms
    );
    return () => window.clearTimeout(id);
  }, [idling, loopStep]);

  const frame = idling ? HOST_IDLE_LOOP[loopStep].frame : hostFrame(mood, flap && mouthOpen);
  const width = HOST_GRID.w * cell;
  const height = HOST_GRID.h * cell;

  return (
    <div
      className={`rgs-npc ${talking && !held ? "rgs-npc--talking" : ""} ${className ?? ""}`}
      style={{ width, height }}
      data-frame={frame}
      data-pose={held ?? (talking ? "talk" : "idle")}
      data-still={reducedMotion ? "true" : undefined}
      aria-hidden="true"
    >
      <div className="rgs-npc__body">
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
