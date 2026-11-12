"use client";

/**
 * Shared chrome for the guide's mini-games (U2), in the PassionSeed pixel
 * game-story style: a pixel-bordered panel with a HUD (game tag, score
 * counter, optional timer), a feedback line, and a CLEAR stamp.
 *
 * Conventions every engine follows:
 * - Tap first. "Drag" is always tap an item, then tap a target. Targets are
 *   at least 48px. No edge swipes.
 * - `data-demo` ids are `${blockId}.${part}` (demoId), so a demoScript can
 *   target one engine on a page with several. Each engine lists its parts in
 *   its file header and in index.ts ENGINE_DEMO_PARTS.
 * - `onResult` fires once, at completion. On "ข้ามเกม ดูเฉลย" (`skipped`) the
 *   engine renders the solved state and reports { done: true, skipped: true }
 *   once if it has not finished; it fires no tracker events for a skip (the
 *   shell fires `<pageKey>:skip`).
 * - Engines fire `interactive_tap` with `track.done` on completion and their
 *   own `track.milestones` (engine-defined names) along the way.
 * - `reducedMotion`: counters show final values, no shake, nothing falls in,
 *   chat messages appear all at once. CSS also honours the media query.
 * - Timers are optional and never fail anything; "ไม่จับเวลา" turns them off.
 */
import "./games.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { EngineId, EngineProps, GameResult } from "@/lib/radar-guide/guide-types";

export const SKIP_LABEL_TH = "ข้ามเกม ดูเฉลย";
export const NO_TIMER_TH = "ไม่จับเวลา";
export const SIMULATED_TH = "จำลอง";

/** `data-demo` id for one part of one engine block. */
export function demoId(blockId: string, part: string): string {
  return `${blockId}.${part}`;
}

type OutcomeProps = Pick<EngineProps<EngineId>, "pageKey" | "track" | "tracker" | "onResult" | "skipped">;

export interface GameOutcome {
  /** True once the engine reported its result (played or skipped). */
  reported: boolean;
  /** Reports completion once: onResult + the `track.done` event (with `value` unless track.value is "none"). */
  finish(result: GameResult, value?: number): void;
  /** Fires a milestone by engine-defined name, when the content maps it to a target. */
  milestone(name: string, value?: number): void;
  /** Milliseconds since the engine mounted. */
  elapsed(): number;
}

export function useGameOutcome({ pageKey, track, tracker, onResult, skipped }: OutcomeProps): GameOutcome {
  const reportedRef = useRef(false);
  const [reported, setReported] = useState(false);
  const startRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (skipped && !reportedRef.current) {
      reportedRef.current = true;
      setReported(true);
      onResultRef.current({ done: true, skipped: true });
    }
  }, [skipped]);

  const finish = useCallback(
    (result: GameResult, value?: number) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setReported(true);
      onResultRef.current(result);
      tracker.track({
        type: "interactive_tap",
        pageKey,
        target: track.done,
        ...(track.value !== "none" && value !== undefined ? { valueInt: value } : {}),
      });
    },
    [tracker, pageKey, track]
  );

  const milestone = useCallback(
    (name: string, value?: number) => {
      const target = track.milestones?.[name];
      if (!target) return;
      tracker.track({ type: "interactive_tap", pageKey, target, ...(value !== undefined ? { valueInt: value } : {}) });
    },
    [tracker, pageKey, track]
  );

  const elapsed = useCallback(() => (startRef.current === null ? 0 : Date.now() - startRef.current), []);
  return { reported, finish, milestone, elapsed };
}

/** Counts 0 -> `to` while `active`; reduced motion (or inactive) shows the final value at once. */
export function useCountUp(to: number, active: boolean, reducedMotion: boolean, durationMs = 1200): number {
  const [value, setValue] = useState(active && reducedMotion ? to : 0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reducedMotion || typeof requestAnimationFrame === "undefined") {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Stepped easing reads as a pixel counter rolling.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, active, reducedMotion, durationMs]);
  return active && reducedMotion ? to : value;
}

/** Optional soft timer: counts down while `running` and enabled; nothing happens at zero. */
export function useGameTimer(seconds: number | undefined, running: boolean) {
  const [enabled, setEnabled] = useState(Boolean(seconds));
  const [left, setLeft] = useState(seconds ?? 0);
  useEffect(() => {
    if (!seconds || !enabled || !running) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds, enabled, running]);
  return { enabled, left, toggle: () => setEnabled((e) => !e) };
}

// ---------------------------------------------------------------- pieces

