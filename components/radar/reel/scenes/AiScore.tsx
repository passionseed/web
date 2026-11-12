"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { Card, DotType, Strip } from "../parts";
import type { RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

/** AI: our estimate out of 10, always labelled as ours, then what AI does and does not take. */
export function AiScore({ scene, data, last }: SceneProps<NonNullable<RadarReelPayload["ai"]>>) {
  return (
    <SceneFrame scene={scene} last={last}>
      <div className="reel-pop" style={timing(at(scene, MARKS.ai.label))}>
        <Strip size={64}>AI จะมาแทนไหม</Strip>
      </div>
      {data.score !== null && (
        <div className="mt-12 flex flex-col items-center">
          <DotType text={`${data.score}/10`} at={at(scene, MARKS.ai.score)} cell={30} />
          <p
            className="reel-pop mt-6"
            style={{ fontFamily: KANIT, fontSize: 38, color: DUSK.plum, backgroundColor: DUSK.windows[2], padding: "6px 22px", ...timing(at(scene, MARKS.ai.estimate)) }}
          >
            {data.label} · โอกาสโดนแทน
          </p>
        </div>
      )}
      <div className="mt-10 flex w-full flex-col gap-6">
        {data.points.map((point, i) => (
          <div key={i} className="reel-rise-last" style={timing(at(scene, MARKS.ai.firstPoint + i * MARKS.ai.pointGap))}>
            <Card>
              <p style={{ margin: 0, fontFamily: KANIT, fontSize: 44, lineHeight: 1.3 }}>{point}</p>
            </Card>
          </div>
        ))}
      </div>
    </SceneFrame>
  );
}
