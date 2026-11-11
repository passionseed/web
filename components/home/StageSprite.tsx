import Image from "next/image";

import { islandStageSprite } from "@/lib/content/shift-island";

/** The island's tree at one stage, as hard-edged pixels. Decoration only. */
export function StageSprite({ stage, scale = 2, className = "" }: { stage: number; scale?: number; className?: string }) {
  return (
    <Image
      src={islandStageSprite(stage)}
      alt=""
      width={32 * scale}
      height={40 * scale}
      unoptimized
      className={`home-pixel ${className}`}
    />
  );
}
