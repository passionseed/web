import { z } from "zod";

/**
 * The admin canvas chat's request shape and limits, shared by the route and
 * the browser. The browser only says which canvases to read and what was
 * said; the server builds what Claude reads from the database.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const canvasScopeSchema = z.union([
  z.object({ all: z.literal(true) }).strict(),
  z.object({ boardId: z.string().regex(UUID), frameId: z.string().min(1).max(100) }).strict(),
]);

/** What Claude reads: one canvas, or all of them. */
export type CanvasScope = z.infer<typeof canvasScopeSchema>;

/** Longest question an admin can ask. Claude's own earlier answers come back too, so they may be longer. */
export const MAX_MESSAGE_CHARS = 8000;
const MAX_ANSWER_CHARS = 40_000;
export const MAX_TURNS = 40;

const message = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) }).strict(),
  z.object({ role: z.literal("assistant"), content: z.string().trim().min(1).max(MAX_ANSWER_CHARS) }).strict(),
]);

export const canvasChatRequestSchema = z
  .object({ scope: canvasScopeSchema, messages: z.array(message).min(1).max(MAX_TURNS) })
  .strict()
  .refine(({ messages }) => messages.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant")), {
    message: "Messages must take turns, starting with the admin",
  })
  .refine(({ messages }) => messages.at(-1)?.role === "user", { message: "The last message must be the admin's" });

export type CanvasChatRequest = z.infer<typeof canvasChatRequestSchema>;
export type ChatMessage = CanvasChatRequest["messages"][number];

/**
 * Past this many characters of canvas Markdown, the route asks for a smaller
 * scope instead of cutting canvases out (about 150K tokens of Thai text).
 */
export const MAX_CONTEXT_CHARS = 400_000;

/** One-click questions. */
export const SUMMARY_PROMPT = {
  canvas:
    "Summarize this canvas for a mentor: where the project stands, how strong the evidence is, what changed and why, and the one most useful next nudge.",
  all: "Give me an overview of every canvas: who is moving, who is stuck or thin on evidence, and whom a mentor should check on first.",
} as const;
