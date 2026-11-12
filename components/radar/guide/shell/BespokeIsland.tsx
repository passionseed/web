"use client";

/**
 * A career's own interactive piece (U3, components/radar/guides/<slug>),
 * loaded like an engine. The block's `fallbackTh` lines are the no-JS view,
 * the view when the component is missing or fails, and, for tracked pieces,
 * what "ข้ามไปดูคำตอบ" reveals.
 */
import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType, type LazyExoticComponent } from "react";
import { loadBespoke } from "@/components/radar/guides/registry";
import type { BespokeProps, GameResult, GameTrack, JsonObject } from "@/lib/radar-guide/guide-types";
import { AnswerList, IslandBoundary, IslandLoading, useLoadWhenNear } from "./island-utils";
import { useGuideShell } from "./shell-context";

const PIECES = new Map<string, LazyExoticComponent<ComponentType<BespokeProps>>>();

function pieceFor(slug: string, component: string): LazyExoticComponent<ComponentType<BespokeProps>> {
  const key = `${slug}/${component}`;
  let piece = PIECES.get(key);
  if (!piece) {
    piece = lazy(async () => {
      const registry = await loadBespoke(slug);
      const found = Object.prototype.hasOwnProperty.call(registry, component) ? registry[component] : null;
      if (!found) throw new Error(`bespoke component "${component}" is not registered for ${slug}`);
      return { default: found };
    });
    PIECES.set(key, piece);
  }
  return piece;
}

export interface BespokeIslandProps {
  pageKey: string;
  blockId: string;
  component: string;
  props?: JsonObject;
  fallbackTh: readonly string[];
  track?: GameTrack;
}

export function BespokeIsland({ pageKey, blockId, component, props, fallbackTh, track }: BespokeIslandProps) {
  const { slug, tracker, demo, reducedMotion, progress, dispatch, markStepDone } = useGuideShell();
  const [ref, load] = useLoadWhenNear<HTMLDivElement>();
  const [skipped, setSkipped] = useState(false);
  const finished = Boolean(progress.games[`${pageKey}:${blockId}`]?.done);

  const onResult = useCallback(
    (result: GameResult) => {
      dispatch({ type: "game", pageKey, blockId, result });
      if (result.done) markStepDone(pageKey, blockId);
    },
    [dispatch, markStepDone, pageKey, blockId]
  );

  const skip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    tracker.track({ type: "interactive_tap", pageKey, target: `${pageKey}:skip` });
    dispatch({ type: "game", pageKey, blockId, result: { done: true, skipped: true } });
    markStepDone(pageKey, blockId);
  }, [skipped, tracker, dispatch, markStepDone, pageKey, blockId]);

  // Untracked pieces are something to look at, not a task: "ต่อ" is ready at once.
  useEffect(() => {
    if (!track) markStepDone(pageKey, blockId);
  }, [track, markStepDone, pageKey, blockId]);

  const Piece = pieceFor(slug, component);
  const fallback = <AnswerList lines={fallbackTh} title="สรุป" />;

  return (
    <div ref={ref} className="rg-bespoke rg-island" data-component={component} data-block={blockId}>
      <noscript>{fallback}</noscript>
      {load ? (
        <IslandBoundary fallback={fallback}>
          <Suspense fallback={<IslandLoading />}>
            <Piece
              slug={slug}
              pageKey={pageKey}
              blockId={blockId}
              props={props ?? {}}
              tracker={tracker}
              demo={demo}
              reducedMotion={reducedMotion}
              onResult={track ? onResult : undefined}
            />
          </Suspense>
        </IslandBoundary>
      ) : (
        <IslandLoading />
      )}
      {skipped ? fallback : null}
      {track && !skipped && !finished ? (
        <button type="button" className="rg-skip" data-demo={`${blockId}.skip`} onClick={skip}>
          ข้ามไปดูคำตอบ
        </button>
      ) : null}
    </div>
  );
}
