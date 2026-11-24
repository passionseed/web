/**
 * Where a story scene's art lives. Real life is a faded film photo, the
 * Elemental hackathon's look (scripts/radar-guide/story-photo.ts, 1080x1920):
 * the pixel cast stands in it, and only the pixels are loud. The phone feed
 * and the Radar map stay pixel art (scripts/radar-guide/story-art.ts), since
 * they are the phone's and the game's worlds. A `career:<slug>/<page>` scene
 * has its own photo when STORY_PHOTOS lists it, else reuses that guide
 * level's pixel art.
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


/** How a photo scene is staged. */
export interface ScenePhoto {
  /**
   * Frame y (CSS px on the 432x768 frame) below which the photo is drawn
   * again over the cast: the dinner table in front of the family.
   */
  occludeY?: number;
}

/** Every scene drawn as a photo (public/radar/stories/<scene>.webp or career/<slug>/<page>.webp). */
export const STORY_PHOTOS: Readonly<Record<string, ScenePhoto>> = {
  "bedroom-night": {},
  classroom: {},
  "dinner-table": { occludeY: 455 },
  "school-gate": {},
  "career:ux-design/work": {},
  "career:ux-design/tonight": {},
  "career:ux-design/dream": {},
  "career:content-creator/work": {},
  "career:content-creator/tonight": {},
  "career:content-creator/dream": {},
  "career:medical-technologist/work": {},
  "career:medical-technologist/tonight": {},
  "career:medical-technologist/dream": {},
  "career:mechanical-engineer/work": {},
  "career:mechanical-engineer/tonight": {},
  "career:mechanical-engineer/dream": {},
  "career:accountant/work": {},
  "career:accountant/tonight": {},
  "career:marketing-strategist/work": {},
  "career:marketing-strategist/tonight": {},
  "career:marketing-strategist/dream": {},
};

/** The photo staging for a scene, or null for a pixel-art scene. */
export function scenePhoto(scene: Scene | string): ScenePhoto | null {
  return STORY_PHOTOS[scene] ?? null;
}

/** Public path of a scene's art, or null for an unknown key. */
export function storySceneSrc(scene: Scene | string): string | null {
  const parsed = parseScene(scene);
  if (!parsed) return null;
  if (parsed.kind === "generic") return `/radar/stories/${parsed.scene}.webp`;
  if (STORY_PHOTOS[scene]) return `/radar/stories/career/${parsed.slug}/${parsed.page}.webp`;
  return `/radar/guides/${parsed.slug}/${parsed.page}.webp`;
}
