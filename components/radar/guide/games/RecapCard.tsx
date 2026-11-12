"use client";

/**
 * RecapCard (next): what the viewer did, from local progress only (no name,
 * no free text), then "เกมไหนสนุกสุด" among the levels they played.
 * demo parts: `fav-<pageKey>`.
 * Done (first pick) value: the picked level's order (from the shell's pages,
 * else its position in `favourites`). Saves `favourite`.
 */
import type { EngineProps } from "@/lib/radar-guide/guide-types";
import { favouriteLine, favouriteOptions, recapLines } from "@/lib/radar-guide/games/recap";
import { useEngineStore } from "./engine-context";
import { EngineFrame, demoId, useGameOutcome } from "./engine-shell";

export default function RecapCard(props: EngineProps<"RecapCard">) {
  const { data, blockId, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const { state, pages } = store;
  const lines = recapLines(data, state);
  const options = favouriteOptions(data, state);
  const pick = state.favourite && options.includes(state.favourite) ? state.favourite : undefined;
  const pickLine = favouriteLine(data, pick);

  const label = (key: string) => pages?.find((p) => p.key === key)?.navLabelTh ?? key;
  const orderOf = (key: string) =>
    pages?.find((p) => p.key === key)?.order ?? Object.keys(data.favourites).indexOf(key) + 1;

  const choose = (key: string) => {
    store.dispatch({ type: "favourite", pageKey: key });
    outcome.finish({ done: true, ms: outcome.elapsed() }, orderOf(key));
  };

  return (
    <EngineFrame
      engine="RecapCard"
      blockId={blockId}
      tagTh="สรุปรันของเธอ"
      status={pick ? "clear" : skipped ? "solved" : "play"}
      reducedMotion={reducedMotion}
    >
      <div className="rg-recap">
        {lines.length ? (
          <ul className="rg-recap__lines">
            {lines.map((l) => (
              <li key={l.pageKey}>
                <span className="rg-recap__level">{label(l.pageKey)}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rg-game__hint">ยังไม่มีด่านที่เล่นจบ ลองกลับไปเล่นสักด่านก่อนก็ได้</p>
        )}
        {pickLine ? <p className="rg-recap__pick">{pickLine}</p> : null}
        <p className="rg-recap__cardline">{data.cardLineTh}</p>
      </div>

      {options.length ? (
        <div className="rg-recap__fav">
          <p className="rg-game__prompt">เกมไหนสนุกสุด</p>
          <div className="rg-chips" role="group" aria-label="เกมไหนสนุกสุด">
            {options.map((key) => (
              <button
                key={key}
                type="button"
                className="rg-px-btn rg-chip"
                aria-pressed={pick === key}
                onClick={() => choose(key)}
                data-demo={demoId(blockId, `fav-${key}`)}
              >
                {label(key)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </EngineFrame>
  );
}
