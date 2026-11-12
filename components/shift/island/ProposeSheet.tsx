"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { proposeQuest } from "@/app/shift/island/actions";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, PROPOSE } from "./copy";
import { useDraft } from "./drafts";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { Field } from "./SubmitForm";

interface ProposeSheetProps {
  open: boolean;
  onClose: () => void;
}

interface Draft {
  title: string;
  goal: string;
  criteria: string;
  nextStep: string;
  why: string;
}

const EMPTY: Draft = { title: "", goal: "", criteria: "", nextStep: "", why: "" };

const CAPS: Record<keyof Draft, number> = {
  title: TEXT_LIMITS.proposeTitle,
  goal: TEXT_LIMITS.proposeGoal,
  criteria: TEXT_LIMITS.proposeCriteria,
  nextStep: TEXT_LIMITS.proposeNextStep,
  why: TEXT_LIMITS.proposeWhy,
};

const REQUIRED: (keyof Draft)[] = ["title", "goal", "criteria", "nextStep"];

export function validateProposal(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  for (const key of Object.keys(CAPS) as (keyof Draft)[]) {
    const value = draft[key].trim();
    if (!value && REQUIRED.includes(key)) errors[key] = PROPOSE.required;
    else if (value.length > CAPS[key]) errors[key] = DETAIL.errors.tooLong(CAPS[key]);
  }
  return errors;
}

/** The student's own quest: a title, what should happen, how to tell, the first step. */
export function ProposeSheet({ open, onClose }: ProposeSheetProps) {
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={PROPOSE.heading}
    >
      {/* Always rendered: the sheet unmounts it after closing, and it never slides closed empty. */}
      <ProposeForm onSent={onClose} />
    </IslandSheet>
  );
}

function ProposeForm({ onSent }: { onSent: () => void }) {
  const ids = { title: useId(), goal: useId(), criteria: useId(), nextStep: useId(), why: useId() };
  const [draft, setDraft, clearDraft] = useDraft<Draft>("propose", EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [pending, startTransition] = useTransition();

  function update(key: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found = validateProposal(draft);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const why = draft.why.trim();
    startTransition(async () => {
      const result = await proposeQuest({
        title: draft.title.trim(),
        goal: draft.goal.trim(),
        criteria: draft.criteria.trim(),
        nextStep: draft.nextStep.trim(),
        why: why ? why : null,
      });
      if (result.ok) {
        toast.success(PROPOSE.sent);
        clearDraft();
        onSent();
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor={ids.title} className={styles.label}>
          {PROPOSE.title}
        </label>
        <input
          id={ids.title}
          className={`ei-input ${styles.input}`}
          value={draft.title}
          maxLength={CAPS.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${ids.title}-error` : undefined}
          onChange={(event) => update("title", event.target.value)}
        />
        {errors.title ? (
          <p id={`${ids.title}-error`} role="alert" className={styles.fieldError}>
            {errors.title}
          </p>
        ) : null}
      </div>
      <Field id={ids.goal} label={PROPOSE.goal} value={draft.goal} max={CAPS.goal} error={errors.goal} rows={3} onChange={(v) => update("goal", v)} />
      <Field
        id={ids.criteria}
        label={PROPOSE.criteria}
        value={draft.criteria}
        max={CAPS.criteria}
        error={errors.criteria}
        rows={3}
        onChange={(v) => update("criteria", v)}
      />
      <Field
        id={ids.nextStep}
        label={PROPOSE.nextStep}
        value={draft.nextStep}
        max={CAPS.nextStep}
        error={errors.nextStep}
        rows={2}
        onChange={(v) => update("nextStep", v)}
      />
      <Field id={ids.why} label={PROPOSE.why} value={draft.why} max={CAPS.why} error={errors.why} rows={2} onChange={(v) => update("why", v)} />
      <button type="submit" className={`ei-button-dawn ${styles.primary}`} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
        <span>{pending ? COMMON.saving : PROPOSE.send}</span>
      </button>
    </form>
  );
}
