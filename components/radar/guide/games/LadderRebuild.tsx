"use client";

/**
 * LadderRebuild (firstjob): AI takes the bottom rungs, new rungs snap in one
 * level up, then the viewer builds a first rung from proof chips.
 * `rungsTh` and `newRungsTh` are listed bottom to top.
 * demo parts: `ai`, `replace`, `chip-<id>`, `confirm`.
 * Milestones: `ladder` (after the new rungs appear). Done value: bitmask of
 * picks (chip i = bit i). Saves `proof` (ids) and local.proofLabels.
 */
import { useState } from "react";
import { FACT_BADGE_TH, type CopyText, type EngineProps } from "@/lib/radar-guide/guide-types";
import { proofBitmask, togglePick } from "@/lib/radar-guide/games/choices";
import { useEngineStore } from "./engine-context";
import { EngineFrame, ScoreHud, demoId, useGameOutcome } from "./engine-shell";

function Caption({ copy }: { copy: CopyText }) {
  return (
    <p className="rg-ladder__caption">
      {copy.badge ? <span className="rg-game__badge">{FACT_BADGE_TH[copy.badge]}</span> : null}
      {copy.th}
    </p>
  );
}

export default function LadderRebuild(props: EngineProps<"LadderRebuild">) {
  const { data, blockId, pageKey, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const shownStep = skipped ? Math.max(step, 2) : step;
  const solvedView = skipped && !locked;

  const advance = (to: number) => {
    if (skipped) return;
    setStep(to);
    if (to === 2) outcome.milestone("ladder");
  };

  const confirm = () => {
    if (picked.length !== data.pick || locked || skipped) return;
    setLocked(true);
    const labels: Record<string, string> = {};
    for (const chip of data.proofChips) if (picked.includes(chip.id)) labels[chip.id] = chip.labelTh;
    store.dispatch({ type: "proof", ids: picked });
    store.dispatch({ type: "local", patch: { proofLabels: labels } });
    store.dispatch({ type: "choice", key: `${pageKey}:proof`, value: picked.join(",") });
    outcome.finish(
      { done: true, score: picked.length, total: data.pick, ms: outcome.elapsed() },
      proofBitmask(data.proofChips, picked)
    );
  };

  const faded = shownStep >= 1;
  const rebuilt = shownStep >= 2;
  const oldRungs = data.rungsTh.map((label, i) => ({ label, fade: faded && i < data.fadeCount, fresh: false }));
  // New rungs sit one level up from the faded ones.
  const rungs = rebuilt
    ? [
        ...oldRungs.slice(0, data.fadeCount),
        ...data.newRungsTh.map((label) => ({ label, fade: false, fresh: true })),
        ...oldRungs.slice(data.fadeCount),
      ]
    : oldRungs;
  const pickedChips = data.proofChips.filter((c) => picked.includes(c.id));

  return (
    <EngineFrame
      engine="LadderRebuild"
      blockId={blockId}
      tagTh="ต่อบันไดงานแรก"
      status={locked ? "clear" : solvedView ? "solved" : "play"}
      reducedMotion={reducedMotion}
      hud={rebuilt ? <ScoreHud label="PICK" value={picked.length} total={data.pick} /> : null}
    >
      <ol className="rg-ladder" aria-label="บันไดอาชีพ จากล่างขึ้นบน">
        {[...rungs].reverse().map((r, i) => (
          <li key={`${r.label}-${i}`} className="rg-ladder__rung" data-fade={r.fade ? "" : undefined} data-fresh={r.fresh ? "" : undefined}>
            {r.label}
          </li>
        ))}
      </ol>
      {pickedChips.length ? (
        <ul className="rg-ladder__stack" aria-label="ขั้นแรกของเธอ">
          {pickedChips.map((c) => (
            <li key={c.id} className="rg-ladder__block">
              <strong>{c.labelTh}</strong>
              <span>{c.evidenceTh}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {faded ? <Caption copy={data.aiCaption} /> : null}
      {rebuilt ? <Caption copy={data.newCaption} /> : null}

      {shownStep === 0 ? (
        <button type="button" className="rg-px-btn rg-px-btn--accent rg-px-btn--wide" onClick={() => advance(1)} data-demo={demoId(blockId, "ai")}>
          ใส่ AI
        </button>
      ) : null}
      {shownStep === 1 ? (
        <button type="button" className="rg-px-btn rg-px-btn--accent rg-px-btn--wide" onClick={() => advance(2)} data-demo={demoId(blockId, "replace")}>
          แล้วอะไรมาแทน
        </button>
      ) : null}

      {rebuilt && !skipped ? (
        <div className="rg-ladder__build">
          <p className="rg-game__prompt">สร้างขั้นแรกของเธอเอง เลือก {data.pick} อย่าง</p>
          <div className="rg-chips" role="group" aria-label="หลักฐานที่อยากเก็บ">
            {data.proofChips.map((chip) => {
              const on = picked.includes(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  className="rg-px-btn rg-chip"
                  aria-pressed={on}
                  disabled={locked || (!on && picked.length >= data.pick)}
                  onClick={() => setPicked((p) => togglePick(p, chip.id, data.pick))}
                  data-demo={demoId(blockId, `chip-${chip.id}`)}
                >
                  {chip.labelTh}
                </button>
              );
            })}
          </div>
          {!locked ? (
            <button
              type="button"
              className="rg-px-btn rg-px-btn--accent rg-px-btn--wide"
              disabled={picked.length !== data.pick}
              onClick={confirm}
              data-demo={demoId(blockId, "confirm")}
            >
              ล็อกขั้นแรกของฉัน
            </button>
          ) : null}
        </div>
      ) : null}
    </EngineFrame>
  );
}
