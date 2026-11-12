"use client";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK, KANIT } from "../duskCity";
import { Card, Strip } from "../parts";
import { at, MARKS } from "../radarReel";
import { SceneFrame, type SceneProps } from "./SceneFrame";

/** Steps card: each step lights up as it is said (also used for "เข้าคณะไหน"). */
export function DayInLife({ scene, data, last }: SceneProps<{ title: string; items: string[] }>) {
  return (
    <SceneFrame scene={scene} last={last}>
      <div className="reel-pop" style={timing(at(scene, MARKS.list.title))}>
        <Strip size={64}>{data.title}</Strip>
      </div>
      <div className="mt-10 w-full">
        <Card>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {data.items.map((item, i) => {
              const t = at(scene, MARKS.list.firstItem + i * MARKS.list.itemGap);
              return (
                <li key={i} className="rr-step flex items-center gap-6" style={{ padding: "18px 0", ...timing(t) }}>
                  <span className="rr-lit" style={{ width: 26, height: 32, flex: "none", backgroundColor: DUSK.windows[i % DUSK.windows.length], display: "block", ...timing(t) }} />
                  <span style={{ fontFamily: KANIT, fontSize: 46, lineHeight: 1.3 }}>{item}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </SceneFrame>
  );
}
