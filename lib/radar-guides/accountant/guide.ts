/**
 * The Accountant guide, Level 1: a short run of 5 levels told by the host NPC
 * (dream, real work, tonight, ending, then round 1 in Level 2). The DB deck is
 * Level 2. Server-only content: import it from lib/radar-guides/registry.server.ts
 * and server components, never from a "use client" file.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { ACCOUNTANT_BANNED } from "./banned";
import { ACCOUNTANT_FACTS } from "./facts";
import { ACCOUNTANT_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const accountantGuide: CareerGuide = {
  meta: ACCOUNTANT_META,
  pages: [dream, work, tonight, next, round1],
  facts: ACCOUNTANT_FACTS,
  banned: ACCOUNTANT_BANNED,
};
