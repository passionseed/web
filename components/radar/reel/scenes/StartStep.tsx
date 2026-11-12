"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { Card, Eyebrow, Strip } from "../parts";
import type { RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

function Chip({ children, at: t }: { children: string; at: number }) {
  return (
    <span className="reel-pop" style={{ fontFamily: KANIT, fontSize: 40, fontWeight: 600, color: DUSK.plum, backgroundColor: DUSK.orange, padding: "6px 24px", ...timing(t) }}>
      {children}
    </span>
  );
}

/** The free first step tonight, and what the student has made at the end of it. */
export function StartStep({ scene, data, last }: SceneProps<NonNullable<RadarReelPayload["start"]>>) {
  const chips = [data.free ? "ฟรี" : null, data.minutes ? `ไม่เกิน ${data.minutes} นาที` : null].filter((c): c is string => Boolean(c));
  return (
    <SceneFrame scene={scene} last={last}>
      <div className="reel-pop" style={timing(at(scene, MARKS.start.title))}>
        <Strip size={64}>ลองคืนนี้เลย</Strip>
      </div>
      <div className="reel-slam-last mt-10 w-full" style={timing(at(scene, MARKS.start.step))}>
        <Card>
          <p style={{ margin: 0, fontFamily: KANIT, fontSize: 56, fontWeight: 600, lineHeight: 1.25 }}>{data.title}</p>
          {chips.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4">
              {chips.map((chip) => (
                <Chip key={chip} at={at(scene, MARKS.start.chips)}>{chip}</Chip>
              ))}
            </div>
          )}
          {data.makes && (
            <div className="reel-pop mt-8" style={timing(at(scene, MARKS.start.makes))}>
              <Eyebrow>จบแล้วได้</Eyebrow>
              <p style={{ margin: "8px 0 0", fontFamily: KANIT, fontSize: 42, lineHeight: 1.3 }}>{data.makes}</p>
            </div>
          )}
        </Card>
      </div>
    </SceneFrame>
  );
}
