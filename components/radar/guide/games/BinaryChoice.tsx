"use client";

/**
 * BinaryChoice (fit): "อันนี้หรืออันนั้น", one pair at a time. No answer is
 * wrong. demo parts: `q-<id>-left`, `q-<id>-right`.
 * Done value: 1 (A), 2 (B), 3 (C), 4 (tie). Saves `fit` and
 * choices[`${pageKey}:title`] (readout titles).
 */
import { useState } from "react";
import type { EngineProps } from "@/lib/radar-guide/guide-types";
import { fitOutcomes, fitResult, fitValue, tallyFit, type Side } from "@/lib/radar-guide/games/choices";
import { useEngineStore } from "./engine-context";
import { EngineFrame, ScoreHud, demoId, useGameOutcome } from "./engine-shell";

export default function BinaryChoice(props: EngineProps<"BinaryChoice">) {
  const { data, blockId, pageKey, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const [answers, setAnswers] = useState<Record<string, Side>>({});
  const total = data.questions.length;
  const answered = data.questions.filter((q) => answers[q.id]).length;
  const finished = answered >= total;
  const current = data.questions.find((q) => !answers[q.id]);
  const result = finished ? fitResult(tallyFit(data.questions, answers)) : null;
  const solvedView = skipped && !finished;

  const choose = (qid: string, side: Side) => {
    if (finished || skipped) return;
    const next = { ...answers, [qid]: side };
    setAnswers(next);
    if (data.questions.every((q) => next[q.id])) {
      const r = fitResult(tallyFit(data.questions, next));
      store.dispatch({ type: "fit", fit: r });
      store.dispatch({
        type: "choice",
        key: `${pageKey}:title`,
        value: fitOutcomes(r)
          .map((o) => data.outcomes[o].titleTh)
          .join(" และ "),
      });
      outcome.finish({ done: true, score: total, total, ms: outcome.elapsed() }, fitValue(r));
    }
  };

  const readouts = result ? fitOutcomes(result) : solvedView ? (["A", "B", "C"] as const) : [];

  return (
    <EngineFrame
      engine="BinaryChoice"
      blockId={blockId}
      tagTh="อันนี้หรืออันนั้น"
      status={finished ? "clear" : solvedView ? "solved" : "play"}
      reducedMotion={reducedMotion}
      hud={<ScoreHud label="Q" value={Math.min(answered + (finished ? 0 : 1), total)} total={total} />}
    >
      {current && !skipped ? (
        <div className="rg-pair" key={current.id} data-enter={reducedMotion ? undefined : ""}>
          <button
            type="button"
            className="rg-pair__card"
            onClick={() => choose(current.id, "left")}
            data-demo={demoId(blockId, `q-${current.id}-left`)}
          >
            {current.leftTh}
          </button>
          <span className="rg-pair__or" aria-hidden>
            หรือ
          </span>
          <button
            type="button"
            className="rg-pair__card"
            onClick={() => choose(current.id, "right")}
            data-demo={demoId(blockId, `q-${current.id}-right`)}
          >
            {current.rightTh}
          </button>
        </div>
      ) : null}
      {readouts.length ? (
        <div className="rg-game__reveal">
          {readouts.map((o) => (
            <div key={o} className="rg-readout" data-outcome={o}>
              <p className="rg-readout__title">{data.outcomes[o].titleTh}</p>
              <p className="rg-readout__body">{data.outcomes[o].bodyTh}</p>
            </div>
          ))}
          <p className="rg-game__fine">{data.disclaimerTh}</p>
        </div>
      ) : null}
    </EngineFrame>
  );
}
