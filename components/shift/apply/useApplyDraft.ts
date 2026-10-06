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
  "targetTrack",
  "problem",
  "availability",
  "igHandle",
  "discordHandle",
  "parentContact",
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
