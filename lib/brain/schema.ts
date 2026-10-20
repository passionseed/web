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
/** Admin-typed session titles. No `|`, `@`, quotes or Markdown marks; an
 *  unsafe title is dropped rather than failing the whole event. */
const title = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[\p{L}\p{M}\p{N} [\]().#_:,'&!?+/·-]+$/u)
  .optional()
  .catch(undefined);
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const total = z.number().int().min(0).max(10_000_000);
const alumniSession = {
  date: isoDate,
  title,
  start_time: clock.optional(),
  end_time: clock.optional(),
};

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
    type: z.literal("hackathon_team_invites_opened"),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal("hackathon_team_invites_closed"),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal("alumni_schedule_changed"),
    payload: z.object({
      first_date: isoDate,
      start_time: clock.optional(),
      end_time: clock.optional(),
    }),
  }),
  z.object({
    type: z.literal("alumni_session_created"),
    payload: z.object(alumniSession),
  }),
  z.object({
    type: z.literal("alumni_session_changed"),
    payload: z.object({ ...alumniSession, rsvps: total.optional() }),
  }),
  z.object({
    type: z.literal("alumni_session_cancelled"),
    payload: z.object({ date: isoDate, title, rsvps: total.optional() }),
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
        "gallery_products",
      ]),
      value: total,
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
