"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { keepIntention } from "@/app/shift/island/actions";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, TODAY } from "./copy";
import { Field } from "./Field";
import styles from "./island.module.css";
import { keepDayIntention, useDayIntention } from "./useDayIntention";

/**
 * What the student means to do today, inside the quest they are on: folded,
 * optional and private (kept on this browser for them, and filed under their
 * own instance). The next-step card's tap is the day's check-in, so nothing
 * here is ever required. Once kept, the fold gives way to one quiet line.
 */
export function DayIntention({ instanceId, viewerKey }: { instanceId: string; viewerKey: string | null }) {
  const kept = useDayIntention(viewerKey);
  const fieldId = useId();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  if (kept) return <p className={styles.hint}>{TODAY.intended(kept)}</p>;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intention = text.trim();
    if (!intention || pending) return;
    startTransition(async () => {
      const result = await keepIntention({ intention, instanceId });
      if (!result.ok) {
        toast.error(result.error || COMMON.failed);
        return;
      }
      keepDayIntention(intention, viewerKey);
      toast.success(DETAIL.intentionSaved);
    });
  }

  return (
    <details className={styles.more}>
      <summary className={styles.moreSummary}>
        <span>{DETAIL.intention}</span>
        <ChevronDown className={styles.moreCaret} aria-hidden="true" />
      </summary>
      <form className={`${styles.moreBody} ${styles.form}`} onSubmit={onSubmit} noValidate>
        <Field id={fieldId} label={TODAY.ask} hint={TODAY.askHint} value={text} max={TEXT_LIMITS.intention} rows={2} onChange={setText} />
        <button type="submit" className={styles.quietButton} disabled={pending || !text.trim()} aria-busy={pending}>
          {DETAIL.intentionSave}
        </button>
      </form>
    </details>
  );
}
