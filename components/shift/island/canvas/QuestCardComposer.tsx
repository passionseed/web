"use client";

import { useId, useMemo, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { submitQuestCard } from "@/app/shift/island/actions";
import {
  CANVAS_RELOAD_CODES,
  CARD_LIMITS,
  type PickableNote,
  type QuestCanvasContext,
  type QuestCardTarget,
} from "@/lib/shift-island/quest-canvas";
import { buildSnapshot, pickNotes } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { SHIFT_CARD_KINDS, SHIFT_CARDS, zoneTitle } from "@/lib/whiteboard/shift-cards";

import { useDraft } from "../drafts";
import { refKey } from "../model";
import { COMPOSER } from "./copy";
import { QuestCardPreview } from "./QuestCardPreview";
import styles from "./canvas.module.css";

export interface QuestCardComposerProps {
  target: QuestCardTarget;
  context: Extract<QuestCanvasContext, { state: "ready" }>;
  /** Re-read the canvas (after notes_changed and the other canvas refusals). */
  onReload: () => void;
  onSubmitted: () => void;
  onCancel: () => void;
  /** Optional: switch to the plain SubmitForm ("เขียนเองแทน"). */
  onWriteInstead?: () => void;
}

interface CardDraft {
  ids: string[];
  line: string;
  link: string;
}

const EMPTY: CardDraft = { ids: [], line: "", link: "" };

function isHttpsUrl(value: string): boolean {
  if (!/^https:\/\/\S+$/.test(value) || Array.from(value).length > CARD_LIMITS.link) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

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

/**
 * The quest card: tick notes from the linked canvas (the zones this quest
 * uses), add one optional line and link, and see the exact card the mentor
 * will read. The server re-reads the canvas, checks each note and stores the
 * text, so it cannot change after review. The text is never edited here.
 */
export function QuestCardComposer({ target, context, onReload, onSubmitted, onCancel, onWriteInstead }: QuestCardComposerProps) {
  const ids = { line: useId(), link: useId(), privacy: useId() };
  const [draft, setDraft, clearDraft] = useDraft<CardDraft>(`card:${refKey(target.ref)}`, EMPTY);
  const [linkError, setLinkError] = useState(false);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(context.notes.map((n) => [n.id, n])), [context.notes]);
  // Ticks for notes that are gone since (a reload) drop out.
  const ticked = draft.ids.filter((id) => byId.has(id));
  // Cheap (a canvas holds tens of notes): the same pure function the server stores with.
  const chosen = pickNotes(context.notes, ticked);
  const snapshot = buildSnapshot(context.canvas.title, chosen);
  const groups = useMemo(() => groupsOf(context.notes), [context.notes]);
  const full = ticked.length >= CARD_LIMITS.notes;
  const reflectionLabel = target.reflectionPrompt.trim() || COMPOSER.lineFallback;

  function toggle(id: string, on: boolean) {
    setDraft((current) => {
      const live = current.ids.filter((x) => byId.has(x));
      if (on) return live.includes(id) || live.length >= CARD_LIMITS.notes ? { ...current, ids: live } : { ...current, ids: [...live, id] };
      return { ...current, ids: live.filter((x) => x !== id) };
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || chosen.length === 0) return;
    const link = draft.link.trim();
    if (link && !isHttpsUrl(link)) {
      setLinkError(true);
      return;
    }
    const line = draft.line.trim();
    startTransition(async () => {
      const result = await submitQuestCard({
        ref: target.ref,
        slug: target.slug,
        version: target.version,
        notes: chosen.map((n) => ({ id: n.id, hash: n.hash })),
        line: line || null,
        link: link || null,
      });
      if (result.ok) {
        toast.success(COMPOSER.sent);
        clearDraft();
        onSubmitted();
        return;
      }
      toast.error(result.error || COMPOSER.failed);
      if (CANVAS_RELOAD_CODES.has(result.code)) onReload();
    });
  }

  return (
    <form className={styles.composer} onSubmit={onSubmit} noValidate aria-describedby={ids.privacy}>
      <div className={styles.composerHead}>
        <h3 className={styles.heading}>{COMPOSER.heading}</h3>
        <p className={styles.sub}>{COMPOSER.pick}</p>
      </div>
      <p id={ids.privacy} className={styles.privacy}>
        {COMPOSER.privacy}
      </p>

      {context.notes.length === 0 ? <p className={styles.quiet}>{COMPOSER.noNotes}</p> : null}

      {groups.map((group) => (
        <fieldset key={group.key} className={styles.zone}>
          <legend className={styles.zoneTitle}>{group.title}</legend>
          <ul className={styles.notes}>
            {group.notes.map((note) => (
              <NoteSticky
                key={note.id}
                note={note}
                checked={ticked.includes(note.id)}
                disabled={pending || (full && !ticked.includes(note.id))}
                onToggle={toggle}
              />
            ))}
          </ul>
        </fieldset>
      ))}

      <p className={styles.count} aria-live="polite">
        {COMPOSER.picked(ticked.length)}
        {full ? <span className={styles.countFull}> {COMPOSER.full}</span> : null}
      </p>

      <div className={styles.field}>
        <label htmlFor={ids.line} className={styles.label}>
          {reflectionLabel}
        </label>
        <textarea
          id={ids.line}
          rows={2}
          className={`ei-input ${styles.input}`}
          placeholder={COMPOSER.linePlaceholder}
          value={draft.line}
          maxLength={CARD_LIMITS.line}
          onChange={(event) => setDraft((current) => ({ ...current, line: event.target.value }))}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.link} className={styles.label}>
          {COMPOSER.linkLabel}
        </label>
        <input
          id={ids.link}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
          className={`ei-input ${styles.input}`}
          value={draft.link}
          maxLength={CARD_LIMITS.link}
          aria-invalid={linkError ? true : undefined}
          aria-describedby={linkError ? `${ids.link}-error` : undefined}
          onChange={(event) => {
            setDraft((current) => ({ ...current, link: event.target.value }));
            if (linkError) setLinkError(false);
          }}
        />
        {linkError ? (
          <p id={`${ids.link}-error`} role="alert" className={styles.fieldError}>
            {COMPOSER.linkError}
          </p>
        ) : null}
      </div>

      <QuestCardPreview snapshot={snapshot} empty={chosen.length === 0} />

      {onWriteInstead ? (
        <button type="button" className={styles.textButton} onClick={onWriteInstead}>
          {COMPOSER.writeInstead}
        </button>
      ) : null}

      <div className={styles.bar}>
        <button
          type="submit"
          className={`ei-button-dawn ${styles.primary}`}
          disabled={pending || chosen.length === 0}
          aria-busy={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{pending ? COMPOSER.sending : target.resubmit ? COMPOSER.resubmit : COMPOSER.submit}</span>
        </button>
        <button type="button" className={styles.quietButton} onClick={onCancel} disabled={pending}>
          {COMPOSER.back}
        </button>
      </div>
    </form>
  );
}

interface NoteStickyProps {
  note: PickableNote;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string, on: boolean) => void;
}

/** One note as a whiteboard sticky in its zone's colour, with a 44px checkbox. */
function NoteSticky({ note, checked, disabled, onToggle }: NoteStickyProps) {
  const metaId = useId();
  const reasons = note.history.filter((h) => h.why).slice(0, 2);
  const tags = [
    note.version ? COMPOSER.version(note.version) : null,
    note.editedSinceVersion && note.version ? COMPOSER.editedSince(note.version) : null,
    note.byTeam ? null : COMPOSER.outsider,
  ].filter((t): t is string => !!t);
  return (
    <li
      className={styles.note}
      data-checked={checked ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      style={{ "--sticky": SHIFT_CARDS[note.kind].color } as CSSProperties}
    >
      <label className={styles.noteLabel}>
        <input
          type="checkbox"
          className={styles.check}
          checked={checked}
          disabled={disabled}
          aria-describedby={tags.length || reasons.length || note.pii ? metaId : undefined}
          onChange={(event) => onToggle(note.id, event.target.checked)}
        />
        <span className={styles.noteText}>{note.text}</span>
      </label>
      {tags.length || reasons.length || note.pii ? (
        <div id={metaId} className={styles.noteMeta}>
          {tags.length ? (
            <p className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </p>
          ) : null}
          {reasons.map((h) => (
            <p key={h.v} className={styles.reason}>
              {COMPOSER.why(h.why!)}
            </p>
          ))}
          {note.pii ? (
            <p className={styles.pii} role="note">
              {COMPOSER.pii}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
