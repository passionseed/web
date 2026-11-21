/**
 * The AI Engineer guide, Level 1: a short run of 5 levels told by the host NPC
 * (dream, real work, TCAS round 1, tonight, ending). The DB deck is Level 2.
 * Server-only content: import it from lib/radar-guides/registry.server.ts and
 * server components, never from a "use client" file.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { AI_ENGINEER_BANNED } from "./banned";
import { AI_ENGINEER_FACTS } from "./facts";
import { AI_ENGINEER_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const aiEngineerGuide: CareerGuide = {
  meta: AI_ENGINEER_META,
  pages: [dream, work, tonight, next, round1],
  facts: AI_ENGINEER_FACTS,
  banned: AI_ENGINEER_BANNED,
};
