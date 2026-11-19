/**
 * The Medical Technologist guide, Level 1: a short run of levels told by the
 * host NPC (dream, real work, tonight, ending), then round 1 opening Level 2.
 * The DB deck follows Level 2.
 * Server-only content: import it from lib/radar-guides/registry.server.ts and
 * server components, never from a "use client" file.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { MEDICAL_TECHNOLOGIST_BANNED } from "./banned";
import { MEDICAL_TECHNOLOGIST_FACTS } from "./facts";
import { MEDICAL_TECHNOLOGIST_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const medicalTechnologistGuide: CareerGuide = {
  meta: MEDICAL_TECHNOLOGIST_META,
  pages: [dream, work, tonight, next, round1],
  facts: MEDICAL_TECHNOLOGIST_FACTS,
  banned: MEDICAL_TECHNOLOGIST_BANNED,
};
