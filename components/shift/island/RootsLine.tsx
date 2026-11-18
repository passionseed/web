"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { reflect } from "@/app/shift/island/actions";
import { REFLECTION_MIN_CHARS } from "@/lib/shift-island/rounds-rules";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, REFLECT, TODAY } from "./copy";
import { Field } from "./Field";
import styles from "./island.module.css";

/**
 * One private line after the work: how it went and what the student learned,
 * filed under their quest. Long enough, it counts toward the tree's roots (at
 * most REFLECTIONS_PER_DAY a day, by the journal's own rules).
 */
export function RootsLine({ instanceId }: { instanceId: string | null }) {
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
