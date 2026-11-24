/**
 * The marketing guide, Level 1: a short run told by the host NPC (dream, real
 * work, tonight, ending), then round 1 opening Level 2. The DB deck is the
 * rest of Level 2. Server-only content: import it from
 * lib/radar-guides/registry.server.ts and server components, never from a
 * "use client" file.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { MARKETING_STRATEGIST_BANNED } from "./banned";
import { MARKETING_STRATEGIST_FACTS } from "./facts";
import { MARKETING_STRATEGIST_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const marketingStrategistGuide: CareerGuide = {
  meta: MARKETING_STRATEGIST_META,
  pages: [dream, work, tonight, next, round1],
  facts: MARKETING_STRATEGIST_FACTS,
  banned: MARKETING_STRATEGIST_BANNED,
};
