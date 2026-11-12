"use client";

/**
 * The cover's game parts (the server cover renders these):
 * - CoverHost: the host NPC saying the hook in a dialogue box.
 * - CoverLevelMap: the run as a level map, cleared levels starred and the host
 *   on the current one, read from this device's progress (empty on the server
 *   and first render, so nothing mismatches). Every level is a link.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { useGuideState } from "@/lib/radar-guide/guide-state";
import { DialogueBox, LevelMap, guideArtSrc } from "@/components/radar/guide/story";
import { levelHref } from "./guide-routes";
import { useReducedMotion } from "./use-reduced-motion";

export function CoverHost({ lineTh }: { lineTh: string }) {
  const reducedMotion = useReducedMotion();
  if (!lineTh) return null;
  return (
    <div className="rg-cover__host">
      <DialogueBox speaker="host" mood="wink" lines={[lineTh]} reducedMotion={reducedMotion} />
    </div>
  );
}

export function CoverLevelMap({ index }: { index: Pick<GuideIndexEntry, "slug" | "pages" | "story"> }) {
  const reducedMotion = useReducedMotion();
  const { state } = useGuideState(index);
  return (
    <LevelMap
      pages={index.pages}
      progress={state}
      currentKey={state.last ?? null}
      hrefFor={(key) => levelHref(index.slug, key)}
      backgroundSrc={guideArtSrc(index.slug, "map")}
      reducedMotion={reducedMotion}
      className="rg-cover__map"
    />
  );
}
