import Image from "next/image";

import { islandStageSprite } from "@/lib/content/shift-island";

/**
 * The island's tree at one stage, as hard-edged pixels. Decoration only.
 * Same sprite as the home page's (components/home on the home branch); this
 * copy keeps the island invite free of the home page's theme and CSS.
 */
export function StageSprite({ stage, scale = 2, className = "" }: { stage: number; scale?: number; className?: string }) {
  return (
    <Image
      src={islandStageSprite(stage)}
      alt=""
      width={32 * scale}
      height={40 * scale}
      unoptimized
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
