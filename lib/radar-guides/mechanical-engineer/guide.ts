/**
 * The Mechanical Engineer guide, Level 1: a short run of 4 levels told by the
 * host NPC (dream, real work, tonight, ending), then round 1 opening Level 2
 * before the DB deck.
 * Server-only content: import it from lib/radar-guides/registry.server.ts and
 * server components, never from a "use client" file.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { MECHANICAL_ENGINEER_BANNED } from "./banned";
import { MECHANICAL_ENGINEER_FACTS } from "./facts";
import { MECHANICAL_ENGINEER_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const mechanicalEngineerGuide: CareerGuide = {
  meta: MECHANICAL_ENGINEER_META,
  pages: [dream, work, tonight, next, round1],
  facts: MECHANICAL_ENGINEER_FACTS,
  banned: MECHANICAL_ENGINEER_BANNED,
};
