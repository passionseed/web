"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { ShiftCohort } from "@/lib/content/shift-cohort";

import { ShiftApplyDone } from "./ShiftApplyDone";
import { readSubmittedApplication, type SubmittedApplication } from "./useApplyDraft";

/**
 * Once the apply window closes the form no longer mounts, but someone who
 * submitted just before midnight and then backed out of Discord sign-in
 * still needs their receipt, payment QR and join link. Shows those when
 * this tab holds a fresh submission for the round, else `children`.
 */
export function RestoredApplyDone({ cohort, children }: { cohort: ShiftCohort; children: ReactNode }) {
  const [submitted, setSubmitted] = useState<SubmittedApplication | null>(null);

  // After mount, so the server render and hydration match.
  useEffect(() => {
    setSubmitted(readSubmittedApplication(cohort.round));
  }, [cohort.round]);

  if (!submitted) return <>{children}</>;
  return <ShiftApplyDone cohort={cohort} values={submitted.values} joinUrl={submitted.joinUrl} />;
}
