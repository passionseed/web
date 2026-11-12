import type { LinkedInPost, PublishSlot, StudioSet, XPost } from "../types";

import { COSMOS_PREVIEW_SETS } from "./cosmosPreview";
import { GUIDE_SETS } from "./guides";
import { LINKEDIN_POSTS as POSTS, LINKEDIN_SETS } from "./linkedin";
import { PUBLISH_PLAN as PLAN } from "./publishPlan";
import { SHIFT2_SETS } from "./shift2";
import { SHIFT3_SETS } from "./shift3";
import { SHIFT3_FAQ_SETS } from "./shift3-faq";
import { SHIFT3_GUIDE_SETS } from "./shift3-guides";
import { SHIFT3_LINKEDIN_POSTS, SHIFT3_LINKEDIN_SETS } from "./shift3-linkedin";
import { SHIFT3_X_POSTS } from "./shift3-x";
import { X_POSTS as XS } from "./x";

/** Every studio set, newest batch first within each group. */
export const STUDIO_SETS: StudioSet[] = [
  ...SHIFT3_SETS,
  ...SHIFT3_FAQ_SETS,
  ...SHIFT3_GUIDE_SETS,
  ...SHIFT3_LINKEDIN_SETS,
  ...SHIFT2_SETS,
  ...GUIDE_SETS,
  ...LINKEDIN_SETS,
  ...COSMOS_PREVIEW_SETS,
];

export const LINKEDIN_POSTS: LinkedInPost[] = [...SHIFT3_LINKEDIN_POSTS, ...POSTS];

export const X_POSTS: XPost[] = [...SHIFT3_X_POSTS, ...XS];

export const PUBLISH_PLAN: PublishSlot[] = PLAN;

export function getStudioSet(slug: string): StudioSet | undefined {
  return STUDIO_SETS.find((set) => set.slug === slug);
}
