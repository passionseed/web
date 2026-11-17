/**
 * Shared types for the living island (the web's animated canvas over the
 * island scene). Client-safe: no DOM or Node imports.
 */

/** Light over the island, from Asia/Bangkok time (see lighting.ts). */
export type LightPhase = "dawn" | "day" | "dusk" | "night";

/** Where a walking actor stands on one frame: native px from its x and y, and which way it faces. */
export interface LiveStep {
  dx: number;
  dy: number;
  /** Mirror this frame (it overrides the actor's own flip). */
  flip?: boolean;
}

/**
 * An extra sprite drawn above the trees (the story's builder and tester, the
 * plaza's people), in the scene's native pixels.
 */
export interface LiveActor {
  /** Sprite names from the atlas (allSprites), played in order. */
  frames: readonly string[];
  /** Top-left corner, native px. */
  x: number;
  y: number;
  /** How long each frame shows (default 500 ms). */
  frameMs?: number;
  /** Mirror it left to right. */
  flip?: boolean;
  /**
   * A walker: one step per frame (the same length as frames), whole native
   * px. Absent: the actor stays at x and y. At most 255 frames.
   */
  steps?: readonly LiveStep[];
  /**
   * Play the frames once from when this actor first appears, then hold the
   * last one (an arrival). Still, or under reduced motion, only the last
   * frame shows.
   */
  once?: boolean;
}
