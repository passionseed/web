"use client";

import { useId, useOptimistic, useState, useTransition, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { checkIn, reflect, setResting } from "@/app/shift/island/actions";
import { REFLECTION_MIN_CHARS } from "@/lib/shift-island/rounds-rules";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, KEYNOTE, REFLECT, TODAY } from "./copy";
import { Field } from "./Field";
import styles from "./island.module.css";
import type { TodayQuest } from "./model";
import type { StuckTarget } from "./StuckSheet";
import { keepDayIntention, useDayIntention } from "./useDayIntention";

interface TodayCardProps {
  /** From shift_quest_island; only "any today" matters, the count is never shown. */
  tapsToday: number;
  resting: boolean;
  /** The quest the day is about (todayQuest): named above the question, opened by the check-in, given the day's lines. */
  quest: TodayQuest | null;
  /**
   * Fired once the database has saved the check-in, just before the quest
   * opens; the page plays the dust puff once the island is in view again.
   */
  onSaved?: () => void;
  /** Opens the stuck sheet, on today's quest when it is the student's own. */
  onStuck: (target: StuckTarget) => void;
  /** Opens today's quest. */
  onOpenQuest: (quest: TodayQuest) => void;
  /**
   * The viewer's quest member uuid (page.memberId): keys the private
   * intention kept on this browser, so a shared device shows it back only to
   * the student who wrote it. null keeps nothing on the device.
   */
  viewerKey?: string | null;
}

/**
 * The daily check-in, made before the work, about the quest the student is
 * on: "what will you do today?" (optional, private), then เช็กอิน แล้วลุยเลย,
 * which flips at once (useOptimistic), reverts if the database refuses, and
 * opens the quest. Back later the same day, the card shows what they meant to
 * do, the way back to the quest, and one line on how it went (the roots). It
 * never grows the tree's stage: only a mentor's approval does. No streaks or
 * heatmaps, ever, and no day count here: the only one is the character
 * sheet's days shown up, which never resets (CHARACTER.days).
 */
export function TodayCard({ tapsToday, resting, quest, onSaved, onStuck, onOpenQuest, viewerKey = null }: TodayCardProps) {
  // Set when the action succeeds, so the flip holds even before the refreshed props arrive.
  const [confirmed, setConfirmed] = useState(false);
  const [tapped, setOptimisticTapped] = useOptimistic(tapsToday > 0 || confirmed, (_current, next: boolean) => next);
  const [isResting, setOptimisticResting] = useOptimistic(resting, (_current, next: boolean) => next);
  const [tapPending, startTap] = useTransition();
  const [restPending, startRest] = useTransition();
  const intentionId = useId();
  const [intention, setIntention] = useState("");
  const intended = useDayIntention(viewerKey);
  const instanceId = quest?.instanceId ?? null;
  // A quest the student has not started has no instance: their help request is a general one.
  const stuckTarget: StuckTarget = { instanceId, title: instanceId ? (quest?.title ?? null) : null };

  function tap() {
    if (tapped || tapPending) return;
    const text = intention.trim();
    startTap(async () => {
      setOptimisticTapped(true);
      const result = await checkIn({ intention: text || null, instanceId });
      if (result.ok) {
        setConfirmed(true);
        if (text) keepDayIntention(text, viewerKey);
        setIntention("");
        onSaved?.();
        // Checked in: straight to the work.
        if (quest) onOpenQuest(quest);
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
        <DayLine instanceId={instanceId} />
      </section>
    );
  }

  const about = quest?.mode === "next" ? TODAY.about(quest.title) : quest?.mode === "waiting" ? KEYNOTE.waiting(quest.title) : null;

  if (!tapped) {
    return (
      <section className={`ei-card ei-card--static ${styles.card} ${styles.today}`} aria-label={TODAY.heading}>
        {about ? <p className={styles.hint}>{about}</p> : null}
        <Field
          id={intentionId}
          label={TODAY.ask}
          hint={TODAY.askHint}
          value={intention}
          max={TEXT_LIMITS.intention}
          rows={2}
          onChange={setIntention}
        />
        <div className={styles.todayQuiet}>
          <button type="button" className={`ei-button-dawn ${styles.primary} ${styles.tapButton}`} onClick={tap} aria-busy={tapPending}>
            {quest ? TODAY.go : TODAY.tap}
          </button>
          <button type="button" className={`${styles.quietButton} ${styles.tapButton}`} onClick={() => onStuck(stuckTarget)}>
            {TODAY.stuck}
          </button>
        </div>
        <button type="button" className={styles.linkButton} onClick={() => rest(true)} disabled={restPending}>
          {TODAY.rest}
        </button>
      </section>
    );
  }

  return (
    <section className={`ei-card ei-card--static ${styles.card} ${styles.today}`} aria-label={TODAY.heading}>
      <p className={styles.todayDoneLine} role="status">
        {TODAY.tapped}
      </p>
      {intended ? <p className={styles.hint}>{TODAY.intended(intended)}</p> : null}
      {quest ? (
        <button type="button" className={`ei-button-dawn ${styles.primary}`} onClick={() => onOpenQuest(quest)}>
          <span>{KEYNOTE[quest.mode](quest.title)}</span>
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}
      <DayLine instanceId={instanceId} />
      <div className={styles.todayQuiet}>
        <button type="button" className={styles.quietButton} onClick={() => onStuck(stuckTarget)}>
          {TODAY.stuck}
        </button>
        <button type="button" className={styles.quietButton} onClick={() => rest(true)} disabled={restPending}>
          {TODAY.rest}
        </button>
      </div>
    </section>
  );
}

/**
 * One private line after the work: how it went and what the student learned,
 * filed under their quest. Long enough, it counts toward the tree's roots (at
 * most REFLECTIONS_PER_DAY a day, by the journal's own rules).
 */
function DayLine({ instanceId }: { instanceId: string | null }) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const line = text.trim();
    const length = Array.from(line).length;
    if (length < REFLECTION_MIN_CHARS) return setError(TODAY.lineTooShort);
    if (length > TEXT_LIMITS.learned) return setError(DETAIL.errors.tooLong(TEXT_LIMITS.learned));
    setError(null);
    startTransition(async () => {
      const result = await reflect({ learned: line, instanceId });
      if (result.ok) {
        setSaved(true);
        setText("");
      } else {
        setError(result.error || COMMON.failed);
      }
    });
  }

  if (saved) {
    return (
      <div className={styles.todayDone} role="status">
        <p>{TODAY.lineSaved}</p>
        <p className={styles.hint}>{REFLECT.private}</p>
        <button type="button" className={styles.linkButton} onClick={() => setSaved(false)}>
          {TODAY.lineAgain}
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Field
        id={id}
        label={TODAY.lineLabel}
        hint={TODAY.lineHint}
        value={text}
        max={TEXT_LIMITS.learned}
        error={error ?? undefined}
        rows={2}
        onChange={(value) => {
          setText(value);
          if (error) setError(null);
        }}
      />
      <button type="submit" className={styles.quietButton} disabled={pending} aria-busy={pending}>
        {pending ? COMMON.saving : TODAY.lineSave}
      </button>
    </form>
  );
}
