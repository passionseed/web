"use client";

import type { ReactNode } from "react";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { Card, Highlighted } from "../parts";
import { ESTIMATE_LABEL_TH, type CompareSide, type RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

const ROWS: Array<{ label: string; value: (side: CompareSide) => ReactNode }> = [
  { label: "เงินเดือน", value: (s) => (s.money ? <Highlighted line={s.money} size={34} /> : "ยังไม่มีข้อมูล") },
  { label: `AI แทนได้ (${ESTIMATE_LABEL_TH})`, value: (s) => (s.aiScore === null ? "ยังไม่มีข้อมูล" : `${s.aiScore}/10`) },
  { label: "ลองได้เลย", value: (s) => s.firstStep ?? "ยังไม่มีข้อมูล" },
];

/** "เทียบ 2 อาชีพ": the same three rows for both careers, landing a row per beat. */
export function Compare({ scene, data, last }: SceneProps<NonNullable<RadarReelPayload["compare"]>>) {
  const sides = [data.left, data.right];
  return (
    <SceneFrame scene={scene} last={last}>
      <div className="reel-pop grid w-full grid-cols-2 gap-6" style={timing(at(scene, MARKS.compare.names))}>
        {sides.map((s) => (
          <p key={s.nameTh} className="text-center" style={{ fontFamily: KANIT, fontSize: 46, fontWeight: 700, color: DUSK.cream, margin: 0 }}>
            {s.nameTh}
          </p>
        ))}
      </div>
      {ROWS.map((row, i) => (
        <div key={row.label} className="reel-slam-last mt-8 w-full" style={timing(at(scene, MARKS.compare.firstRow + i * MARKS.compare.rowGap))}>
          <Card>
            <p style={{ margin: 0, fontFamily: KANIT, fontSize: 32, color: DUSK.orange }}>{row.label}</p>
            <div className="mt-3 grid grid-cols-2 gap-6">
              {sides.map((s) => (
                <div key={s.nameTh} style={{ fontFamily: KANIT, fontSize: 36, lineHeight: 1.3 }}>
                  {row.value(s)}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}
    </SceneFrame>
  );
}
