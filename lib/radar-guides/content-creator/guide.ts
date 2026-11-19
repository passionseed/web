/**
 * The Content Creator guide, Level 1: a short run of 4 levels told by the host
 * NPC (dream, real work, tonight, ending), then round 1 opening Level 2. The
 * DB deck is the rest of Level 2. Server-only content: import it from
 * lib/radar-guides/registry.server.ts and server components, never from a
 * "use client" file.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { CONTENT_CREATOR_BANNED } from "./banned";
import { CONTENT_CREATOR_FACTS } from "./facts";
import { CONTENT_CREATOR_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const contentCreatorGuide: CareerGuide = {
  meta: CONTENT_CREATOR_META,
  pages: [dream, work, tonight, next, round1],
  facts: CONTENT_CREATOR_FACTS,
  banned: CONTENT_CREATOR_BANNED,
};
