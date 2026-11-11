"use client";

/**
 * One game on a level. The engine (U2, ENGINE_LOADERS) loads in its own chunk
 * once the block is near the viewport or the browser is idle. The shell owns:
 * - "ข้ามเกม ดูเฉลย" (fires `<pageKey>:skip`, records a skipped result, shows the answers)
 * - the static answers for no-JS readers and when the engine chunk fails
 * - recording the result in progress (XP, badges) and marking the step done
 * Engines fire their own milestone events through `tracker`.
 */
import { lazy, Suspense, useCallback, useRef, useState, type ComponentType, type LazyExoticComponent } from "react";
import { ENGINE_LOADERS } from "@/components/radar/guide/games";
import type { EngineId, EngineProps, GameResult, GameSpec, GameTrack } from "@/lib/radar-guide/guide-types";
import { AnswerList, IslandBoundary, IslandLoading, useLoadWhenNear } from "./island-utils";
import { useGuideShell } from "./shell-context";

type AnyEngine = ComponentType<EngineProps<EngineId>>;
const ENGINES = new Map<EngineId, LazyExoticComponent<AnyEngine>>();

function engineFor(id: EngineId): LazyExoticComponent<AnyEngine> {
  let engine = ENGINES.get(id);
  if (!engine) {
    const loader = ENGINE_LOADERS[id] as unknown as () => Promise<{ default: AnyEngine }>;
    engine = lazy(loader);
    ENGINES.set(id, engine);
  }
  return engine;
}

export interface GameIslandProps {
  pageKey: string;
  blockId: string;
  game: GameSpec;
  track: GameTrack;
  answersTh: readonly string[];
}

export function GameIsland({ pageKey, blockId, game, track, answersTh }: GameIslandProps) {
  const { slug, tracker, demo, reducedMotion, progress, dispatch, markStepDone } = useGuideShell();
  const [ref, load] = useLoadWhenNear<HTMLDivElement>();
  const [skipped, setSkipped] = useState(false);
  // The island records a skip itself (so it counts even when the engine chunk
  // fails); the engine's own skipped report is then a duplicate and dropped.
  const skipRecorded = useRef(false);
  const saved = progress.games[`${pageKey}:${blockId}`];
  const finished = Boolean(saved?.done);

  const onResult = useCallback(
    (result: GameResult) => {
      if (result.skipped && skipRecorded.current) return;
      dispatch({ type: "game", pageKey, blockId, result });
      if (result.done) markStepDone(pageKey, blockId);
    },
    [dispatch, markStepDone, pageKey, blockId]
  );

  const skip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    skipRecorded.current = true;
    tracker.track({ type: "interactive_tap", pageKey, target: `${pageKey}:skip` });
    dispatch({ type: "game", pageKey, blockId, result: { done: true, skipped: true } });
    markStepDone(pageKey, blockId);
  }, [skipped, tracker, dispatch, markStepDone, pageKey, blockId]);

  const Engine = engineFor(game.engine);
  const answers = <AnswerList lines={answersTh} />;

  return (
    <div ref={ref} className="rg-island" data-engine={game.engine} data-block={blockId}>
      <noscript>{answers}</noscript>
      {load ? (
        <IslandBoundary fallback={answers}>
          <Suspense fallback={<IslandLoading />}>
            <Engine
              slug={slug}
              pageKey={pageKey}
              blockId={blockId}
              data={game.data}
              track={track}
              tracker={tracker}
              demo={demo}
              reducedMotion={reducedMotion}
              skipped={skipped}
              onResult={onResult}
            />
          </Suspense>
        </IslandBoundary>
      ) : (
        <IslandLoading />
      )}
      {skipped ? answers : null}
      {!skipped && !finished ? (
        <button
          type="button"
          className="rg-skip"
          data-demo={`${blockId}.skip`}
          data-testid="game-skip"
          onClick={skip}
        >
          ข้ามเกม ดูเฉลย
        </button>
      ) : null}
    </div>
  );
}
