"use client";

import { useId, useMemo, type CSSProperties } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { CANVAS_ROUTE } from "@/lib/shift-island/canvas-link";
import type { PickableNote } from "@/lib/shift-island/quest-canvas";
import { SHIFT_CARD_KINDS, SHIFT_CARDS, zoneTitle } from "@/lib/whiteboard/shift-cards";

import { DoneWhenLine } from "../DoneWhenLine";
import { PALETTE, iconGrid } from "../sprites";
import { COMPOSER, SUBMIT } from "./copy";
import styles from "./canvas.module.css";

/** Notes grouped by zone, in the whiteboard's zone order (daily cells by day). */
function groupsOf(notes: PickableNote[]): { key: string; title: string; notes: PickableNote[] }[] {
  const groups = new Map<string, { key: string; title: string; order: number; notes: PickableNote[] }>();
  for (const note of notes) {
    const key = `${note.kind}:${note.day ?? 0}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        title: zoneTitle(note.kind, note.day ?? undefined),
        order: SHIFT_CARD_KINDS.indexOf(note.kind) * 100 + (note.day ?? 0),
        notes: [],
      };
      groups.set(key, group);
    }
    group.notes.push(note);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

interface CardPickStepProps {
  notes: PickableNote[];
  ticked: string[];
  /** The card holds the most notes it can: only ticked ones can change. */
  full: boolean;
  /** Sending: nothing changes until it is back. */
  locked: boolean;
  /** What the mentor looks for (เสร็จเมื่อ), compact above the notes. */
  doneWhen: string[];
  onToggle: (id: string, on: boolean) => void;
}

/**
 * Step 1, เลือกหลักฐาน: the canvas notes as stickies by zone; tapping a
 * sticky anywhere ticks it. One "เปิดแคนวาส" under the list for anything that
 * needs changing on the whiteboard (a new tab, so the ticks stay).
 */
export function CardPickStep({ notes, ticked, full, locked, doneWhen, onToggle }: CardPickStepProps) {
  const groups = useMemo(() => groupsOf(notes), [notes]);
  return (
    <div className={styles.step}>
      <StepHead index={0} hint={SUBMIT.pickHint} />
      <DoneWhenLine items={doneWhen} />

      {notes.length === 0 ? <p className={styles.quiet}>{COMPOSER.noNotes}</p> : null}

      {groups.map((group) => (
        <fieldset key={group.key} className={styles.zone}>
          <legend className={styles.zoneTitle}>{group.title}</legend>
          <ul className={styles.notes}>
            {group.notes.map((note) => {
              const checked = ticked.includes(note.id);
              return (
                <NoteSticky
                  key={note.id}
                  note={note}
                  checked={checked}
                  // A note by someone outside the canvas team is shown, never sent as the student's evidence.
                  disabled={locked || !note.byTeam || (full && !checked)}
                  onToggle={onToggle}
                />
              );
            })}
          </ul>
        </fieldset>
      ))}

      {full ? (
        <p className={styles.warn} role="status">
          {COMPOSER.full}
        </p>
      ) : null}

      <a className={styles.openCanvas} href={CANVAS_ROUTE} target="_blank" rel="noopener">
        {SUBMIT.openCanvas}
      </a>
    </div>
  );
}

/** A step's heading ("เลือกหลักฐาน" 1/2) and its one line. */
export function StepHead({ index, hint }: { index: number; hint: string }) {
  return (
    <div className={styles.stepHead}>
      <h3 className={styles.heading}>
        {SUBMIT.steps[index]}
        <span className={styles.stepCount} aria-hidden="true">
          {`${index + 1}/${SUBMIT.steps.length}`}
        </span>
      </h3>
      <p className={styles.sub}>{hint}</p>
    </div>
  );
}

interface NoteStickyProps {
  note: PickableNote;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string, on: boolean) => void;
}

const CHECK = iconGrid("check");

/**
 * One note as a whiteboard sticky in its zone's colour. The whole sticky is
 * the checkbox's label; the native box is visually hidden and a pixel check
 * badge in the corner shows the state.
 */
function NoteSticky({ note, checked, disabled, onToggle }: NoteStickyProps) {
  const textId = useId();
  const metaId = useId();
  const reasons = note.history.filter((h) => h.why).slice(0, 2);
  const tags = [
    note.version ? COMPOSER.version(note.version) : null,
    note.editedSinceVersion && note.version ? COMPOSER.editedSince(note.version) : null,
    note.byTeam ? null : COMPOSER.outsider,
  ].filter((t): t is string => !!t);
  // Someone else's note cannot be sent, so it needs no privacy warning of its own.
  const pii = note.pii && note.byTeam;
  const meta = tags.length > 0 || reasons.length > 0 || pii;
  return (
    <li
      className={styles.note}
      data-checked={checked ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      data-outsider={note.byTeam ? undefined : "true"}
      style={{ "--sticky": SHIFT_CARDS[note.kind].color } as CSSProperties}
    >
      <label className={styles.noteLabel}>
        <input
          type="checkbox"
          className={styles.check}
          checked={checked}
          disabled={disabled}
          aria-labelledby={textId}
          aria-describedby={meta ? metaId : undefined}
          onChange={(event) => onToggle(note.id, event.target.checked)}
        />
        <span className={styles.badge} aria-hidden="true">
          {checked ? <PixelIcon grid={CHECK} palette={PALETTE} scale={1} className={styles.badgeIcon} /> : null}
        </span>
        <span id={textId} className={styles.noteText}>
          {note.text}
        </span>
        {meta ? (
          <span id={metaId} className={styles.noteMeta}>
            {tags.length ? (
              <span className={styles.tags}>
                {tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
            {reasons.map((h) => (
              <span key={h.v} className={styles.reason}>
                {COMPOSER.why(h.why!)}
              </span>
            ))}
            {pii ? <span className={styles.pii}>{COMPOSER.pii}</span> : null}
          </span>
        ) : null}
      </label>
    </li>
  );
}
