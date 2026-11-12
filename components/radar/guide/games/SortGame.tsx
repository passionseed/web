"use client";

/**
 * SortGame (doors keys, triage queue, scam chat): tap an item, then tap a bin.
 * Layouts: "cards" (tap a card, then a door), "queue" (tap a row to expand
 * its evidence, then a verdict button), "chat" (messages arrive one by one,
 * each with the bin buttons).
 * demo parts: `item-<id>`, `bin-<binId>` (cards), `item-<id>-bin-<binId>`
 * (queue/chat), `next` (chat), `timer`.
 * Milestones: `item:<itemId>` when that item is placed correctly.
 * Done value: x*10+y with `@goal` items, else the score.
 * Saves choices `${pageKey}:${itemId}` = bin, `${pageKey}:missed` (ids, comma
 * separated), and `${pageKey}:x` / `${pageKey}:y` with goal items.
 */
import { useState } from "react";
import type { EngineProps, SortGameData, SortItem } from "@/lib/radar-guide/guide-types";
import {
  isScored,
  placeItem,
  placementLine,
  solvedPlacements,
  sortOutcomeLines,
  sortResultText,
  sortScore,
  sortValue,
  visibleFlags,
  type Placement,
  type Placements,
} from "@/lib/radar-guide/games/sort-game";
import { useEngineStore } from "./engine-context";
import { EngineFrame, Feedback, GameTimerBar, ScoreHud, demoId, useGameOutcome, useGameTimer } from "./engine-shell";

const VERDICT_TH: Record<Placement["verdict"], string> = {
  correct: "ถูก",
  near: "ใกล้แล้ว",
  wrong: "ยังไม่ใช่",
  free: "ไม่มีผิดถูก",
};

const TAG_TH: Record<SortGameData["layout"], string> = {
  cards: "แตะการ์ด แล้วแตะประตู",
  queue: "ตรวจงาน AI",
  chat: "แยกข้อความ",
};

function Meta({ item }: { item: SortItem }) {
  if (!item.meta) return null;
  return (
    <span className="rg-sort__meta">
      {Object.entries(item.meta).map(([k, v]) => (
        <span key={k} className="rg-sort__meta-chip" data-key={k}>
          {v}
        </span>
      ))}
    </span>
  );
}

