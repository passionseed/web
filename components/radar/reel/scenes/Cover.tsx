"use client";

import { DUSK, KANIT } from "../duskCity";
import { DotType, Strip } from "../parts";
import type { RadarReelPayload } from "../payload";

/** The reel's cover frame: still, readable in the grid crop (the middle 1080x1350). */
export function Cover({ payload }: { payload: RadarReelPayload }) {
  const value = payload.hook.stat?.highlight ?? null;
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 84, right: 84, top: 420 }}>
      <Strip size={56}>อาชีพนี้ใน 30 วินาที</Strip>
      <h1 className="mt-12 text-center" style={{ fontFamily: KANIT, fontSize: 104, fontWeight: 700, lineHeight: 1.15, color: DUSK.cream, margin: "48px 0 0" }}>
        {payload.nameTh}
      </h1>
      {value && (
        <div className="mt-14">
          <DotType text={value} at={0} cell={30} />
        </div>
      )}
    </div>
  );
}
