/**
 * Bespoke (career-specific) guide components, by guide slug. Each guide's
 * pieces load in their own chunk the first time a page needs one
 * (BespokeIsland). Contract (docs/features/radar-guides-in-code.md 5.2):
 * `loadBespoke(slug)` resolves to { componentId: Component }.
 *
 * Client-safe: no guide content (pages, facts) is imported here; components
 * get their block's JSON props only.
 */
import type { ComponentType } from "react";
import type { BespokeProps } from "@/lib/radar-guide/guide-types";

export type BespokeRegistry = Readonly<Record<string, ComponentType<BespokeProps>>>;

const LOADERS: Readonly<Record<string, () => Promise<BespokeRegistry>>> = {
  cybersecurity: () => import("./cybersecurity").then((m) => m.BESPOKE),
};

const EMPTY: BespokeRegistry = {};

/** The guide's bespoke components, or an empty registry for a slug with none. */
export function loadBespoke(slug: string): Promise<BespokeRegistry> {
  const loader = Object.prototype.hasOwnProperty.call(LOADERS, slug) ? LOADERS[slug] : null;
  return loader ? loader() : Promise.resolve(EMPTY);
}

/** Slugs that ship bespoke components (tests and the integrator's checks). */
export const BESPOKE_SLUGS: readonly string[] = Object.keys(LOADERS);
