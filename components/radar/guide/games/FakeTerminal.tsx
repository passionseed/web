"use client";

/**
 * FakeTerminal (terminal): a scope-first log lab. Command chips are the main
 * path; typing is optional. Pure client state machine
 * (lib/radar-guide/games/terminal.ts): no eval, no network, no real files.
 * Typed text is never sent or stored.
 * demo parts: `cmd-<command, quotes dropped, spaces as _>`, `input`, `send`,
 * `hit-<n>` (n-th tappable output line on screen, 1-based),
 * `answer-<option>`, `decision-<id>`, `poll-<id>`.
 * Milestones: `mission` (value = mission id), `flag`, `scopeTry` (value =
 * tries so far), `poll` (value = option position, 1-based).
 * Done (all missions) value: missions done. Saves choices `${pageKey}:poll`,
 * `${pageKey}:scopeTries`, `${pageKey}:missions` and local.terminal.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EngineProps } from "@/lib/radar-guide/guide-types";
import {
  allMissionsDone,
  answerMission,
  answerPoll,
  decide,
  decisionOpen,
  initTerminal,
  pendingQuestion,
  runCommand,
  solvedTerminal,
  tapOutputLine,
  terminalChips,
  terminalLocal,
  type TerminalState,
} from "@/lib/radar-guide/games/terminal";
import { useEngineStore } from "./engine-context";
import { EngineFrame, Feedback, ScoreHud, demoId, useGameOutcome } from "./engine-shell";

export function commandDemoPart(command: string): string {
  return `cmd-${command.replace(/["']/g, "").trim().replace(/\s+/g, "_")}`;
}

export default function FakeTerminal(props: EngineProps<"FakeTerminal">) {
  const { data, blockId, pageKey, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const [played, setPlayed] = useState<TerminalState>(initTerminal);
  const [typed, setTyped] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);

  const solvedView = skipped && !allMissionsDone(played, data);
  const view: TerminalState = solvedView ? { ...solvedTerminal(data), poll: played.poll } : played;
  const total = data.missions.length;
  const done = allMissionsDone(view, data);

  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [played.lines.length]);

  /** Applies a transition and fires the events and saves it implies. */
  const apply = (next: TerminalState) => {
    const prev = played;
    if (next === prev) return;
    setPlayed(next);
    for (const id of next.missionsDone) if (!prev.missionsDone.includes(id)) outcome.milestone("mission", id);
    if (next.flag && !prev.flag) outcome.milestone("flag");
    if (next.scopeTries > prev.scopeTries) {
      outcome.milestone("scopeTry", next.scopeTries);
      store.dispatch({ type: "choice", key: `${pageKey}:scopeTries`, value: String(next.scopeTries) });
    }
    if (next.poll && !prev.poll) {
      const index = data.poll.options.findIndex((o) => o.id === next.poll);
      store.dispatch({ type: "choice", key: `${pageKey}:poll`, value: next.poll });
      outcome.milestone("poll", index + 1);
    }
    const progressed =
      next.missionsDone.length !== prev.missionsDone.length ||
      next.flag !== prev.flag ||
      next.scopeTries !== prev.scopeTries;
    if (progressed) {
      store.dispatch({ type: "local", patch: { terminal: terminalLocal(next) } });
      if (next.missionsDone.length !== prev.missionsDone.length) {
        store.dispatch({ type: "choice", key: `${pageKey}:missions`, value: String(next.missionsDone.length) });
      }
    }
    if (allMissionsDone(next, data) && !allMissionsDone(prev, data)) {
      outcome.finish(
        { done: true, score: next.missionsDone.length, total, ms: outcome.elapsed() },
        next.missionsDone.length
      );
    }
  };

  const run = (command: string) => {
    if (skipped) return;
    apply(runCommand(played, data, command));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = typed;
    setTyped("");
    run(text);
  };

  const chips = skipped ? [] : terminalChips(played, data);
  const question = skipped ? undefined : pendingQuestion(played, data);
  const showDecision = !skipped && decisionOpen(played, data);
  let hitIndex = 0;

  return (
    <EngineFrame
      engine="FakeTerminal"
      blockId={blockId}
      tagTh="ภารกิจในแล็บจำลอง"
      status={done ? (solvedView ? "solved" : "clear") : "play"}
      reducedMotion={reducedMotion}
      simulated
      hud={<ScoreHud label="MISSION" value={view.missionsDone.length} total={total} />}
    >
      <p className="rg-game__caption">{data.labelTh}</p>
      <ol className="rg-term__missions">
        {data.missions.map((m) => {
          const ok = view.missionsDone.includes(m.id);
          return (
            <li key={m.id} data-done={ok ? "" : undefined}>
              <span className="rg-term__tick" aria-hidden>
                {ok ? "✓" : ""}
              </span>
              <span>{m.titleTh}</span>
              <span className="sr-only">{ok ? " (เสร็จแล้ว)" : ""}</span>
            </li>
          );
        })}
      </ol>

      <div className="rg-term" ref={screenRef} role="log" aria-label="หน้าจอเทอร์มินัลจำลอง" aria-live="polite">
        {view.lines.length === 0 ? <p className="rg-term__line" data-kind="note">lab.local $ แตะคำสั่งด้านล่าง</p> : null}
        {view.lines.map((line) => {
          if (line.tappable && !skipped) {
            hitIndex += 1;
            return (
              <button
                key={line.id}
                type="button"
                className="rg-term__line rg-term__hit"
                data-kind={line.kind}
                onClick={() => apply(tapOutputLine(played, data, line.id))}
                data-demo={demoId(blockId, `hit-${hitIndex}`)}
              >
                {line.text}
              </button>
            );
          }
          if (line.kind === "alert") {
            return (
              <p key={line.id} className="rg-term__alert" role="alert">
                {line.text}
              </p>
            );
          }
          return (
            <p key={line.id} className="rg-term__line" data-kind={line.kind}>
              {line.kind === "input" ? <span className="rg-term__prompt">$ </span> : null}
              {line.text}
            </p>
          );
        })}
        {view.flag && !solvedView ? (
          <p className="rg-term__flag" data-still={reducedMotion ? "" : undefined}>
            FLAG ✓
          </p>
        ) : null}
      </div>

      {view.feedback && !solvedView ? (
        <Feedback tone={view.feedback.tone === "bad" ? "bad" : view.feedback.tone === "good" ? "good" : "info"} shakeKey={view.lines.length} reducedMotion={reducedMotion}>
          {view.feedback.text}
        </Feedback>
      ) : null}

      {question?.question ? (
        <div className="rg-term__question">
          <p className="rg-game__prompt">{question.question.promptTh}</p>
          <div className="rg-chips" role="group" aria-label={question.question.promptTh}>
            {question.question.options.map((o) => (
              <button
                key={o}
                type="button"
                className="rg-px-btn rg-chip"
                onClick={() => apply(answerMission(played, data, question.id, o))}
                data-demo={demoId(blockId, `answer-${o}`)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showDecision ? (
        <div className="rg-term__decision" role="group" aria-label="ตัดสินใจ">
          {data.decision.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="rg-px-btn rg-px-btn--wide"
              aria-pressed={played.decision === o.id}
              onClick={() => apply(decide(played, data, o.id))}
              data-demo={demoId(blockId, `decision-${o.id}`)}
            >
              {o.labelTh}
            </button>
          ))}
        </div>
      ) : null}

      {chips.length ? (
        <div className="rg-term__chips" role="group" aria-label="คำสั่ง">
          {chips.map((chip) => (
            <button
              key={chip.command}
              type="button"
              className="rg-term__chip"
              data-danger={chip.danger ? "" : undefined}
              onClick={() => run(chip.command)}
              data-demo={demoId(blockId, commandDemoPart(chip.command))}
            >
              <code>{chip.command}</code>
              {chip.labelTh ? <span className="rg-term__chiplabel">{chip.labelTh}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {!skipped ? (
        <form className="rg-term__form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor={`${blockId}-cmd`}>
            พิมพ์คำสั่งเอง
          </label>
          <span className="rg-term__prompt" aria-hidden>
            $
          </span>
          <input
            id={`${blockId}-cmd`}
            className="rg-term__input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="send"
            placeholder="พิมพ์คำสั่งเองก็ได้"
            data-demo={demoId(blockId, "input")}
          />
          <button type="submit" className="rg-px-btn rg-px-btn--square" aria-label="รันคำสั่ง" data-demo={demoId(blockId, "send")}>
            ▶
          </button>
        </form>
      ) : null}

      {done ? (
        <div className="rg-term__poll">
          <p className="rg-game__prompt">{data.poll.prompt.th}</p>
          {view.poll ? (
            <>
              <p className="rg-game__result">
                เธอตอบ: {data.poll.options.find((o) => o.id === view.poll)?.labelTh}
              </p>
              <p className="rg-game__text">{data.poll.reveal.th}</p>
            </>
          ) : (
            <div className="rg-chips" role="group" aria-label={data.poll.prompt.th}>
              {data.poll.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="rg-px-btn rg-chip"
                  onClick={() => apply(answerPoll(played, data, o.id))}
                  data-demo={demoId(blockId, `poll-${o.id}`)}
                >
                  {o.labelTh}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </EngineFrame>
  );
}
