"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { askForHelp } from "@/app/shift/island/actions";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, STUCK } from "./copy";
import { useDraft } from "./drafts";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { Field } from "./SubmitForm";

export interface StuckTarget {
  /** The caller's own quest instance, or null for a general request. */
  instanceId: string | null;
  title: string | null;
}

interface StuckSheetProps {
  open: boolean;
  target: StuckTarget;
  onClose: () => void;
}

type Visibility = "community" | "mentors";

/**
 * "ติด": a help request that goes to a group space only (the community help
 * channel or the mentors' queue). Never a private chat between an adult and a
 * student.
 */
export function StuckSheet({ open, target, onClose }: StuckSheetProps) {
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={STUCK.heading}
      description={target.title ? STUCK.about(target.title) : undefined}
    >
      {/* Always rendered: the sheet unmounts it after closing, and it never slides closed empty. */}
      <StuckForm key={target.instanceId ?? "general"} target={target} onSent={onClose} />
    </IslandSheet>
  );
}

function StuckForm({ target, onSent }: { target: StuckTarget; onSent: () => void }) {
  const summaryId = useId();
  const choiceName = useId();
  const [summary, setSummary, clearSummary] = useDraft(`stuck:${target.instanceId ?? "general"}`, "");
  const [visibility, setVisibility] = useState<Visibility>("community");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const text = summary.trim();
    if (!text) return setError(STUCK.required);
    if (text.length > TEXT_LIMITS.helpSummary) return setError(DETAIL.errors.tooLong(TEXT_LIMITS.helpSummary));
    setError(null);
    startTransition(async () => {
      const result = await askForHelp({ summary: text, visibility, instanceId: target.instanceId });
      if (result.ok) {
        toast.success(STUCK.sent[visibility]);
        clearSummary();
        onSent();
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Field
        id={summaryId}
        label={STUCK.label}
        value={summary}
        max={TEXT_LIMITS.helpSummary}
        error={error ?? undefined}
        rows={4}
        onChange={(value) => {
          setSummary(value);
          if (error) setError(null);
        }}
      />
      <fieldset className={styles.choices}>
        <legend className={styles.label}>{STUCK.choice}</legend>
        {(["community", "mentors"] as const).map((value) => (
          <label key={value} className={styles.choice} data-checked={visibility === value ? "true" : undefined}>
            <input
              type="radio"
              name={choiceName}
              value={value}
              checked={visibility === value}
              onChange={() => setVisibility(value)}
              className={styles.choiceInput}
            />
            <span>{STUCK[value]}</span>
          </label>
        ))}
      </fieldset>
      <p className={styles.hint} aria-live="polite">
        {STUCK.fine[visibility]}
      </p>
      <button type="submit" className={`ei-button-dawn ${styles.primary}`} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
        <span>{pending ? COMMON.sending : STUCK.send}</span>
      </button>
    </form>
  );
}
