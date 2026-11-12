"use client";

/**
 * FindLine (mythos): tap the line that lets data overflow.
 * demo parts: `line-<n>` (each code row), `frame`.
 * Milestones: none. Done value: attempts.
 */
import { useMemo, useReducer } from "react";
import type { EngineProps, FindLineData } from "@/lib/radar-guide/guide-types";
import {
  findLineResult,
  initFindLine,
  solvedFindLine,
  tapFindLine,
  type FindLineState,
} from "@/lib/radar-guide/games/find-line";
import { formatNumber } from "@/lib/radar-guide/games/text";
import { EngineFrame, Feedback, ScoreHud, demoId, useCountUp, useGameOutcome } from "./engine-shell";

type Action = { type: "tap"; line: number };

function makeReducer(data: FindLineData) {
  return (state: FindLineState, action: Action) => tapFindLine(state, data, action.line);
}

export default function FindLine(props: EngineProps<"FindLine">) {
  const { data, blockId, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const reducer = useMemo(() => makeReducer(data), [data]);
  const [played, dispatch] = useReducer(reducer, undefined, initFindLine);
  const solvedView = skipped && played.phase !== "found";
  const state = solvedView ? solvedFindLine(data) : played;
  const found = state.phase === "found";
  const counterTo = data.onFound.counter?.to ?? 0;
  const counter = useCountUp(counterTo, found && Boolean(data.onFound.counter), reducedMotion, 1600);

  const onTap = (line: number) => {
    if (found || skipped) return;
    const next = tapFindLine(played, data, line);
    dispatch({ type: "tap", line });
    if (next.phase === "found") {
      const ms = outcome.elapsed();
      outcome.finish(findLineResult(next, ms), next.attempts);
    }
  };

  return (
    <EngineFrame
      engine="FindLine"
      blockId={blockId}
      tagTh="หาบรรทัดอันตราย"
      status={found ? (solvedView ? "solved" : "clear") : "play"}
      reducedMotion={reducedMotion}
      simulated
      hud={<ScoreHud label="TRY" value={state.attempts} />}
    >
      <p className="rg-game__caption">{data.captionTh}</p>
      <ol className="rg-code" aria-label="โค้ด แตะบรรทัดที่คิดว่าอันตราย">
        {data.lines.map((l) => {
          const isAnswer = found && l.n === data.answer;
          const wrong = !found && state.lastTap === l.n && state.phase === "wrong";
          const outlined = state.outlined.includes(l.n);
          return (
            <li key={l.n}>
              <button
                type="button"
                className="rg-code__line"
                data-state={isAnswer ? "found" : wrong ? "wrong" : outlined ? "outlined" : undefined}
                aria-pressed={isAnswer || undefined}
                onClick={() => onTap(l.n)}
                disabled={found}
                data-demo={demoId(blockId, `line-${l.n}`)}
              >
                <span className="rg-code__n" aria-hidden>
                  {l.n}
                </span>
                <code className="rg-code__text">{l.code}</code>
              </button>
            </li>
          );
        })}
      </ol>
      {!found && state.feedback ? (
        <Feedback tone="bad" shakeKey={state.attempts} reducedMotion={reducedMotion}>
          {state.feedback}
        </Feedback>
      ) : null}
      {!found && !state.feedback ? (
        <p className="rg-game__hint">แตะบรรทัดที่คิดว่าอันตราย</p>
      ) : null}
      {found ? (
        <div className="rg-game__reveal">
          {data.onFound.counter ? (
            <div className="rg-counter">
              <span className="rg-counter__num">{formatNumber(counter)}</span>
              <span className="rg-counter__caption">{data.onFound.counter.captionTh}</span>
            </div>
          ) : null}
          <Feedback tone="good" reducedMotion={reducedMotion}>
            {data.onFound.explanationTh}
          </Feedback>
        </div>
      ) : null}
    </EngineFrame>
  );
}
