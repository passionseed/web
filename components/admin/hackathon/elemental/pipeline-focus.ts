"use client";

import { PIPELINE_ITEM_HASH, PIPELINE_SPEAKERS_HREF } from "@/lib/hackathon/elemental/today";

/**
 * Links from the Today strip into the pipeline board. The board listens for
 * this event (and reads the hash on load) to switch tab and open the card.
 */
export const PIPELINE_FOCUS_EVENT = "elemental-pipeline-focus";

export type PipelineFocus = { type: "item"; id: string } | { type: "kind"; kind: "speaker" };

export function parsePipelineHash(hash: string): PipelineFocus | null {
  if (hash.startsWith(PIPELINE_ITEM_HASH)) {
    const id = hash.slice(PIPELINE_ITEM_HASH.length);
    return id ? { type: "item", id } : null;
  }
  if (hash === PIPELINE_SPEAKERS_HREF) return { type: "kind", kind: "speaker" };
  return null;
}

/** Sends a pipeline link to the board. False when the href is not one. */
export function focusPipeline(href: string): boolean {
  const focus = parsePipelineHash(href);
  if (!focus) return false;
  try {
    window.history.replaceState(null, "", href);
  } catch {
    // The hash is only a convenience for reloads.
  }
  window.dispatchEvent(new CustomEvent<PipelineFocus>(PIPELINE_FOCUS_EVENT, { detail: focus }));
  return true;
}
