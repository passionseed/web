/**
 * The data scientist guide, Level 1: dream, work, round 1, tonight, next,
 * told by the host NPC. Server-only content: import it from
 * lib/radar-guides/registry.server.ts and server components, never from a
 * "use client" file.
 *
 * Research: docs/radar-guide/factsheets/data-scientist.md and the facts in
 * ./facts.ts (read 2026-11-18). Level 2 is the career's DB deck.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { DATA_SCIENTIST_BANNED } from "./banned";
import { DATA_SCIENTIST_FACTS } from "./facts";
import { DATA_SCIENTIST_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const dataScientistGuide: CareerGuide = {
  meta: DATA_SCIENTIST_META,
  pages: [dream, work, round1, tonight, next],
  facts: DATA_SCIENTIST_FACTS,
  banned: DATA_SCIENTIST_BANNED,
};
