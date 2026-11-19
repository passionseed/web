/**
 * Every story reel script. Each file in ./scripts default-exports an array of
 * StoryScript; add its import below when you drop one in (a test fails until
 * every file in ./scripts is listed here). Safe for client and server: data
 * only.
 */
import samples from "./scripts/samples";
import type { StoryScript } from "./types";

export const STORY_FILES: Readonly<Record<string, readonly StoryScript[]>> = {
  samples,
};

export const STORY_SCRIPTS: readonly StoryScript[] = Object.values(STORY_FILES).flat();

export function storyById(id: string): StoryScript | null {
  return STORY_SCRIPTS.find((s) => s.id === id) ?? null;
}

export type { StoryBeat, StoryScript, Scene, Who, Mood } from "./types";
