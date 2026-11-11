"use client";

/**
 * FlipCards (doors "same lie"): flip each case card; the same sentence lights
 * up on every back. demo parts: `card-<id>`.
 * Milestones: `flip` (value = cards flipped so far). Done value: cards flipped.
 */
import { useState } from "react";
import type { EngineProps } from "@/lib/radar-guide/guide-types";
import { addSeen } from "@/lib/radar-guide/games/choices";
import { splitHighlight } from "@/lib/radar-guide/games/text";
import { EngineFrame, ScoreHud, demoId, useGameOutcome } from "./engine-shell";

export default function FlipCards(props: EngineProps<"FlipCards">) {
  const { data, blockId, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const [flipped, setFlipped] = useState<string[]>([]);
  const total = data.cards.length;
  const solvedView = skipped && flipped.length < total;
  const shown = solvedView ? data.cards.map((c) => c.id) : flipped;
  const done = shown.length >= total;

  const flip = (id: string) => {
    if (skipped || flipped.includes(id)) return;
    const next = addSeen(flipped, id);
    setFlipped(next);
    outcome.milestone("flip", next.length);
    if (next.length >= total) outcome.finish({ done: true, score: next.length, total, ms: outcome.elapsed() }, next.length);
  };

  return (
    <EngineFrame
      engine="FlipCards"
      blockId={blockId}
      tagTh="พลิกดูทีละเคส"
      status={done ? (solvedView ? "solved" : "clear") : "play"}
      reducedMotion={reducedMotion}
      hud={<ScoreHud label="FLIP" value={shown.length} total={total} />}
    >
      <ul className="rg-flip">
        {data.cards.map((card) => {
          const open = shown.includes(card.id);
          return (
            <li key={card.id}>
              <button
                type="button"
                className="rg-flip__card"
                data-open={open ? "" : undefined}
                aria-pressed={open}
                onClick={() => flip(card.id)}
                data-demo={demoId(blockId, `card-${card.id}`)}
              >
                <span className="rg-flip__date">{card.dateTh}</span>
                {open ? (
                  <span className="rg-flip__back">
                    {splitHighlight(card.backTh, data.highlightTh).map((part, i) =>
                      part.hit ? (
                        <mark key={i} className="rg-flip__mark">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={i}>{part.text}</span>
                      )
                    )}
                  </span>
                ) : (
                  <>
                    <span className="rg-flip__front">{card.frontTh}</span>
                    <span className="rg-flip__cta" aria-hidden>
                      แตะเพื่อพลิก
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {done ? (
        <p className="rg-flip__same">
          <mark className="rg-flip__mark">{data.highlightTh}</mark>
        </p>
      ) : null}
    </EngineFrame>
  );
}
