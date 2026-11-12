"use client";

import { useEffect, useRef } from "react";

import type { ShiftApplicationInput } from "@/lib/shift/application";

/**
 * Keeps typed answers in localStorage. Applicants on Instagram's in-app
 * browser hop out to copy a Discord tag or ask a parent for a LINE ID, and
 * the webview often reloads when they come back. Shared across rounds, so
 * switching weeks keeps the answers too.
 */

const DRAFT_KEY = "shift_apply_draft_v1";

/** Only free-text and choice answers. Consent is re-ticked on purpose, and
 *  round/source/honeypot always come from the current page. */
const DRAFT_FIELDS: readonly (keyof ShiftApplicationInput)[] = [
  "fullName",
  "nickname",
  "grade",
  "birthDate",
  "targetTrack",
  "problem",
  "availability",
  "igHandle",
  "discordHandle",
  "parentEmail",
  "parentContact",
  "foundVia",
];

type Draft = Partial<ShiftApplicationInput>;

function readDraft(): Draft {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const draft: Record<string, string> = {};
    for (const field of DRAFT_FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === "string" && value) draft[field] = value;
    }
    return draft as Draft;
  } catch {
    return {};
  }
}

export function clearApplyDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private mode or storage disabled: nothing was saved anyway.
  }
}

/**
 * Restores a saved draft once on mount (via `onRestore`), then saves on every
 * change. Restoring after mount keeps the server render and hydration equal.
 */
export function useApplyDraft(
  values: ShiftApplicationInput,
  onRestore: (draft: Draft) => void,
) {
  const restored = useRef(false);

  useEffect(() => {
    const draft = readDraft();
    if (Object.keys(draft).length > 0) onRestore(draft);
    restored.current = true;
    // Mount only: onRestore is a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    const draft = Object.fromEntries(DRAFT_FIELDS.map((f) => [f, values[f] ?? ""]));
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or disabled: the form still works, it just won't persist.
    }
  }, [values]);
}

/**
 * The submitted application, kept for this tab only. The done screen leads
 * with Discord sign-in, which leaves the page; backing out of Discord's
 * login reloads /shift/apply, and without this the receipt, payment QR and
 * personal join link would be gone. It expires so someone else applying
 * later on the same phone gets a blank form.
 */
const SUBMITTED_KEY = "shift_apply_submitted_v1";
// Long enough for a Discord sign-in round trip, short enough that the next
// person on a shared phone rarely meets someone else's receipt.
const SUBMITTED_TTL_MS = 30 * 60 * 1000;

export interface SubmittedApplication {
  round: number;
  values: ShiftApplicationInput;
  joinUrl: string | null;
}

export function saveSubmittedApplication(entry: SubmittedApplication) {
  try {
    window.sessionStorage.setItem(SUBMITTED_KEY, JSON.stringify({ ...entry, savedAt: Date.now() }));
  } catch {
    // Storage disabled: the done screen still shows, it just won't survive a reload.
  }
}

export function clearSubmittedApplication() {
  try {
    window.sessionStorage.removeItem(SUBMITTED_KEY);
  } catch {
    // Storage disabled: nothing was saved.
  }
}

export function readSubmittedApplication(round: number): SubmittedApplication | null {
  try {
    const raw = window.sessionStorage.getItem(SUBMITTED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SubmittedApplication> & { savedAt?: number };
    const fresh = typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt < SUBMITTED_TTL_MS;
    if (!fresh || parsed.round !== round || !parsed.values || typeof parsed.values !== "object") return null;
    return {
      round,
      values: parsed.values,
      joinUrl: typeof parsed.joinUrl === "string" ? parsed.joinUrl : null,
    };
  } catch {
    return null;
  }
}
