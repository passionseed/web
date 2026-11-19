/**
 * Where a story scene's art lives. Generic scenes are drawn for story reels
 * (scripts/radar-guide/story-art.ts, 108x192 pixel art shown at 4x); a
 * `career:<slug>/<page>` scene reuses that guide level's art.
 */
import { GENERIC_SCENES, type GenericScene, type Scene } from "./types";

/** A slug or page key: lowercase letters, digits and hyphens (RADAR_SLUG_PATTERN). */
const KEY = "[a-z0-9]+(?:-[a-z0-9]+)*";
const CAREER_SCENE = new RegExp(`^career:(${KEY})/(${KEY})$`);

export type ParsedScene = { kind: "generic"; scene: GenericScene } | { kind: "career"; slug: string; page: string };

export function isGenericScene(scene: string): scene is GenericScene {
  return (GENERIC_SCENES as readonly string[]).includes(scene);
}

/** A known scene key, or null (a typo, or a career scene that is not `career:<slug>/<page>`). */
export function parseScene(scene: string): ParsedScene | null {
  if (isGenericScene(scene)) return { kind: "generic", scene };
  const m = CAREER_SCENE.exec(scene);
  return m ? { kind: "career", slug: m[1], page: m[2] } : null;
}

/** Public path of a scene's art, or null for an unknown key. */
export function storySceneSrc(scene: Scene | string): string | null {
  const parsed = parseScene(scene);
  if (!parsed) return null;
  return parsed.kind === "generic" ? `/radar/stories/${parsed.scene}.webp` : `/radar/guides/${parsed.slug}/${parsed.page}.webp`;
}