export function SimBadge({ text = SIMULATED_TH }: { text?: string }) {
  return <span className="rg-game__sim">{text}</span>;
}

export function ScoreHud({ label = "SCORE", value, total }: { label?: string; value: number; total?: number }) {
  return (
    <span className="rg-game__score" aria-label={`คะแนน ${value}${total !== undefined ? ` จาก ${total}` : ""}`}>
      <span className="rg-game__score-label" aria-hidden>
        {label}
      </span>
      <span className="rg-game__score-num" aria-hidden>
        {value}
        {total !== undefined ? `/${total}` : ""}
      </span>
    </span>
  );
}

export function GameTimerBar({
  seconds,
  labelTh,
  left,
  enabled,
  onToggle,
  blockId,
}: {
  seconds: number;
  labelTh: string;
  left: number;
  enabled: boolean;
  onToggle(): void;
  blockId: string;
}) {
  const pct = seconds > 0 ? Math.round((left / seconds) * 100) : 0;
  return (
    <div className="rg-game__timer" data-off={enabled ? undefined : ""}>
      {enabled ? (
        <>
          <span className="rg-game__timer-label">{labelTh}</span>
          <span
            className="rg-game__timer-track"
            role="progressbar"
            aria-label={labelTh}
            aria-valuemin={0}
            aria-valuemax={seconds}
            aria-valuenow={left}
          >
            <span className="rg-game__timer-fill" style={{ width: `${pct}%` }} />
          </span>
        </>
      ) : null}
      <button
        type="button"
        className="rg-game__timer-toggle"
        aria-pressed={!enabled}
        onClick={onToggle}
        data-demo={demoId(blockId, "timer")}
      >
        {NO_TIMER_TH}
      </button>
    </div>
  );
}

export type FeedbackTone = "good" | "bad" | "near" | "info";

/** One polite live region per engine. `shakeKey` changes retrigger the shake (off in reduced motion). */
export function Feedback({
  tone,
  children,
  shakeKey,
  reducedMotion,
}: {
  tone: FeedbackTone;
  children: ReactNode;
  shakeKey?: number | string;
  reducedMotion: boolean;
}) {
  return (
    <p
      key={reducedMotion ? undefined : shakeKey}
      className="rg-game__feedback"
      data-tone={tone}
      data-shake={!reducedMotion && tone === "bad" ? "" : undefined}
      role="status"
      aria-live="polite"
    >
      {children}
    </p>
  );
}

/** "ข้ามเกม ดูเฉลย". The shell owns placement and fires `<pageKey>:skip`; exported for it. */
export function GameSkipLink({ onSkip, disabled, blockId }: { onSkip(): void; disabled?: boolean; blockId?: string }) {
  return (
    <button
      type="button"
      className="rg-game__skip"
      onClick={onSkip}
      disabled={disabled}
      data-demo={blockId ? demoId(blockId, "skip") : "skip"}
    >
      {SKIP_LABEL_TH}
    </button>
  );
}

export type FrameStatus = "play" | "clear" | "solved";

export interface EngineFrameProps {
  engine: EngineId;
  blockId: string;
  /** Short HUD tag, e.g. "หาบรรทัดอันตราย". */
  tagTh: string;
  status: FrameStatus;
  reducedMotion: boolean;
  hud?: ReactNode;
  timer?: ReactNode;
  /** Shows the "จำลอง" badge (and an optional watermark line). */
  simulated?: boolean;
  watermarkTh?: string;
  children: ReactNode;
}

export function EngineFrame({
  engine,
  blockId,
  tagTh,
  status,
  reducedMotion,
  hud,
  timer,
  simulated,
  watermarkTh,
  children,
}: EngineFrameProps) {
  return (
    <section
      className="rg-game"
      data-engine={engine}
      data-status={status}
      data-still={reducedMotion ? "" : undefined}
      data-demo={demoId(blockId, "frame")}
      aria-label={tagTh}
    >
      <header className="rg-game__hud">
        <span className="rg-game__tag">
          <span className="rg-game__tag-dot" aria-hidden />
          {tagTh}
        </span>
        {simulated ? <SimBadge /> : null}
        <span className="rg-game__hud-spacer" />
        {hud}
      </header>
      {timer}
      <div className="rg-game__body">{children}</div>
      {watermarkTh ? (
        <p className="rg-game__watermark" aria-hidden>
          {watermarkTh}
        </p>
      ) : null}
      {status !== "play" ? (
        <div className="rg-game__stamp" data-kind={status} role="status">
          {status === "clear" ? "CLEAR!" : "เฉลย"}
        </div>
      ) : null}
    </section>
  );
}
