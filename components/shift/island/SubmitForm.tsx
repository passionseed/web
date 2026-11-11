"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { submitMainQuest, submitProposedQuest, submitSideQuest } from "@/app/shift/island/actions";
import { TEXT_LIMITS, type IslandActionResult, type QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL } from "./copy";
import { useDraft } from "./drafts";
import styles from "./island.module.css";
import { refKey, type QuestView } from "./model";

interface SubmitFormProps {
  quest: QuestView;
  /** ส่งฉบับใหม่ instead of ส่งให้พี่เลี้ยงดู (submitted or clarification). */
  resubmit: boolean;
  onSubmitted: () => void;
  /** One line above the form (quest 5: the checklist is attached by the server). */
  note?: string;
  /** A lower cap for the proof, when the server adds text under it (quest 5's checklist). */
  proofMax?: number;
}

interface Draft {
  proof: string;
  url: string;
  reflection: string;
}

type FieldErrors = Partial<Record<keyof Draft, string>>;

const EMPTY: Draft = { proof: "", url: "", reflection: "" };

/** Same rules as the database (__check_len / __check_url): required text, caps, https only. */
export function validateSubmission(draft: Draft, proofMax: number = TEXT_LIMITS.proof): FieldErrors {
  const errors: FieldErrors = {};
  const proof = draft.proof.trim();
  const reflection = draft.reflection.trim();
  const url = draft.url.trim();
  if (!proof) errors.proof = DETAIL.errors.proofRequired;
  else if (proof.length > proofMax) errors.proof = DETAIL.errors.tooLong(proofMax);
  if (!reflection) errors.reflection = DETAIL.errors.reflectionRequired;
  else if (reflection.length > TEXT_LIMITS.reflection) errors.reflection = DETAIL.errors.tooLong(TEXT_LIMITS.reflection);
  if (url) {
    if (url.length > TEXT_LIMITS.artifactUrl) errors.url = DETAIL.errors.tooLong(TEXT_LIMITS.artifactUrl);
    else if (!isHttpsUrl(url)) errors.url = DETAIL.errors.url;
  }
  return errors;
}

function isHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** One submit call per quest kind. Ids and capped text only; the server derives who is acting. */
function send(quest: QuestView, proof: string, reflection: string, artifactUrl: string | null): Promise<IslandActionResult<QuestSubmitResult>> {
  const ref = quest.ref;
  switch (ref.kind) {
    case "main":
      return submitMainQuest({ milestone: ref.milestone, proof, reflection, artifactUrl });
    case "side":
      return submitSideQuest({ templateId: ref.templateId, proof, reflection, artifactUrl });
    case "proposed":
      return submitProposedQuest({ instanceId: ref.instanceId, version: quest.version ?? 0, proof, reflection, artifactUrl });
  }
}

/** Proof, an optional https link, and one reflection, sent for a mentor's review. */
export function SubmitForm({ quest, resubmit, onSubmitted, note, proofMax = TEXT_LIMITS.proof }: SubmitFormProps) {
  const ids = { proof: useId(), url: useId(), reflection: useId() };
  // Kept per quest across the sheet closing, so a stray swipe never loses the text.
  const [draft, setDraft, clearDraft] = useDraft<Draft>(`submit:${refKey(quest.ref)}`, EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const reflectionLabel = quest.reflectionPrompt.trim() || DETAIL.reflectionFallback;

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found = validateSubmission(draft, proofMax);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const url = draft.url.trim();
    startTransition(async () => {
      const result = await send(quest, draft.proof.trim(), draft.reflection.trim(), url ? url : null);
      if (result.ok) {
        toast.success(DETAIL.sent);
        clearDraft();
        onSubmitted();
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {note ? <p className={styles.hint}>{note}</p> : null}
      <Field
        id={ids.proof}
        label={DETAIL.proofLabel}
        hint={DETAIL.proofHint}
        value={draft.proof}
        max={proofMax}
        error={errors.proof}
        rows={4}
        onChange={(value) => update("proof", value)}
      />
      <div className={styles.field}>
        <label htmlFor={ids.url} className={styles.label}>
          {DETAIL.urlLabel}
        </label>
        <input
          id={ids.url}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
          className={`ei-input ${styles.input}`}
          value={draft.url}
          maxLength={TEXT_LIMITS.artifactUrl}
          aria-invalid={errors.url ? true : undefined}
          aria-describedby={errors.url ? `${ids.url}-error` : undefined}
          onChange={(event) => update("url", event.target.value)}
        />
        {errors.url ? (
          <p id={`${ids.url}-error`} role="alert" className={styles.fieldError}>
            {errors.url}
          </p>
        ) : null}
      </div>
      <Field
        id={ids.reflection}
        label={reflectionLabel}
        value={draft.reflection}
        max={TEXT_LIMITS.reflection}
        error={errors.reflection}
        rows={3}
        onChange={(value) => update("reflection", value)}
      />
      <button type="submit" className={`ei-button-dawn ${styles.primary}`} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
        <span>{pending ? COMMON.sending : resubmit ? DETAIL.resubmit : DETAIL.submit}</span>
      </button>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  max: number;
  error?: string;
  rows: number;
  onChange: (value: string) => void;
}

/** A labelled textarea with a counter that appears near the cap. */
export function Field({ id, label, hint, value, max, error, rows, onChange }: FieldProps) {
  const near = value.length >= Math.floor(max * 0.8);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null, near ? `${id}-count` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        className={`ei-input ${styles.input} ${styles.textarea}`}
        value={value}
        maxLength={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {near ? (
        <p id={`${id}-count`} className={styles.counter} data-over={value.length > max ? "true" : undefined}>
          {COMMON.counter(value.length, max)}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
