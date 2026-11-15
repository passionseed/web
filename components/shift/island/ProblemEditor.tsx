"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { setTeamProblem } from "@/app/shift/island/evidence-actions";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, TEAM_PROBLEM } from "./copy";
import styles from "./island.module.css";
import { HintIcon } from "./QuestSections";

const chars = (value: string) => Array.from(value).length;

/**
 * เปลี่ยน on ปัญหาที่ทีมเลือก (schema 14): any teammate rewrites the line, any
 * time. Changing it is normal: talking to real people sharpens it. Closed,
 * it is one quiet link; open, a textarea with save and cancel. The page
 * refreshes on save, so every place that shows the line shows the new one.
 */
export function ProblemEditor({
  projectId,
  current,
  onSaved,
}: {
  projectId: string;
  current: string;
  onSaved?: (ambition: string) => void;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className={`${styles.quietButton} ${styles.contextAction}`}
        onClick={() => {
          setText(current);
          setError(null);
          setOpen(true);
        }}
      >
        <HintIcon name="note" size={16} />
        <span>{TEAM_PROBLEM.change}</span>
      </button>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const line = text.trim();
    if (!line) return setError(TEAM_PROBLEM.required);
    if (chars(line) > TEXT_LIMITS.ambition) return setError(DETAIL.errors.tooLong(TEXT_LIMITS.ambition));
    startTransition(async () => {
      const result = await setTeamProblem({ projectId, ambition: line });
      if (result.ok) {
        toast.success(TEAM_PROBLEM.saved);
        setOpen(false);
        onSaved?.(result.data.ambition);
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor={fieldId} className={styles.label}>
          {TEAM_PROBLEM.editLabel}
        </label>
        <p id={`${fieldId}-hint`} className={styles.hint}>
          {TEAM_PROBLEM.editHint}
        </p>
        <textarea
          id={fieldId}
          rows={3}
          className={`ei-input ${styles.input} ${styles.textarea}`}
          value={text}
          maxLength={TEXT_LIMITS.ambition}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-hint ${fieldId}-error` : `${fieldId}-hint`}
          onChange={(event) => {
            setText(event.target.value);
            if (error) setError(null);
          }}
        />
        {error ? (
          <p id={`${fieldId}-error`} role="alert" className={styles.fieldError}>
            {error}
          </p>
        ) : null}
      </div>
      <div className={styles.problemActions}>
        <button type="submit" className={`ei-button-dawn ${styles.primary}`} disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{pending ? TEAM_PROBLEM.saving : TEAM_PROBLEM.save}</span>
        </button>
        <button type="button" className={styles.quietButton} onClick={() => setOpen(false)} disabled={pending}>
          {TEAM_PROBLEM.cancel}
        </button>
      </div>
    </form>
  );
}
