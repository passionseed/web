/**
 * Shared types for the living island (the web's animated canvas over the
 * island scene). Client-safe: no DOM or Node imports.
 */

/** Light over the island, from Asia/Bangkok time (see lighting.ts). */
export type LightPhase = "dawn" | "day" | "dusk" | "night";

/**
 * An extra sprite drawn above the trees (the story's builder and tester), in
 * the scene's native pixels.
 */
export interface LiveActor {
  /** Sprite names from SPRITES or MOTION_SPRITES, played in order. */
  frames: readonly string[];
  /** Top-left corner, native px. */
  x: number;
  y: number;
  /** How long each frame shows (default 500 ms). */
  frameMs?: number;
  /** Mirror it left to right. */
  flip?: boolean;
}
