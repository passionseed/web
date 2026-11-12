"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { Card, DotType, Highlighted, Strip } from "../parts";
import type { RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

/** The money lines as a ladder: each step lands on the beat, its number in lit windows. */
export function SalaryLadder({ scene, data, last }: SceneProps<NonNullable<RadarReelPayload["money"]>>) {
  return (
    <SceneFrame scene={scene} last={last}>
      <div className="reel-pop" style={timing(at(scene, MARKS.money.title))}>
        <Strip size={60}>{data.title}</Strip>
      </div>
      <div className="mt-10 flex w-full flex-col gap-8">
        {data.rows.map((row, i) => {
          const t = at(scene, MARKS.money.firstRow + i * MARKS.money.rowGap);
          return (
            <div key={i} className="reel-slam-last" style={{ marginLeft: i * 40, marginRight: (data.rows.length - 1 - i) * 40, ...timing(t) }}>
              <Card>
                {row.highlight && <DotType text={row.highlight} at={t + 0.1} cell={16} maxWidth={760} />}
                <p style={{ margin: row.highlight ? "16px 0 0" : 0, fontFamily: KANIT, color: DUSK.cream }}>
                  <Highlighted line={row} size={40} />
                </p>
              </Card>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
}
