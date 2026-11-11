"use client";

import { useId, useOptimistic, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { checkIn, setResting } from "@/app/shift/island/actions";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, TODAY } from "./copy";
import styles from "./island.module.css";
import { Field } from "./SubmitForm";

interface TodayCardProps {
  /** From shift_quest_island; only "any today" matters, the count is never shown. */
  tapsToday: number;
  resting: boolean;
  /**
   * Fired once the database has saved the check-in (after the card has flipped),
   * so the page can close the sheet and play the dust puff where it can be seen.
   */
  onSaved?: () => void;
  /** Opens the stuck sheet with no quest attached. */
  onStuck: () => void;
}

/**
 * The daily check-in. One tap that flips at once (useOptimistic) and reverts
 * if the database refuses. No streaks or heatmaps, ever, and no day count
 * here: the only one is the character sheet's days shown up, which never
 * resets (CHARACTER.days).
 */
export function TodayCard({ tapsToday, resting, onSaved, onStuck }: TodayCardProps) {
  // Set when the action succeeds, so the flip holds even before the refreshed props arrive.
  const [confirmed, setConfirmed] = useState(false);
  const [tapped, setOptimisticTapped] = useOptimistic(tapsToday > 0 || confirmed, (_current, next: boolean) => next);
  const [isResting, setOptimisticResting] = useOptimistic(resting, (_current, next: boolean) => next);
  const [tapPending, startTap] = useTransition();
  const [restPending, startRest] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);

  function tap() {
    if (tapped || tapPending) return;
    startTap(async () => {
      setOptimisticTapped(true);
      const result = await checkIn();
      if (result.ok) {
        setConfirmed(true);
        onSaved?.();
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  function rest(on: boolean) {
    if (restPending) return;
    startRest(async () => {
      // Waking always flips at once. Resting flips only once something was
      // paused: with nothing in progress the island would snap straight back.
      if (!on) setOptimisticResting(false);
      const result = await setResting({ on });
      if (!result.ok) toast.error(result.error || COMMON.failed);
      else if (!on) toast.success(TODAY.woke);
      else if (result.data.paused > 0) toast.success(TODAY.rested(result.data.paused));
      else toast.info(TODAY.nothingToPause);
    });
  }

  if (isResting) {
    return (
      <section className={`ei-card ei-card--static ${styles.card} ${styles.today}`} aria-label={TODAY.heading}>
        <p className={styles.todayResting}>{TODAY.resting}</p>
        <button type="button" className={`ei-button-dawn ${styles.primary}`} disabled={restPending} onClick={() => rest(false)}>
          <span>{TODAY.wake}</span>
        </button>
      </section>
    );
  }

  return (
    <section className={`ei-card ei-card--static ${styles.card} ${styles.today}`} aria-label={TODAY.heading}>
      {tapped ? (
        <div className={styles.todayDone}>
          <p className={styles.todayDoneLine} role="status">
            {TODAY.tapped}
          </p>
          {noteOpen ? (
            <NoteForm onDone={() => setNoteOpen(false)} />
          ) : (
            <button type="button" className={styles.linkButton} onClick={() => setNoteOpen(true)}>
              {TODAY.addNote} <span className={styles.hintInline}>({TODAY.noteHint})</span>
            </button>
          )}
        </div>
      ) : (
        // Quiet on purpose: the keynote card above is the page's one main call to action.
        <button type="button" className={`${styles.quietButton} ${styles.tapButton}`} onClick={tap} aria-busy={tapPending}>
          {TODAY.tap}
        </button>
      )}
      <div className={styles.todayQuiet}>
        <button type="button" className={styles.quietButton} onClick={onStuck}>
          {TODAY.stuck}
        </button>
        <button type="button" className={styles.quietButton} onClick={() => rest(true)} disabled={restPending}>
          {TODAY.rest}
        </button>
      </div>
    </section>
  );
}

/** A short private note on today's check-in (shift_quest_checkin with a note). */
function NoteForm({ onDone }: { onDone: () => void }) {
  const id = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const text = note.trim();
    if (!text) return setError(TODAY.noteRequired);
    if (text.length > TEXT_LIMITS.note) return setError(DETAIL.errors.tooLong(TEXT_LIMITS.note));
    setError(null);
    startTransition(async () => {
      const result = await checkIn({ note: text });
      if (result.ok) {
        toast.success(TODAY.noteSaved);
        setNote("");
        onDone();
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Field
        id={id}
        label={TODAY.noteLabel}
        value={note}
        max={TEXT_LIMITS.note}
        error={error ?? undefined}
        rows={2}
        onChange={(value) => {
          setNote(value);
          if (error) setError(null);
        }}
      />
      <button type="submit" className={styles.quietButton} disabled={pending} aria-busy={pending}>
        {pending ? COMMON.saving : TODAY.saveNote}
      </button>
    </form>
  );
}
