import type { LinkedInPost, PublishSlot, StudioSet, XPost } from "../types";

import { GUIDE_SETS } from "./guides";
import { LINKEDIN_POSTS as POSTS, LINKEDIN_SETS } from "./linkedin";
import { PUBLISH_PLAN as PLAN } from "./publishPlan";
import { SHIFT2_SETS } from "./shift2";
import { X_POSTS as XS } from "./x";

/** Every studio set, newest batch first within each group. */
export const STUDIO_SETS: StudioSet[] = [...SHIFT2_SETS, ...GUIDE_SETS, ...LINKEDIN_SETS];

export const LINKEDIN_POSTS: LinkedInPost[] = POSTS;

export const X_POSTS: XPost[] = XS;

export const PUBLISH_PLAN: PublishSlot[] = PLAN;

export function getStudioSet(slug: string): StudioSet | undefined {
  return STUDIO_SETS.find((set) => set.slug === slug);
}
