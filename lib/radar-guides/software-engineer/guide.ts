/**
 * The software engineer guide, Level 1: dream, real work, TCAS round 1, one
 * step tonight, and the ending. Server-only content: import it from
 * lib/radar-guides/registry.server.ts and server components, never from a
 * "use client" file.
 *
 * Research: docs/radar-guide/factsheets/software-engineer.md and
 * docs/radar-guide/content-fixes/software-engineer.md.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { SOFTWARE_ENGINEER_BANNED } from "./banned";
import { SOFTWARE_ENGINEER_FACTS } from "./facts";
import { SOFTWARE_ENGINEER_META } from "./meta";
import { dream } from "./pages/dream";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { tonight } from "./pages/tonight";
import { work } from "./pages/work";

export const softwareEngineerGuide: CareerGuide = {
  meta: SOFTWARE_ENGINEER_META,
  pages: [dream, work, round1, tonight, next],
  facts: SOFTWARE_ENGINEER_FACTS,
  banned: SOFTWARE_ENGINEER_BANNED,
};
