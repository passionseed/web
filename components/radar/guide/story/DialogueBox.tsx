"use client";

/**
 * A story beat as RPG dialogue boxes: typewriter text, tap to finish the line,
 * tap again for the next box (about two lines each, never a paragraph). The
 * host speaks next to its pixel NPC; the player's lines sit on the right; system
 * notes (honesty, updates) are a plain terminal-style box.
 *
 * Screen readers get each box whole through a polite live region; the typed
 * characters are hidden from them. Reduced motion shows every box complete.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DialogueSpeaker } from "@/lib/radar-guide/guide-types";
import type { HostMood } from "@/lib/radar-guide/story";
import { GuideNPC } from "./GuideNPC";
import { DIALOGUE_START, dialogueTap, graphemes, speakerName, toBoxes, typedCount, TYPE_MS, type DialogueCursor } from "./story-logic";
import "./story.css";

export interface DialogueBoxProps {
  speaker: DialogueSpeaker;
  mood?: HostMood;
  /** One entry per box; long entries are split at spaces (DIALOGUE_BOX_MAX_CHARS). */
  lines: readonly string[];
  reducedMotion?: boolean;
  /** Draw the host NPC beside host lines (default true). */
  showNPC?: boolean;
  /** Fires once, when the last box is dismissed. */
  onDone?(): void;
  onBoxChange?(index: number): void;
  /**
   * Bump to tap the box from outside (the level's sticky "ต่อ"): finishes the
   * line, or opens the next box. Only a change after mount counts.
   */
  advanceSignal?: number;
  /**
   * Fire onDone as soon as the last box is fully shown, without the extra tap
   * on "■". The level shell uses it so its "ต่อ" moves on in one press.
   */
  doneWhenRead?: boolean;
  /**
   * Already read (a cleared level revisited): open on the last box, fully
   * typed, so a re-read never restarts the conversation.
   */
  startRead?: boolean;
  className?: string;
}

export function DialogueBox({
  speaker,
  mood,
  lines,
  reducedMotion = false,
  showNPC = true,
  onDone,
  onBoxChange,
  advanceSignal,
  doneWhenRead = false,
  startRead = false,
  className,
}: DialogueBoxProps) {
  const boxes = useMemo(() => toBoxes(lines), [lines]);
  const [cursor, setCursor] = useState<DialogueCursor>(() =>
    startRead
      ? { ...DIALOGUE_START, index: Math.max(0, boxes.length - 1), complete: true }
      : { ...DIALOGUE_START, complete: reducedMotion }
  );
  // Typed characters, keyed by box so a new box never flashes the old count.
  const [typedState, setTypedState] = useState({ index: 0, n: 0 });
  const doneFired = useRef(false);

  const text = boxes[cursor.index] ?? "";
  const chars = useMemo(() => graphemes(text), [text]);
  const typed = typedState.index === cursor.index ? typedState.n : 0;
  const complete = cursor.complete || reducedMotion || typed >= chars.length;

  // Typewriter clock for the box on screen.
  useEffect(() => {
    if (cursor.complete || reducedMotion) return;
    const started = performance.now();
    const index = cursor.index;
    const id = window.setInterval(() => {
      const n = typedCount(chars.length, performance.now() - started);
      setTypedState({ index, n });
      if (n >= chars.length) {
        window.clearInterval(id);
        setCursor((c) => (c.complete ? c : { ...c, complete: true }));
      }
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [cursor.index, cursor.complete, chars.length, reducedMotion]);

  useEffect(() => {
    onBoxChange?.(cursor.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.index]);

  const read = doneWhenRead && complete && cursor.index >= boxes.length - 1;
  useEffect(() => {
    if ((cursor.done || read) && !doneFired.current) {
      doneFired.current = true;
      onDone?.();
    }
  }, [cursor.done, read, onDone]);

  const tap = useCallback(() => {
    setCursor((c) => dialogueTap({ ...c, complete: c.complete || complete }, boxes.length, reducedMotion));
  }, [boxes.length, complete, reducedMotion]);

  // An outside "tap" (the sticky "ต่อ"), ignoring the value it mounted with.
  const tapRef = useRef(tap);
  useEffect(() => {
    tapRef.current = tap;
  }, [tap]);
  const lastSignal = useRef(advanceSignal);
  useEffect(() => {
    if (advanceSignal === undefined || advanceSignal === lastSignal.current) return;
    lastSignal.current = advanceSignal;
    tapRef.current();
  }, [advanceSignal]);

  if (!boxes.length) return null;

  const name = speakerName(speaker);
  const visible = complete ? text : chars.slice(0, typed).join("");
  const more = cursor.index < boxes.length - 1;
  const talking = speaker === "host" && !complete && !cursor.done;

  return (
    <div className={`rgs-dialogue rgs-dialogue--${speaker} ${className ?? ""}`} data-testid="dialogue">
      {speaker === "host" && showNPC ? (
        <GuideNPC mood={mood} talking={talking} reducedMotion={reducedMotion} cell={3} className="rgs-dialogue__npc" />
      ) : null}
      <button
        type="button"
        className="rgs-dialogue__box rgs-pixel-box"
        onClick={tap}
        disabled={cursor.done}
        data-demo="dialogue"
        aria-label={cursor.done ? undefined : complete ? (more ? "อ่านต่อ" : "จบบทพูด") : "แสดงทั้งประโยค"}
      >
        {name ? <span className="rgs-dialogue__name">{name}</span> : null}
        <span className="rgs-dialogue__text" aria-hidden="true">
          {visible}
          {/* Reserves the full box height so the box never grows while typing. */}
          <span className="rgs-dialogue__ghost">{complete ? "" : chars.slice(typed).join("")}</span>
        </span>
        {!cursor.done && complete ? (
          <span className={`rgs-dialogue__next ${more ? "" : "rgs-dialogue__next--end"}`} aria-hidden="true">
            {more ? "▼" : "■"}
          </span>
        ) : null}
        {boxes.length > 1 ? (
          <span className="rgs-dialogue__count" aria-hidden="true">
            {cursor.index + 1}/{boxes.length}
          </span>
        ) : null}
      </button>
      <p className="rgs-sr-only" aria-live="polite">
        {name ? `${name}: ` : ""}
        {text}
      </p>
    </div>
  );
}
