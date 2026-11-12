"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { Card, Eyebrow } from "../parts";
import type { RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

/** ภาพในหัว, struck out, then ของจริง slammed in under it. */
export function FantasyReality({ scene, data, last }: SceneProps<NonNullable<RadarReelPayload["reality"]>>) {
  return (
    <SceneFrame scene={scene} last={last}>
      <div className="reel-rise w-full" style={timing(at(scene, MARKS.reality.fantasy))}>
        <Card style={{ opacity: 0.92 }}>
          <Eyebrow>ภาพในหัว</Eyebrow>
          <p className="reel-strike" style={{ fontFamily: KANIT, fontSize: 52, lineHeight: 1.3, margin: "12px 0 0", color: DUSK.cream, ...timing(at(scene, MARKS.reality.strike)) }}>
            {data.fantasy}
          </p>
        </Card>
      </div>
      <div className="reel-slam-last mt-12 w-full" style={timing(at(scene, MARKS.reality.reality))}>
        <Card>
          <Eyebrow>ของจริง</Eyebrow>
          <p style={{ fontFamily: KANIT, fontSize: 60, fontWeight: 600, lineHeight: 1.3, margin: "12px 0 0" }}>{data.reality}</p>
        </Card>
      </div>
    </SceneFrame>
  );
}
