"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatClock } from "@/lib/whiteboard/core";
import { elapsedSeconds, parseScript, type ScriptClock, stepAt, STOPPED } from "@/lib/whiteboard/script";

const EXAMPLE = [
  "0:00 เปิดห้อง, ทักทาย, วันนี้จะทำอะไร",
  "5:00 โชว์บอร์ด, stickies, timer",
  "15:00 ให้ทุกคนลองทำ, แบ่งกลุ่ม",
  "30:00 สรุป, next step",
].join("\n");

type Saved = { text: string; clock: ScriptClock };

// Spike: the script lives only in this browser, per board.
function load(key: string): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<Saved> | null;
    return { text: saved?.text ?? "", clock: saved?.clock ?? STOPPED };
  } catch {
    return { text: "", clock: STOPPED };
  }
}

/** Styles for the script tab and its floating window, which has none of the page's CSS. */
export const SCRIPT_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: #15110e; color: #f6efe6;
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", "Sukhumvit Set", "Noto Sans Thai", sans-serif; }
.sp-page { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; background: #15110e; color: #f6efe6;
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", "Sukhumvit Set", "Noto Sans Thai", sans-serif; }
.sp-pagebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px;
  border-bottom: 1px solid #ffffff1a; }
.sp-pagebody { flex: 1; min-height: 0; width: 100%; max-width: 760px; margin: 0 auto; }
.sp-floating { margin: 18vh 16px 0; text-align: center; font-size: 20px; font-weight: 600; line-height: 1.6; }
.sp { display: flex; flex-direction: column; height: 100%; }
.sp-bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #ffffff1a; }
.sp-clock { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.1; }
.sp-left { font-size: 12px; color: #c8bdb0; font-variant-numeric: tabular-nums; }
.sp-left--late { color: #fca5a5; }
.sp-actions { margin-left: auto; display: flex; gap: 6px; }
.sp-btn { background: #ffffff12; color: inherit; border: 1px solid #ffffff1f; border-radius: 999px;
  padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.sp-btn:hover { background: #ffffff22; }
.sp-btn--go { background: #f97316; border-color: #f97316; color: #1c0f04; font-weight: 600; }
.sp-btn--go:hover { background: #fb923c; }
.sp-body { flex: 1; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
.sp-label { font-size: 11px; color: #fdba74; letter-spacing: 0.06em; text-transform: uppercase; }
.sp-kw { font-size: 26px; font-weight: 700; line-height: 1.2; margin-top: 4px; }
.sp-next { padding: 10px 12px; border-radius: 12px; background: #ffffff0d; color: #d6ccc0; font-size: 14px; }
.sp-next b { color: #fff; font-weight: 600; }
.sp-list { list-style: none; padding: 0; margin: 0; }
.sp-step { display: flex; gap: 10px; width: 100%; text-align: left; padding: 6px 8px; border-radius: 8px;
  background: none; border: 0; color: #b3a89b; font: inherit; font-size: 13px; cursor: pointer; }
.sp-step:hover { background: #ffffff10; }
.sp-step--past { opacity: 0.45; }
.sp-step--now { color: #fff; background: #f9731622; }
.sp-step time { min-width: 42px; color: #fdba74; font-variant-numeric: tabular-nums; }
.sp-hint { margin: 0; font-size: 12px; color: #a3988b; }
.sp-edit { flex: 1; width: 100%; min-height: 260px; resize: none; background: #0c0a08; color: inherit;
  border: 1px solid #ffffff1f; border-radius: 10px; padding: 10px; outline: none;
  font: 14px/1.6 ui-monospace, "SF Mono", Menlo, "Sukhumvit Set", "Noto Sans Thai", monospace; }
.sp-edit:focus { border-color: #fb923c99; }
`;

/** The presenter's script: a running clock, the keywords for now, what's next, and the whole timeline. */
export function ScriptPanel({ boardId, win }: { boardId: string; win: Window }) {
  const key = `whiteboard-script:${boardId}`;
  const [initial] = useState(() => load(key));
  const [text, setText] = useState(initial.text);
  const [clock, setClock] = useState(initial.clock);
  const [editing, setEditing] = useState(!initial.text.trim());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify({ text, clock }));
  }, [key, text, clock]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  const steps = useMemo(() => parseScript(text), [text]);
  const elapsed = elapsedSeconds(clock, now);
  const current = stepAt(steps, elapsed);
  const next = steps[current + 1];
  const running = clock.startedAt !== null;

  const toggle = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setClock((c) => (c.startedAt === null ? { ...c, startedAt: at } : { startedAt: null, banked: c.banked + at - c.startedAt }));
  }, []);

  const jumpTo = useCallback((seconds: number) => {
    const at = Date.now();
    setNow(at);
    setClock((c) => ({ startedAt: c.startedAt === null ? null : at, banked: seconds * 1000 }));
  }, []);

  // Space starts and pauses, arrows move between parts. Keys go to the floating window, not the board.
  useEffect(() => {
    if (editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        // A focused button would also take the Space as a click and toggle twice.
        (win.document.activeElement as HTMLElement | null)?.blur();
        toggle();
      } else if (e.key === "ArrowRight" && next) {
        jumpTo(next.at);
      } else if (e.key === "ArrowLeft") {
        jumpTo(steps[Math.max(0, current - 1)]?.at ?? 0);
      }
    };
    win.addEventListener("keydown", onKey);
    return () => win.removeEventListener("keydown", onKey);
  }, [win, editing, toggle, jumpTo, steps, current, next]);

  const left = next ? next.at - elapsed : null;

  return (
    <div className="sp">
      <header className="sp-bar">
        <div>
          <div className="sp-clock">{formatClock(elapsed)}</div>
          {left !== null && <div className="sp-left">ช่วงนี้เหลือ {formatClock(left)}</div>}
        </div>
        <div className="sp-actions">
          {!editing && (
            <button type="button" className={`sp-btn ${running ? "" : "sp-btn--go"}`} onClick={toggle} title="Space">
              {running ? "พัก" : elapsed > 0 ? "ต่อ" : "เริ่ม"}
            </button>
          )}
          {!editing && elapsed > 0 && (
            <button type="button" className="sp-btn" onClick={() => setClock(STOPPED)} title="Reset">
              ↺
            </button>
          )}
          <button type="button" className="sp-btn" onClick={() => setEditing((e) => !e)}>
            {editing ? "เสร็จ" : "แก้"}
          </button>
        </div>
      </header>

      <main className="sp-body">
        {editing ? (
          <>
            <p className="sp-hint">บรรทัดละช่วง: เวลา แล้วตามด้วยคีย์เวิร์ด คั่นด้วย , · One line per part: m:ss, then keywords</p>
            <textarea
              className="sp-edit"
              autoFocus
              spellCheck={false}
              value={text}
              placeholder={EXAMPLE}
              onChange={(e) => setText(e.target.value)}
            />
            {!text.trim() && (
              <button type="button" className="sp-btn" onClick={() => setText(EXAMPLE)}>
                ใช้ตัวอย่าง · Use the example
              </button>
            )}
          </>
        ) : steps.length === 0 ? (
          <p className="sp-hint">ยังไม่มีสคริปต์ กด แก้ เพื่อเขียน</p>
        ) : (
          <>
            {current >= 0 ? (
              <section>
                <div className="sp-label">ตอนนี้ · {formatClock(steps[current].at)}</div>
                {steps[current].keywords.map((word, i) => (
                  <div key={i} className="sp-kw">
                    {word}
                  </div>
                ))}
              </section>
            ) : (
              <p className="sp-hint">ช่วงแรกเริ่มตอน {formatClock(steps[0].at)}</p>
            )}
            {next && (
              <div className="sp-next">
                ต่อไป {formatClock(next.at)} · <b>{next.keywords.join(", ")}</b>
              </div>
            )}
            <ol className="sp-list">
              {steps.map((step, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => jumpTo(step.at)}
                    className={`sp-step ${i < current ? "sp-step--past" : ""} ${i === current ? "sp-step--now" : ""}`}
                  >
                    <time>{formatClock(step.at)}</time>
                    <span>{step.keywords.join(", ")}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="sp-hint">Space เริ่ม/พัก · ← → ช่วงก่อน/ถัดไป · คลิกช่วงเพื่อกระโดดไป</p>
          </>
        )}
      </main>
    </div>
  );
}
