"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { LESSON_ANSWER_MAX, type LessonStop } from "@/lib/elemental/web/lessons";

import { LEARN_COPY } from "./copy";
import styles from "./learn.module.css";

const STOP_LABEL: Record<LessonStop["kind"], string> = {
  question: LEARN_COPY.stopQuestion,
  choice: LEARN_COPY.stopChoice,
  do_it_now: LEARN_COPY.stopDoItNow,
};

export interface StopFormProps {
  stop: LessonStop;
  /** The answer saved before, if any: the form opens with it. */
  saved: string | null;
  pending: boolean;
  /** A message under the field (the save failed). Never quotes what matched. */
  error: string | null;
  onSubmit: (answer: string) => void;
}

/** One stop's form: a written answer, a pick from a list, or a do-it-now note. */
export function StopForm({ stop, saved, pending, error, onSubmit }: StopFormProps) {
  const [value, setValue] = useState(saved ?? "");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const promptId = `${id}-prompt`;
  const errorId = `${id}-error`;

  // A failed save re-opens the form on the field.
  useEffect(() => {
    if (!error) return;
    (fieldRef.current ?? firstOptionRef.current)?.focus();
  }, [error]);

  const trimmed = value.trim();
  const tooLong = Array.from(trimmed).length > LESSON_ANSWER_MAX;
  const canSave = !pending && trimmed.length > 0 && !tooLong;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSave) onSubmit(trimmed);
  }

  return (
    <form className={styles.stop} onSubmit={submit} noValidate data-kind={stop.kind}>
      <p className={styles.stopLabel}>{STOP_LABEL[stop.kind]}</p>
      {stop.kind === "choice" ? (
        <fieldset className={styles.choices} aria-describedby={error ? errorId : undefined}>
          <legend id={promptId} className={styles.prompt}>
            {stop.prompt}
          </legend>
          {stop.options.map((option, i) => (
            <label key={option.id} className={styles.choice}>
              <input
                ref={i === 0 ? firstOptionRef : undefined}
                type="radio"
                name={`${id}-choice`}
                value={option.id}
                checked={value === option.id}
                onChange={() => setValue(option.id)}
                disabled={pending}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <label id={promptId} htmlFor={`${id}-answer`} className={styles.prompt}>
            {stop.prompt}
          </label>
          {stop.kind === "do_it_now" ? <p className={styles.hint}>{LEARN_COPY.doItNowHint}</p> : null}
          <textarea
            ref={fieldRef}
            id={`${id}-answer`}
            name="answer"
            className={styles.textarea}
            rows={4}
            maxLength={LESSON_ANSWER_MAX}
            placeholder={stop.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <p className={styles.count} aria-hidden="true">
            {LEARN_COPY.charCount(Array.from(value).length, LESSON_ANSWER_MAX)}
          </p>
        </>
      )}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={styles.button} disabled={!canSave} aria-busy={pending}>
        {pending ? <Loader2 className={styles.spin} aria-hidden="true" /> : null}
        <span>{pending ? LEARN_COPY.saving : saved !== null ? LEARN_COPY.saveAgain : LEARN_COPY.save}</span>
      </button>
    </form>
  );
}
