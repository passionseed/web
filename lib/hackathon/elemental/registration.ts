import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * Elemental Hackathon sign-up: who can register, what they pay, and when
 * sign-up is open. Shared by the form (client) and the API route (server),
 * so both check the same rules.
 */

/** Under this age a parent's consent is required (Big, 2026-11-20). */
export const ADULT_AGE = 20;

/** ฿199 alone, ฿149 a person for a group of 2 or more, on one slip. */
export function elementalPriceBaht(memberCount: number): number {
  if (!Number.isInteger(memberCount) || memberCount < 1) return 0;
  return memberCount === 1 ? ELEMENTAL.priceBaht : ELEMENTAL.groupPriceBaht * memberCount;
}

/** Sign-up is open until the end of registrationClosesOn, Bangkok time. */
export function elementalRegistrationOpen(now: Date = new Date()): boolean {
  const closesAt = new Date(`${ELEMENTAL.registrationClosesOn}T23:59:59+07:00`);
  return now.getTime() <= closesAt.getTime();
}

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const thaiPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+66|0)\d{8,9}$/, "phone"));

export const memberSchema = z
  .object({
    fullName: trimmed(120),
    nickname: optionalTrimmed(60),
    age: z.coerce.number().int().min(10).max(99),
    school: trimmed(160),
    parentName: optionalTrimmed(120),
    parentPhone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.replace(/[\s-]/g, "") : undefined)),
    parentConsent: z.boolean().default(false),
  })
  .superRefine((m, ctx) => {
    if (m.age >= ADULT_AGE) return;
    if (!m.parentName) ctx.addIssue({ code: "custom", path: ["parentName"], message: "required" });
    if (!m.parentPhone || !/^(\+66|0)\d{8,9}$/.test(m.parentPhone)) {
      ctx.addIssue({ code: "custom", path: ["parentPhone"], message: "phone" });
    }
    if (!m.parentConsent) ctx.addIssue({ code: "custom", path: ["parentConsent"], message: "required" });
  });

export const registrationSchema = z.object({
  teamName: optionalTrimmed(80),
  members: z.array(memberSchema).min(1).max(ELEMENTAL.maxGroupSize),
  contactEmail: z.string().trim().toLowerCase().email().max(200),
  contactPhone: thaiPhone,
  contactLineId: optionalTrimmed(60),
  wantsTeamMatching: z.boolean().default(false),
  noRefundAck: z.literal(true),
  contactAfterConsent: z.boolean().default(false),
  source: optionalTrimmed(60),
  utm: z.record(z.string(), z.string().max(120)).optional(),
});

export type MemberInput = z.input<typeof memberSchema>;
export type RegistrationInput = z.input<typeof registrationSchema>;
export type Registration = z.output<typeof registrationSchema>;

/** Tracked-link source: ?src= or utm_source, lowercased, safe characters only. */
export function normalizeSource(raw: string | null | undefined): string | undefined {
  const v = (raw ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
  return v || undefined;
}
