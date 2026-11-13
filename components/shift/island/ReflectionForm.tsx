"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { reflect } from "@/app/shift/island/actions";
import { REFLECTION_MIN_CHARS } from "@/lib/shift-island/rounds-rules";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, REFLECT } from "./copy";
import styles from "./island.module.css";
import { Field } from "./SubmitForm";

/** A private journal entry. Saving does not send a help request. */
export function ReflectionForm() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [learned, setLearned] = useState("");
  const [stuck, setStuck] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ stuck: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const text = learned.trim();
    const blocker = stuck.trim();
    if (Array.from(text).length < REFLECTION_MIN_CHARS) return setError(REFLECT.tooShort);
    if (Array.from(text).length > TEXT_LIMITS.learned || Array.from(blocker).length > TEXT_LIMITS.stuck) {
      return setError(DETAIL.errors.tooLong(TEXT_LIMITS.learned));
    }
    setError(null);
    startTransition(async () => {
      const result = await reflect({ learned: text, stuck: blocker || null });
      if (result.ok) {
        setSaved({ stuck: !!blocker });
        setLearned("");
        setStuck("");
      } else setError(result.error || COMMON.failed);
    });
  }

  return (
    <div>
      <button
        type="button"
        className={styles.linkButton}
        aria-expanded={open}
        aria-controls={`${id}-form`}
        onClick={() => setOpen(!open)}
      >
        {REFLECT.entry}
      </button>
      {open ? (
        <div id={`${id}-form`}>
          {saved ? (
            <div role="status">
              <p>{REFLECT.saved}</p>
              <p className={styles.hint}>{REFLECT.private}</p>
              {saved.stuck ? <p className={styles.hint}>{REFLECT.discordHelp}</p> : null}
              <button type="button" className={styles.quietButton} onClick={() => setSaved(null)}>
                {REFLECT.again}
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={submit} noValidate>
              <Field
                id={`${id}-learned`}
                label={REFLECT.learned}
                hint={REFLECT.learnedHint}
                value={learned}
                max={TEXT_LIMITS.learned}
                rows={3}
                onChange={setLearned}
              />
              <Field
                id={`${id}-stuck`}
                label={REFLECT.stuck}
                hint={REFLECT.stuckHint}
                value={stuck}
                max={TEXT_LIMITS.stuck}
                rows={2}
                onChange={setStuck}
              />
              {error ? <p role="alert" className={styles.fieldError}>{error}</p> : null}
              <button type="submit" className={styles.quietButton} disabled={pending} aria-busy={pending}>
                {pending ? COMMON.saving : REFLECT.save}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
