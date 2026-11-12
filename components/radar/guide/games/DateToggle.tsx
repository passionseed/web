"use client";

/**
 * DateToggle (doors passport): tap a date chip, see which doors were open
 * that day. demo parts: `chip-<id>`.
 * Milestones: `chip` (value = chip index) on every tap. Done (once every chip
 * was seen) value: index of the chip that completed it.
 */
import { useState } from "react";
import type { EngineProps } from "@/lib/radar-guide/guide-types";
import { addSeen } from "@/lib/radar-guide/games/choices";
import { EngineFrame, ScoreHud, demoId, useGameOutcome } from "./engine-shell";

export default function DateToggle(props: EngineProps<"DateToggle">) {
  const { data, blockId, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const [active, setActive] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const total = data.chips.length;
  const solvedView = skipped && seen.length < total;
  const done = solvedView || seen.length >= total;
  const shownChips = solvedView ? data.chips : data.chips.filter((c) => c.id === active);

  const pick = (id: string, index: number) => {
    if (skipped) return;
    setActive(id);
    const next = addSeen(seen, id);
    setSeen(next);
    outcome.milestone("chip", index);
    if (next.length >= total && seen.length < total) {
      outcome.finish({ done: true, score: next.length, total, ms: outcome.elapsed() }, index);
    }
  };

  return (
    <EngineFrame
      engine="DateToggle"
      blockId={blockId}
      tagTh="เช็กพาสปอร์ต"
      status={done ? (solvedView ? "solved" : "clear") : "play"}
      reducedMotion={reducedMotion}
      hud={<ScoreHud label="DAY" value={solvedView ? total : seen.length} total={total} />}
    >
      {!solvedView ? (
        <div className="rg-date__chips" role="group" aria-label="เลือกวัน">
          {data.chips.map((chip, i) => (
            <button
              key={chip.id}
              type="button"
              className="rg-px-btn rg-date__chip"
              aria-pressed={active === chip.id}
              data-seen={seen.includes(chip.id) ? "" : undefined}
              onClick={() => pick(chip.id, i)}
              data-demo={demoId(blockId, `chip-${chip.id}`)}
            >
              {chip.labelTh}
            </button>
          ))}
        </div>
      ) : null}
      {shownChips.length === 0 ? <p className="rg-game__hint">แตะวันที่ แล้วดูว่าประตูไหนเปิด</p> : null}
      {shownChips.map((chip) => (
        <div key={chip.id} className="rg-date__day">
          {solvedView ? <p className="rg-date__daylabel">{chip.labelTh}</p> : null}
          <ul className="rg-date__doors">
            {data.columns.map((col) => {
              const cell = data.cells[chip.id]?.[col.id];
              const open = Boolean(cell?.open);
              return (
                <li key={col.id} className="rg-date__door" data-open={open ? "" : undefined}>
                  <span className="rg-date__lamp" aria-hidden />
                  <span className="rg-date__col">{col.labelTh}</span>
                  <span className="rg-date__state">{open ? "เปิด" : "ปิด"}</span>
                  {cell?.noteTh ? <span className="rg-date__note">{cell.noteTh}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </EngineFrame>
  );
}
