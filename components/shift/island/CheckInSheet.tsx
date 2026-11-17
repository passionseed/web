"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { checkIn } from "@/app/shift/island/actions";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

import { CHECK_IN, COMMON, TODAY } from "./copy";
import { Field } from "./Field";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { nextHeadline } from "./NextStepCard";
import type { NextStep } from "./nextStep";
import { keepDayIntention } from "./useDayIntention";

interface CheckInSheetProps {
  /** The step the card was tapped on; null keeps the sheet closed. */
  step: NextStep | null;
  onClose: () => void;
  /** The tap is in: the page plays the dust puff and opens the step's quest. */
  onCheckedIn: (step: NextStep) => void;
  /** The viewer's quest member uuid: keys the intention kept on this browser. */
  viewerKey: string | null;
}

/**
 * The day's check-in, opened by the day's first tap on the next-step card:
 * what the student means to do today (optional, private, kept on this
 * browser), then เช็กอิน แล้วลุยเลย, which saves the tap and goes straight to
 * the quest. A check-in never grows the tree's stage; only a mentor's
 * approval does. No streaks, no day count.
 */
export function CheckInSheet({ step, onClose, onCheckedIn, viewerKey }: CheckInSheetProps) {
  // The last step stays while the sheet slides closed.
  const [shown, setShown] = useState(step);
  if (step && step !== shown) setShown(step);
  const intentionId = useId();
  const [intention, setIntention] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = step;
    if (!current || pending) return;
    const text = intention.trim();
    startTransition(async () => {
      const result = await checkIn({ intention: text || null, instanceId: current.instanceId });
      if (!result.ok) {
        toast.error(result.error || COMMON.failed);
        return;
      }
      if (text) keepDayIntention(text, viewerKey);
      setIntention("");
      onCheckedIn(current);
    });
  }

  return (
    <IslandSheet
      open={step != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={CHECK_IN.title}
      description={shown ? nextHeadline(shown) : undefined}
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Field
          id={intentionId}
          label={TODAY.ask}
          hint={TODAY.askHint}
          value={intention}
          max={TEXT_LIMITS.intention}
          rows={2}
          onChange={setIntention}
        />
        <button
          type="submit"
          className={`ei-button-dawn ${styles.primary} ${styles.tapButton}`}
          disabled={pending}
          aria-busy={pending}
        >
          <span>{shown?.ref ? TODAY.go : TODAY.tap}</span>
        </button>
      </form>
    </IslandSheet>
  );
}
