"use client";

/**
 * The host as a pixel NPC (GUIDE_HOST in lib/radar-guide/story.ts; the name
 * tag lives on the DialogueBox, so the sprite itself is decorative): the
 * PassionSeed flame with a mic. While `talking`, the mouth flaps between the
 * idle and talk frames; "wow" and "wink" hold their own frame; reduced motion
 * keeps it still. If the webp fails
 * to load, the same grid is drawn as inline SVG, so the NPC never disappears.
 */
import Image from "next/image";
import { useEffect, useState } from "react";
import type { HostMood } from "@/lib/radar-guide/story";
import { PixelSprite } from "./PixelSprite";
import { HOST_GRID, HOST_GRIDS, HOST_PALETTE } from "./pixel-art";
import { hostFrame, hostHeldFrame, hostSpriteSrc } from "./story-logic";
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
  const [failed, setFailed] = useState(false);
  const held = hostHeldFrame(mood);
  const animate = talking && !reducedMotion && !held;

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => setMouthOpen((open) => !open), MOUTH_FLAP_MS);
    return () => {
      window.clearInterval(id);
      setMouthOpen(false);
    };
  }, [animate]);

  const frame = hostFrame(mood, animate && mouthOpen);
  const width = HOST_GRID.w * cell;
  const height = HOST_GRID.h * cell;

  return (
    <div
      className={`rgs-npc ${talking ? "rgs-npc--talking" : ""} ${className ?? ""}`}
      style={{ width, height }}
      data-frame={frame}
      aria-hidden="true"
    >
      {failed ? (
        <PixelSprite grid={HOST_GRIDS[frame]} palette={HOST_PALETTE} width={width} />
      ) : (
        <>
          {/* Both mouth frames stay mounted so flapping never flickers while an image loads. */}
          {(held ? (["idle", "talk", held] as const) : (["idle", "talk"] as const)).map((f) => (
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
          ))}
        </>
      )}
    </div>
  );
}
