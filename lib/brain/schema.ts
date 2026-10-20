import { z } from "zod";

/**
 * Allowlisted events the web app may send to the company brain
 * (passionseed/company-brain, published publicly). Payloads hold program
 * facts and totals only. Zod strips any key not listed here, so names,
 * emails, phones and student free text never reach the outbox.
 *
 * Kept free of server imports so render.ts and tests can use it.
 */

const roundNumber = z.number().int().min(0).max(999);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Admin-typed labels (cohort names). Letters, digits and a few marks only. */
const label = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[\p{L}\p{M}\p{N} [\]().#_-]+$/u);

export const brainEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("shift_round_created"),
    payload: z.object({
      round: roundNumber,
      starts_on: isoDate.optional(),
      duration_days: z.number().int().min(1).max(60).optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }),
  }),
  z.object({
    type: z.literal("shift_round_published"),
    payload: z.object({ round: roundNumber }),
  }),
  z.object({
    type: z.literal("shift_round_unpublished"),
    payload: z.object({ round: roundNumber }),
  }),
  z.object({
    type: z.literal("shift_round_finished"),
    payload: z.object({ round: roundNumber }),
  }),
  z.object({
    type: z.literal("shift_registration_opened"),
    payload: z.object({ round: roundNumber }),
  }),
  z.object({
    type: z.literal("shift_registration_closed"),
    payload: z.object({ round: roundNumber }),
  }),
  z.object({
    type: z.literal("shift_round_dates_changed"),
    payload: z.object({
      round: roundNumber,
      starts_on: isoDate.optional(),
      duration_days: z.number().int().min(1).max(60).optional(),
      closes_on: isoDate.optional(),
    }),
  }),
  z.object({
    type: z.literal("shift_price_changed"),
    payload: z.object({
      round: roundNumber,
      price_thb: z.number().int().min(0).max(1_000_000),
    }),
  }),
  z.object({
    type: z.literal("shift_camp_cohort_created"),
    payload: z.object({
      name: label,
      starts_on: isoDate.optional(),
    }),
  }),
  z.object({
    type: z.literal("program_count_snapshot"),
    payload: z.object({
      program: z.enum(["shift", "pathlab", "hackathon", "alumni"]),
      round: roundNumber.optional(),
      metric: z.enum([
        "entrants",
        "applications",
        "accepted_applications",
        "paid_seats",
        "seats",
        "finished",
        "certificates",
        "members",
        "enrollments",
      ]),
      value: z.number().int().min(0).max(10_000_000),
    }),
  }),
]);

export type BrainEvent = z.infer<typeof brainEventSchema>;
export type BrainEventType = BrainEvent["type"];

/** A row of `brain_events` after validation. */
export type StoredBrainEvent = BrainEvent & { id: string; created_at: string };

export function parseBrainEvent(input: unknown): BrainEvent | null {
  const parsed = brainEventSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
