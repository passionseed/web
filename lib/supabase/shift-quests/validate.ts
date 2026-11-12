import "server-only";

import { z } from "zod";

import { CARD_LIMITS } from "@/lib/shift-island/quest-canvas";

import { TEXT_LIMITS, type ProjectRoute } from "./types";

/**
 * Input schemas for the island's server actions. The caps are the
 * database's own (__check_len counts characters, so these count code points
 * too); the database checks again. The client never sends who it is: every
 * input is an object id or the student's own text.
 */

const chars = (value: string) => Array.from(value).length;

/** Required text: trimmed, not empty, at most `max` characters. */
const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((v) => chars(v) <= max, { message: `at most ${max} characters` });

/** Optional text: trimmed; missing or empty becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .refine((v) => chars(v) <= max, { message: `at most ${max} characters` })
    .nullish()
    .transform((v) => (v ? v : null));

/** Optional link: https only, no spaces, at most 500 characters (as __check_url). */
const optionalUrl = optionalText(TEXT_LIMITS.artifactUrl).refine((v) => v === null || /^https:\/\/\S+$/.test(v), {
  message: "must start with https://",
});

const id = z.string().uuid();

const ROUTES = ["software", "creative", "service", "other"] as const satisfies readonly ProjectRoute[];
export const routeSchema = z.enum(ROUTES);

export const createProjectSchema = z.object({
  name: requiredText(TEXT_LIMITS.projectName),
  route: routeSchema,
  ambition: optionalText(TEXT_LIMITS.ambition),
});

export const respondInviteSchema = z.object({
  projectId: id,
  accept: z.boolean(),
});

export const checkInSchema = z
  .object({ note: optionalText(TEXT_LIMITS.note) })
  .nullish()
  .transform((v) => ({ note: v?.note ?? null }));

export const setRestingSchema = z.object({ on: z.boolean() });

export const setShowNameSchema = z.object({ projectId: id, show: z.boolean() });

const submission = {
  proof: requiredText(TEXT_LIMITS.proof),
  reflection: requiredText(TEXT_LIMITS.reflection),
  artifactUrl: optionalUrl,
};

export const submitMainQuestSchema = z.object({
  milestone: z.number().int().min(1).max(7),
  ...submission,
});

export const startMainQuestSchema = z.object({ milestone: z.number().int().min(1).max(7) });

export const resumeQuestSchema = z.object({ instanceId: id });

export const chooseSideQuestSchema = z.object({ templateId: id });

export const submitSideQuestSchema = z.object({ templateId: id, ...submission });

export const proposeQuestSchema = z.object({
  title: requiredText(TEXT_LIMITS.proposeTitle),
  goal: requiredText(TEXT_LIMITS.proposeGoal),
  criteria: requiredText(TEXT_LIMITS.proposeCriteria),
  nextStep: requiredText(TEXT_LIMITS.proposeNextStep),
  why: optionalText(TEXT_LIMITS.proposeWhy),
});

export const submitProposedQuestSchema = z.object({
  instanceId: id,
  version: z.number().int().min(1).max(2_147_483_647),
  ...submission,
});

export const askForHelpSchema = z.object({
  summary: requiredText(TEXT_LIMITS.helpSummary),
  visibility: z.enum(["community", "mentors"]),
  instanceId: id.nullish().transform((v) => v ?? null),
});

// ---------------------------------------------------------------------------
// The SHIFT canvas link and quest cards
// ---------------------------------------------------------------------------

/** A quest on the board, as the client names it (BoardRef). */
const boardRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("main"), milestone: z.number().int().min(1).max(7) }),
  z.object({ kind: z.literal("side"), templateId: id }),
  z.object({ kind: z.literal("proposed"), instanceId: id }),
]);

/** A template slug as the board shows it, or null. Picks a guide on reads only; submits resolve it on the server. */
const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,60}$/)
  .nullish()
  .transform((v) => v ?? null);

/** An Excalidraw element id: 1 to 100 characters (as the link table's check). */
const elementId = z
  .string()
  .min(1)
  .refine((v) => chars(v) <= 100, { message: "at most 100 characters" });

export const linkCanvasSchema = z.object({ boardId: id, frameId: elementId });

export const loadQuestCanvasSchema = z.object({ ref: boardRefSchema, slug: slugSchema });

export const submitQuestCardSchema = z.object({
  ref: boardRefSchema,
  slug: slugSchema,
  version: z.number().int().min(1).max(2_147_483_647).nullish().transform((v) => v ?? null),
  notes: z
    .array(z.object({ id: elementId, hash: z.string().regex(/^[0-9a-f]{1,16}$/) }))
    .min(1)
    .max(CARD_LIMITS.notes)
    .refine((notes) => new Set(notes.map((n) => n.id)).size === notes.length, { message: "each note once" }),
  line: optionalText(CARD_LIMITS.line),
  link: optionalUrl,
});