function Result({ data, item, p }: { data: SortGameData; item: SortItem; p: Placement }) {
  const flags = visibleFlags(item);
  const bin = data.bins.find((b) => b.id === p.bin);
  return (
    <div className="rg-sort__result" data-verdict={p.verdict}>
      <span className="rg-sort__verdict">
        {VERDICT_TH[p.verdict]}
        {bin && p.verdict !== "correct" ? <span className="rg-sort__picked"> (เธอเลือก {bin.labelTh})</span> : null}
      </span>
      <span className="rg-sort__line">{placementLine(data, item, p)}</span>
      {flags.length ? (
        <span className="rg-sort__flags">
          {flags.map((f) => (
            <span key={f} className="rg-sort__flag">
              {f}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

export default function SortGame(props: EngineProps<"SortGame">) {
  const { data, blockId, pageKey, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const [played, setPlaced] = useState<Placements>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [arrived, setArrived] = useState(1);
  const [nudge, setNudge] = useState(0);

  const solvedView = skipped && !sortScore(data, played).complete;
  const placed = solvedView ? solvedPlacements(data) : played;
  const score = sortScore(data, placed);
  const done = score.complete;
  const timer = useGameTimer(data.timer?.seconds, !done);

  const place = (itemId: string, bin: string) => {
    if (done || skipped) return;
    const next = placeItem(played, data, itemId, bin);
    if (next === played) return;
    setPlaced(next);
    setSelected(null);
    const p = next[itemId];
    store.dispatch({ type: "choice", key: `${pageKey}:${itemId}`, value: bin });
    if (p.verdict === "correct") outcome.milestone(`item:${itemId}`);
    const s = sortScore(data, next);
    if (s.complete) {
      const missed = data.items.filter((i) => isScored(i) && next[i.id]?.verdict !== "correct").map((i) => i.id);
      if (missed.length) store.dispatch({ type: "choice", key: `${pageKey}:missed`, value: missed.join(",") });
      if (s.hasGoal) {
        store.dispatch({ type: "choice", key: `${pageKey}:x`, value: String(s.x) });
        store.dispatch({ type: "choice", key: `${pageKey}:y`, value: String(s.y) });
      }
      outcome.finish({ done: true, score: s.score, total: s.total, ms: outcome.elapsed() }, sortValue(s));
    }
  };

  const onBin = (bin: string) => {
    if (!selected) {
      setNudge((n) => n + 1);
      return;
    }
    place(selected, bin);
  };

  const visibleItems =
    data.layout === "chat" && !reducedMotion && !done ? data.items.slice(0, arrived) : data.items;
  const lastArrived = data.items[arrived - 1];
  const canAdvance =
    data.layout === "chat" && !reducedMotion && !done && arrived < data.items.length && lastArrived && placed[lastArrived.id];

  return (
    <EngineFrame
      engine="SortGame"
      blockId={blockId}
      tagTh={TAG_TH[data.layout]}
      status={done ? (solvedView ? "solved" : "clear") : "play"}
      reducedMotion={reducedMotion}
      simulated={Boolean(data.simulated)}
      watermarkTh={data.simulated?.watermarkTh}
      hud={<ScoreHud value={score.score} total={score.total} />}
      timer={
        data.timer && !done ? (
          <GameTimerBar
            seconds={data.timer.seconds}
            labelTh={data.timer.labelTh}
            left={timer.left}
            enabled={timer.enabled}
            onToggle={timer.toggle}
            blockId={blockId}
          />
        ) : null
      }
    >
      {data.goalTh ? <p className="rg-game__prompt">{data.goalTh}</p> : null}

      {data.layout === "cards" ? (
        <>
          <ul className="rg-sort__cards">
            {data.items.map((item) => {
              const p = placed[item.id];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="rg-sort__card"
                    data-selected={selected === item.id ? "" : undefined}
                    data-verdict={p?.verdict}
                    aria-pressed={selected === item.id}
                    disabled={Boolean(p) || done}
                    onClick={() => setSelected((s) => (s === item.id ? null : item.id))}
                    data-demo={demoId(blockId, `item-${item.id}`)}
                  >
                    <span className="rg-sort__label">{item.labelTh}</span>
                    <Meta item={item} />
                  </button>
                  {p ? <Result data={data} item={item} p={p} /> : null}
                </li>
              );
            })}
          </ul>
          {!done ? (
            <div className="rg-sort__bins" role="group" aria-label="ประตู">
              {data.bins.map((bin) => (
                <button
                  key={bin.id}
                  type="button"
                  className="rg-px-btn rg-sort__bin"
                  data-armed={selected ? "" : undefined}
                  onClick={() => onBin(bin.id)}
                  data-demo={demoId(blockId, `bin-${bin.id}`)}
                >
                  {bin.labelTh}
                </button>
              ))}
            </div>
          ) : null}
          {!done && nudge > 0 && !selected ? (
            <Feedback tone="info" shakeKey={nudge} reducedMotion={reducedMotion}>
              แตะการ์ดก่อน แล้วค่อยแตะประตู
            </Feedback>
          ) : null}
        </>
      ) : (
        <ul className={data.layout === "chat" ? "rg-sort__chat" : "rg-sort__queue"}>
          {visibleItems.map((item) => {
            const p = placed[item.id];
            const open = data.layout === "chat" || selected === item.id || Boolean(p);
            return (
              <li key={item.id} className="rg-sort__row" data-verdict={p?.verdict} data-arrive={reducedMotion ? undefined : ""}>
                {data.layout === "queue" ? (
                  <button
                    type="button"
                    className="rg-sort__rowhead"
                    aria-expanded={open}
                    disabled={Boolean(p) || done}
                    onClick={() => setSelected((s) => (s === item.id ? null : item.id))}
                    data-demo={demoId(blockId, `item-${item.id}`)}
                  >
                    <Meta item={item} />
                    <span className="rg-sort__label">{item.labelTh}</span>
                  </button>
                ) : (
                  <div className="rg-sort__bubble" data-demo={demoId(blockId, `item-${item.id}`)}>
                    {item.meta?.sender ? <span className="rg-sort__sender">{item.meta.sender}</span> : null}
                    <span className="rg-sort__label">{item.labelTh}</span>
                  </div>
                )}
                {open && item.detailTh ? <p className="rg-sort__detail">{item.detailTh}</p> : null}
                {open && !p && !done ? (
                  <div className="rg-sort__answer" role="group" aria-label={item.labelTh}>
                    {data.bins.map((bin) => (
                      <button
                        key={bin.id}
                        type="button"
                        className="rg-px-btn rg-sort__bin"
                        onClick={() => place(item.id, bin.id)}
                        data-demo={demoId(blockId, `item-${item.id}-bin-${bin.id}`)}
                      >
                        {bin.labelTh}
                      </button>
                    ))}
                  </div>
                ) : null}
                {p ? <Result data={data} item={item} p={p} /> : null}
              </li>
            );
          })}
        </ul>
      )}

      {canAdvance ? (
        <button
          type="button"
          className="rg-px-btn rg-px-btn--wide"
          onClick={() => setArrived((n) => Math.min(data.items.length, n + 1))}
          data-demo={demoId(blockId, "next")}
        >
          ข้อความถัดไป ▶
        </button>
      ) : null}

      {done && !solvedView ? (
        <div className="rg-game__reveal">
          <p className="rg-game__result">{sortResultText(data, score)}</p>
          {sortOutcomeLines(data, placed).map((line, i) => (
            <p key={i} className="rg-game__text">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </EngineFrame>
  );
}
