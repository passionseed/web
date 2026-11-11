"use client";

/**
 * GuessReveal (mythos Firefox bar, money): slide to a guess, lock it, see the
 * real value rise. demo parts: `minus`, `plus`, `slider`, `lock`.
 * Done value: bucket index. Saves choices[`${pageKey}:${blockId}`] = guess.
 */
import { useState, type CSSProperties } from "react";
import type { EngineProps, GuessRevealData } from "@/lib/radar-guide/guide-types";
import {
  axisPercent,
  bucketIndex,
  chartMax,
  clampGuess,
  formatGuessValue,
  guessFeedback,
  guessVars,
  initialGuess,
  stepGuess,
} from "@/lib/radar-guide/games/guess-reveal";
import { fillTemplate, formatNumber, templateNames } from "@/lib/radar-guide/games/text";
import { useEngineStore } from "./engine-context";
import { EngineFrame, Feedback, demoId, useCountUp, useGameOutcome } from "./engine-shell";

function BarsChart({
  data,
  chart,
  guess,
  revealed,
  shown,
}: {
  data: GuessRevealData;
  chart: Extract<GuessRevealData["chart"], { kind: "bars" }>;
  guess: number;
  revealed: boolean;
  shown: number;
}) {
  const max = chartMax(data, guess) * 1.08;
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div className="rg-bars" role="img" aria-label="กราฟแท่ง">
      {chart.band ? (
        <div
          className="rg-bars__band"
          style={{ bottom: pct(chart.band.from), height: `calc(${pct(chart.band.to)} - ${pct(chart.band.from)})` }}
        >
          <span>{chart.band.labelTh}</span>
        </div>
      ) : null}
      {chart.bars.map((bar, i) => {
        const target = bar.value === null;
        const value = target ? (revealed ? shown : 0) : bar.value!;
        const segment = target && revealed ? bar.segment : undefined;
        return (
          <div key={i} className="rg-bars__col" data-target={target ? "" : undefined}>
            <div className="rg-bars__plot">
              {target && !revealed ? <span className="rg-bars__unknown">?</span> : null}
              <div className="rg-bars__bar" style={{ height: pct(value) } as CSSProperties}>
                {segment ? (
                  <div
                    className="rg-bars__segment"
                    style={{ height: `${Math.min(100, (segment.value / Math.max(1, data.answer)) * 100)}%` }}
                    title={segment.labelTh}
                  />
                ) : null}
                <span className="rg-bars__value">{target && !revealed ? "" : formatNumber(value)}</span>
              </div>
              {target ? (
                <div className="rg-bars__guess" style={{ bottom: pct(guess) }} aria-hidden>
                  <span>เธอ {formatNumber(guess)}</span>
                </div>
              ) : null}
            </div>
            <span className="rg-bars__label">{bar.labelTh}</span>
            {segment ? <span className="rg-bars__seglabel">{segment.labelTh}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function AxisChart({
  data,
  chart,
  guess,
  revealed,
}: {
  data: GuessRevealData;
  chart: Extract<GuessRevealData["chart"], { kind: "axis" }>;
  guess: number;
  revealed: boolean;
}) {
  const at = (v: number) => `${axisPercent(v, data.min, data.max)}%`;
  return (
    <div className="rg-axis" role="img" aria-label="แกนตัวเลข">
      <div className="rg-axis__line">
        {revealed && chart.shade ? (
          <span
            className="rg-axis__shade"
            style={{ left: at(chart.shade.from), width: `calc(${at(chart.shade.to)} - ${at(chart.shade.from)})` }}
          />
        ) : null}
        {revealed
          ? chart.markers.map((m, i) => (
              <span
                key={i}
                className="rg-axis__marker"
                data-strong={m.strong ? "" : undefined}
                data-row={i % 2}
                style={{ left: at(m.value) }}
              >
                <span className="rg-axis__tick" />
                <span className="rg-axis__label">{m.labelTh}</span>
              </span>
            ))
          : null}
        <span className="rg-axis__guess" style={{ left: at(guess) }} aria-hidden>
          <span>เธอ</span>
        </span>
      </div>
      <div className="rg-axis__ends" aria-hidden>
        <span>{formatNumber(data.min)}</span>
        <span>{formatNumber(data.max)}</span>
      </div>
      {revealed && chart.gapLabelTh ? <p className="rg-axis__gap">{chart.gapLabelTh}</p> : null}
    </div>
  );
}

export default function GuessReveal(props: EngineProps<"GuessReveal">) {
  const { data, blockId, pageKey, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const [guess, setGuess] = useState(() => initialGuess(data));
  const [locked, setLocked] = useState(false);
  const revealed = locked || skipped;
  const shown = useCountUp(data.answer, revealed, reducedMotion, 1400);
  const feedback = locked ? guessFeedback(guess, data) : null;

  const lock = () => {
    if (revealed) return;
    setLocked(true);
    store.dispatch({ type: "choice", key: `${pageKey}:${blockId}`, value: String(guess) });
    const near = guessFeedback(guess, data).kind === "near";
    outcome.finish({ done: true, score: near ? 1 : 0, total: 1, ms: outcome.elapsed() }, bucketIndex(guess, data.buckets));
  };

  return (
    <EngineFrame
      engine="GuessReveal"
      blockId={blockId}
      tagTh="ทายก่อน แล้วค่อยเฉลย"
      status={revealed ? (locked ? "clear" : "solved") : "play"}
      reducedMotion={reducedMotion}
    >
      <p className="rg-game__prompt">{data.promptTh}</p>
      {data.chart.kind === "bars" ? (
        <BarsChart data={data} chart={data.chart} guess={guess} revealed={revealed} shown={shown} />
      ) : (
        <AxisChart data={data} chart={data.chart} guess={guess} revealed={revealed} />
      )}
      {!revealed ? (
        <div className="rg-guess">
          <output className="rg-guess__value" htmlFor={`${blockId}-slider`}>
            {formatGuessValue(guess, data.unit)}
          </output>
          <div className="rg-guess__row">
            <button
              type="button"
              className="rg-px-btn rg-px-btn--square"
              aria-label="ลดลง"
              onClick={() => setGuess((g) => stepGuess(g, -1, data))}
              data-demo={demoId(blockId, "minus")}
            >
              −
            </button>
            <input
              id={`${blockId}-slider`}
              className="rg-guess__slider"
              type="range"
              min={data.min}
              max={data.max}
              step={data.step}
              value={guess}
              aria-label={data.promptTh}
              onChange={(e) => setGuess(clampGuess(Number(e.target.value), data))}
              data-demo={demoId(blockId, "slider")}
            />
            <button
              type="button"
              className="rg-px-btn rg-px-btn--square"
              aria-label="เพิ่มขึ้น"
              onClick={() => setGuess((g) => stepGuess(g, 1, data))}
              data-demo={demoId(blockId, "plus")}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="rg-px-btn rg-px-btn--accent rg-px-btn--wide"
            onClick={lock}
            data-demo={demoId(blockId, "lock")}
          >
            ล็อกคำตอบ
          </button>
        </div>
      ) : (
        <div className="rg-game__reveal">
          <p className="rg-guess__answer">
            <span className="rg-guess__answer-num">{formatNumber(shown)}</span>
          </p>
          {feedback ? (
            <Feedback tone={feedback.kind === "near" ? "good" : "near"} reducedMotion={reducedMotion}>
              {feedback.text}
            </Feedback>
          ) : null}
          {locked || !templateNames(data.revealTh).includes("g") ? (
            <p className="rg-game__text">
              {fillTemplate(data.revealTh, locked ? guessVars(guess, data) : { a: formatNumber(data.answer) })}
            </p>
          ) : null}
        </div>
      )}
    </EngineFrame>
  );
}
