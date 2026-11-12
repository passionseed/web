"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { DotType, Strip } from "../parts";
import type { RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

/** The hook: the question as a claim strip, then the one number that makes people stop. */
export function HookStat({ scene, data, last, nameTh }: SceneProps<RadarReelPayload["hook"]> & { nameTh: string }) {
  const value = data.stat?.highlight ?? null;
  const label = data.stat ? (value ? data.stat.text.replace(value, "").replace(/^[\s·:]+|[\s·:]+$/g, "") : data.stat.text) : null;
  return (
    <SceneFrame scene={scene} last={last}>
      <p className="reel-pop" style={{ fontFamily: KANIT, fontSize: 40, color: DUSK.cream, opacity: 0.9, margin: 0, ...timing(scene.start) }}>
        {nameTh}
      </p>
      <div className="reel-slam mt-6" style={timing(at(scene, MARKS.hook.line), last ? undefined : scene.end)}>
        <Strip size={76}>{data.line}</Strip>
      </div>
      {value && (
        <div className="mt-16 flex flex-col items-center">
          <DotType text={value} at={at(scene, MARKS.hook.stat)} cell={30} />
          {label && (
            <p className="reel-pop mt-8 text-center" style={{ fontFamily: KANIT, fontSize: 44, color: DUSK.cream, lineHeight: 1.3, ...timing(at(scene, MARKS.hook.label)) }}>
              {label}
            </p>
          )}
        </div>
      )}
    </SceneFrame>
  );
}
