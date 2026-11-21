"use client";

/**
 * "This career is a broad name", as a job-select screen: a grid of pixel
 * tiles, one per kind of job. Tap a tile and the host says one line about
 * it. No wall of text: the student reads only the kinds they tap.
 *
 * "ต่อ" steps aside until the first tap (the shell's `gameWaiting`). The last
 * tile tapped is saved as the choice `<pageKey>:<id>`, so a revisit opens on
 * it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { CareerKindTile } from "@/lib/radar-guide/guide-types";
import { DialogueBox } from "@/components/radar/guide/story";
import { KIND_GLYPHS } from "@/components/radar/guide/story/kind-glyphs";
import { PixelSprite } from "@/components/radar/guide/story/PixelSprite";
import { scrollToMiddle } from "./follow-scroll";
import { useGuideShell } from "./shell-context";

const CREAM = "#fff1e6";
const SUNSET = "#ff8a4c";

export interface KindsStepProps {
  pageKey: string;
  stepId: string;
  headTh: string;
  tiles: readonly CareerKindTile[];
}

export function KindsStep({ pageKey, stepId, headTh, tiles }: KindsStepProps) {
  const { progress, dispatch, tracker, demo, reducedMotion, markStepDone } = useGuideShell();
  const key = `${pageKey}:${stepId}`;
  const saved = progress.choices[key];
  const [open, setOpen] = useState<string | null>(null);
  const [seen, setSeen] = useState<readonly string[]>([]);
  // Demo (filming) opens on the played tile; a revisit on the last one tapped.
  const current = open ?? saved ?? (demo ? (tiles.find((t) => t.played) ?? tiles[0])?.id : null) ?? null;
  const tile = tiles.find((t) => t.id === current) ?? null;
  const seenCount = new Set([...seen, ...(saved ? [saved] : [])]).size;

  useEffect(() => {
    if (saved !== undefined || demo) markStepDone(pageKey, stepId);
  }, [saved, demo, markStepDone, pageKey, stepId]);

  const tap = useCallback(
    (t: CareerKindTile) => {
      setOpen(t.id);
      setSeen((s) => (s.includes(t.id) ? s : [...s, t.id]));
      dispatch({ type: "choice", key, value: t.id });
      tracker.track({ type: "interactive_tap", pageKey, target: `${key}:${t.id}` });
    },
    [dispatch, tracker, key, pageKey]
  );

  // The host's line opens under the grid: keep it in view.
  const lineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || demo || !lineRef.current) return;
    scrollToMiddle(lineRef.current, reducedMotion);
  }, [open, demo, reducedMotion]);

  return (
    <div className="rg-kinds" data-testid={`kinds-${stepId}`}>
      <div className="rg-kinds__head">
        <p className="rg-kinds__title">{headTh}</p>
        <p className="rg-kinds__count" aria-live="polite">
          {seenCount ? `ดูแล้ว ${seenCount}/${tiles.length}` : "แตะดูทีละสาย"}
        </p>
      </div>
      <div className="rg-kinds__grid" data-count={tiles.length} role="group" aria-label={headTh}>
        {tiles.map((t) => {
          const isOpen = t.id === current;
          const wasSeen = seen.includes(t.id) || t.id === saved;
          return (
            <button
              key={t.id}
              type="button"
              className="rg-kinds__tile"
              data-open={isOpen ? "true" : undefined}
              data-seen={wasSeen && !isOpen ? "true" : undefined}
              data-demo={`${stepId}.tile-${t.id}`}
              data-testid={`kinds-tile-${t.id}`}
              aria-pressed={isOpen}
              onClick={() => tap(t)}
            >
              {t.played ? <span className="rg-kinds__tag">เพิ่งลอง</span> : null}
              <PixelSprite
                grid={KIND_GLYPHS[t.icon]}
                palette={{ "#": CREAM, o: "currentColor", w: SUNSET }}
                width={40}
                className="rg-kinds__icon"
              />
              <span className="rg-kinds__name">{t.titleTh}</span>
            </button>
          );
        })}
      </div>
      {tile ? (
        <div ref={lineRef} className="rg-dialogue__row" data-speaker="host">
          <DialogueBox
            key={tile.id}
            speaker="host"
            mood={tile.played ? "wink" : "wow"}
            lines={[tile.lineTh]}
            reducedMotion={reducedMotion || demo}
          />
        </div>
      ) : null}
      <noscript>
        <ul className="rg-dialogue__static">
          {tiles.map((t) => (
            <li key={t.id}>
              {t.titleTh}: {t.lineTh}
            </li>
          ))}
        </ul>
      </noscript>
    </div>
  );
}
