/**
 * The plaza's voice campfire on the bot's pictures (the live post and /island),
 * drawn with the web's own plaza code (lib/shift-island/live/plaza.ts): the pit,
 * the flame while anyone sits there, and one figure per seat up to MAX_SEATS.
 * The message text carries the exact count.
 *
 * Privacy as on the web: figures follow seat order only, never a person.
 */
import { plazaWorld } from "@/lib/shift-island/live/plaza";
import type { LiveActor } from "@/lib/shift-island/live/types";

import type { IslandScene } from "./scene";

/**
 * The campfire to draw: null (or left out) draws none, for an island without a
 * coworking channel. A count of 0 draws the pit unlit, which is also what to
 * pass when the channel exists but the bot cannot tell who sits there.
 */
export type CampfireView = { count: number } | null;

/** The campfire's actors in draw order (pit, seats behind the fire, flame, seats in front); none without a campfire. */
export function campfireActors(scene: IslandScene, campfire: CampfireView | undefined): LiveActor[] {
  if (!campfire) return [];
  return plazaWorld(scene, { festival: null, pins: null, campfire }).actors;
}
