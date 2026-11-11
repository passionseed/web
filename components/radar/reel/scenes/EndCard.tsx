"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { canDotType, DUSK, KANIT } from "../duskCity";
import { DotType, Strip } from "../parts";
import type { RadarReelPayload } from "../payload";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

/** The call to action: the comment keyword standing in the city as lit windows (IG), or the typeable link (TikTok). */
export function EndCard({ scene, data, last }: SceneProps<RadarReelPayload["end"]>) {
  return (
    <SceneFrame scene={scene} last={last} top={340}>
      <div className="reel-pop" style={timing(at(scene, MARKS.end.headline))}>
        <Strip size={64}>{data.headline}</Strip>
      </div>
      <div className="mt-14">
        {canDotType(data.keyword) ? (
          <DotType text={data.keyword} at={at(scene, MARKS.end.keyword)} cell={34} />
        ) : (
          <p className="reel-slam-last text-center" style={{ fontFamily: KANIT, fontSize: 64, fontWeight: 700, color: DUSK.orange, margin: 0, ...timing(at(scene, MARKS.end.keyword)) }}>
            {data.keyword}
          </p>
        )}
      </div>
      {data.kind === "comment_radar" && (
        <p className="reel-pop mt-12 text-center" style={{ fontFamily: KANIT, fontSize: 48, color: DUSK.cream, margin: 0, ...timing(at(scene, MARKS.end.sub)) }}>
          {data.sub}
        </p>
      )}
      {data.sendToFriend && (
        <p className="reel-pop mt-10 text-center" style={{ fontFamily: KANIT, fontSize: 40, color: DUSK.cream, opacity: 0.92, margin: 0, ...timing(at(scene, MARKS.end.friend)) }}>
          {data.sendToFriend}
        </p>
      )}
    </SceneFrame>
  );
}
