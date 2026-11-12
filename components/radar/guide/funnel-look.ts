"use client";

/**
 * Which look the funnel pieces (share, follow, request, intent, outro) use.
 * Inside the guide shell they take the pixel game look and the current level's
 * page key; in the DB deck they keep the deck look. A `look` prop wins.
 */
import { useGuideShellOptional } from "./shell/shell-context";

export type FunnelLook = "pixel" | "deck";

export interface FunnelContext {
  look: FunnelLook;
  /** The level on screen when rendered inside the guide shell, else null. */
  shellPageKey: string | null;
}

export function useFunnelContext(look?: FunnelLook): FunnelContext {
  const shell = useGuideShellOptional();
  return { look: look ?? (shell ? "pixel" : "deck"), shellPageKey: shell?.pageKey ?? null };
}

/** `pixel ? a : b`, with the shared `rgf` root class added to pixel roots. */
export function lookClass(look: FunnelLook, pixel: string, deck: string, extra?: string): string {
  return [look === "pixel" ? `rgf ${pixel}` : deck, extra].filter(Boolean).join(" ");
}
