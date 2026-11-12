"use client";

import type { ReactNode } from "react";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { CONTENT_TOP, SIDE } from "../parts";
import type { RadarReelScene } from "../radarReel";

export interface SceneProps<T> {
  scene: RadarReelScene;
  data: T;
  /** The last scene keeps its content on screen to the final frame. */
  last: boolean;
}

/** The scene's layer: fades in on its cut, out on the next one. */
export function SceneFrame({ scene, last, children, top = CONTENT_TOP }: { scene: RadarReelScene; last: boolean; children: ReactNode; top?: number }) {
  return (
    <div
      className={`${last ? "rr-fade-last" : "rr-fade"} absolute flex flex-col items-center`}
      style={{ left: SIDE, right: SIDE, top, ...timing(scene.start, last ? undefined : scene.end) }}
    >
      {children}
    </div>
  );
}
