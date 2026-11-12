"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatClock } from "@/lib/whiteboard/core";
import { elapsedSeconds, parseScript, type ScriptClock, stepAt, STOPPED } from "@/lib/whiteboard/script";

import { WB_FONT_FAMILY } from "../fonts";

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

/**
 * Styles for the floating window, which has none of the page's CSS. The board's Grain look on
 * dark paper: ink text, periwinkle hairlines and dashed rules, mono numerals, and vermilion only
 * as the thin marker on the current step. `--sp-sans` and `--sp-mono` are set by `useBoardFonts`.
 */
export const SCRIPT_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #15151c; color: #e9eaf6;
  font: 15px/1.45 var(--sp-sans, "IBM Plex Sans Thai"), system-ui, -apple-system, "Segoe UI", "Sukhumvit Set", "Noto Sans Thai", sans-serif;
  -webkit-font-smoothing: antialiased; }
.sp { display: flex; flex-direction: column; height: 100vh; }
.sp-num, .sp-clock, .sp-step time { font-family: var(--sp-mono, "IBM Plex Mono"), ui-monospace, "SF Mono", Menlo, monospace;
  font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.sp-bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px dashed rgba(142, 155, 224, 0.45); }
.sp-clock { font-size: 30px; font-weight: 500; letter-spacing: 0.01em; line-height: 1.1; color: #a9b4f0; }
.sp-left { font-size: 12px; color: #9a9ec4; }
.sp-left--late { color: #ff8a66; }
.sp-actions { margin-left: auto; display: flex; gap: 6px; }
.sp-btn { min-height: 36px; background: transparent; color: inherit; border: 1px solid #e9eaf6; border-radius: 8px;
  padding: 0 12px; font: inherit; font-size: 13px; cursor: pointer; }
.sp-btn:hover { background: rgba(142, 155, 224, 0.12); }
.sp-btn:active { background: rgba(142, 155, 224, 0.22); }
.sp-btn:focus-visible, .sp-step:focus-visible { outline: 2px solid #a9b4f0; outline-offset: 2px; }
.sp-btn--go, .sp-btn--go:hover, .sp-btn--go:active { background: #e9eaf6; color: #15151c; font-weight: 600; }
.sp-btn--go:hover { opacity: 0.88; }
.sp-body { flex: 1; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
.sp-label { font-size: 11px; font-weight: 500; color: #a9b4f0; letter-spacing: 0.1em; }
.sp-kw { font-size: 26px; font-weight: 600; line-height: 1.2; margin-top: 4px; }
.sp-next { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(142, 155, 224, 0.22); color: #b9bcdd; font-size: 14px; }
.sp-next b { color: #e9eaf6; font-weight: 600; }
.sp-list { list-style: none; padding: 0; margin: 0; border-bottom: 1px dashed rgba(142, 155, 224, 0.45); }
.sp-step { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 36px; text-align: left;
  padding: 6px 8px 6px 10px; background: none; border: 0; border-top: 1px dashed rgba(142, 155, 224, 0.45);
  color: #b9bcdd; font: inherit; font-size: 13px; cursor: pointer; }
.sp-step:hover { background: rgba(142, 155, 224, 0.12); }
.sp-step--past { color: #9a9ec4; }
.sp-step--past time { color: #9a9ec4; }
.sp-step--now { color: #e9eaf6; font-weight: 500; }
.sp-step--now::before { content: ""; position: absolute; left: 0; top: 50%; width: 2px; height: 22px; margin-top: -11px; background: #ff4b1f; }
.sp-step time { min-width: 42px; color: #a9b4f0; }
.sp-hint { margin: 0; font-size: 12px; color: #9a9ec4; }
.sp-edit { flex: 1; width: 100%; min-height: 260px; resize: none; background: #101015; color: inherit;
  border: 1px solid #7c86c9; border-radius: 8px; padding: 10px; outline: none;
  font: 14px/1.6 var(--sp-mono, "IBM Plex Mono"), ui-monospace, "SF Mono", Menlo, "Sukhumvit Set", "Noto Sans Thai", monospace; }
.sp-edit:focus { border-color: #a9b4f0; }
`;

const familyNames = (stack: string) => stack.split(",").map((name) => name.trim().replace(/^["']|["']$/g, ""));

/**
 * The board's two typefaces live in the page's stylesheets, which the floating window does not
 * have. Copy their @font-face rules over and point `--sp-sans` / `--sp-mono` at them. If none
 * are found the window falls back to system fonts.
 */
function useBoardFonts(win: Window) {
  useEffect(() => {
    const wanted = new Set([...familyNames(WB_FONT_FAMILY.sans), ...familyNames(WB_FONT_FAMILY.mono)]);
    let css = "";
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // A cross-origin sheet.
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule && familyNames(rule.style.getPropertyValue("font-family")).some((name) => wanted.has(name))) {
          // The window is about:blank: make root-relative font URLs absolute.
          css += rule.cssText.replace(/url\((["']?)\/(?!\/)/g, `url($1${window.location.origin}/`);
        }
      }
    }
    const doc = win.document;
    const style = doc.createElement("style");
    style.textContent = css;
    doc.head.append(style);
    doc.body.style.setProperty("--sp-sans", WB_FONT_FAMILY.sans);
    doc.body.style.setProperty("--sp-mono", WB_FONT_FAMILY.mono);
    return () => style.remove();
  }, [win]);
}

/** The presenter's script: a running clock, the keywords for now, what's next, and the whole timeline. */
export function ScriptPanel({ boardId, win }: { boardId: string; win: Window }) {
  const key = `whiteboard-script:${boardId}`;
  const [initial] = useState(() => load(key));
  const [text, setText] = useState(initial.text);
  const [clock, setClock] = useState(initial.clock);
  const [editing, setEditing] = useState(!initial.text.trim());
  const [now, setNow] = useState(() => Date.now());
  useBoardFonts(win);

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
          {left !== null && (
            <div className="sp-left">
              ช่วงนี้เหลือ <span className="sp-num">{formatClock(left)}</span>
            </div>
          )}
        </div>
        <div className="sp-actions">
          {!editing && (
            <button type="button" className={`sp-btn ${running ? "" : "sp-btn--go"}`} onClick={toggle} title="Space">
              {running ? "พัก" : elapsed > 0 ? "ต่อ" : "เริ่ม"}
            </button>
          )}
          {!editing && elapsed > 0 && (
            <button type="button" className="sp-btn" onClick={() => setClock(STOPPED)} title="เริ่มใหม่ · Reset" aria-label="เริ่มใหม่ · Reset">
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
                <div className="sp-label">
                  ตอนนี้ · <span className="sp-num">{formatClock(steps[current].at)}</span>
                </div>
                {steps[current].keywords.map((word, i) => (
                  <div key={i} className="sp-kw">
                    {word}
                  </div>
                ))}
              </section>
            ) : (
              <p className="sp-hint">
                ช่วงแรกเริ่มตอน <span className="sp-num">{formatClock(steps[0].at)}</span>
              </p>
            )}
            {next && (
              <div className="sp-next">
                ต่อไป <span className="sp-num">{formatClock(next.at)}</span> · <b>{next.keywords.join(", ")}</b>
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
