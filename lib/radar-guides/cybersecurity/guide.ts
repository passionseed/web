/**
 * The cybersecurity guide: Level 1 (5 levels for a student who hasn't chosen
 * anything yet) and Level 2 (7 levels that go deep), told by the host NPC,
 * with founder cutscenes on key levels. Server-only content: import it from
 * lib/radar-guides/registry.server.ts and server components, never from a
 * "use client" file (eslint + guides.test.ts enforce this).
 *
 * Design: docs/radar-guide/cybersecurity-guide.md (facts, mechanics, copy),
 * rewritten for the game-story format (dialogue boxes, in-world items).
 * Recording sheet: docs/radar-guide/cybersecurity-cutscenes.md.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";
import { CYBERSECURITY_BANNED } from "./banned";
import { CYBERSECURITY_FACTS } from "./facts";
import { CYBERSECURITY_META } from "./meta";
import { doors } from "./pages/doors";
import { firstjob } from "./pages/firstjob";
import { fit } from "./pages/fit";
import { money } from "./pages/money";
import { mythos } from "./pages/mythos";
import { next } from "./pages/next";
import { round1 } from "./pages/round1";
import { scam } from "./pages/scam";
import { tcas } from "./pages/tcas";
import { terminal } from "./pages/terminal";
import { tonight } from "./pages/tonight";
import { triage } from "./pages/triage";

export const cybersecurityGuide: CareerGuide = {
  meta: CYBERSECURITY_META,
  pages: [mythos, scam, round1, tonight, next, doors, triage, firstjob, money, fit, tcas, terminal],
  facts: CYBERSECURITY_FACTS,
  banned: CYBERSECURITY_BANNED,
};
