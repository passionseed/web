import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { BUDDY_OWE_KEYS, BUDDY_PASS_CODE_RE, DEFAULT_BUDDY_OWE } from "./buddy-pass";
import { HEARD_FROM_VALUES } from "./heard-from";
import { isRudeTeamName } from "./team-name";

/**
 * Elemental Hackathon sign-up: who can register, what they pay, and when
 * sign-up is open. Shared by the form (client) and the API route (server),
 * so both check the same rules.
 */

/** Under this age a parent's consent is required (Big, 2026-11-20). */
export const ADULT_AGE = 20;

/**
 * ฿199 alone, ฿149 a person in a group. A person who creates or joins a team
 * pays the group price on their own slip, even before friends join: if the
 * team ends up with one paid member, we let it go (Big, 2026-11-23).
 */
export function elementalPriceBaht(memberCount: number, inTeam = false): number {
  if (!Number.isInteger(memberCount) || memberCount < 1) return 0;
  return memberCount === 1 && !inTeam ? ELEMENTAL.priceBaht : ELEMENTAL.groupPriceBaht * memberCount;
}

/**
 * School year, picked on the sign-up form (Big, 2026-11-28: "let them put
 * their ม 3/4/5/6"). The event is for M.3 to M.6; "other" is for anyone else
 * (vocational, gap year), so nobody is stopped at the form.
 */
export const GRADE_VALUES = ["m3", "m4", "m5", "m6", "other"] as const;
export type Grade = (typeof GRADE_VALUES)[number];
export const GRADE_LABEL_TH: Record<Grade, string> = {
  m3: "ม.3",
  m4: "ม.4",
  m5: "ม.5",
  m6: "ม.6",
  other: "อื่น",
};

/** Team invite codes: 12 hex characters, made by the database. */
export const INVITE_CODE_RE = /^[0-9a-f]{12}$/;

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
    /** Optional so forms already open in a tab before the field existed still submit. */
    grade: z.enum(GRADE_VALUES).optional(),
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
  /**
   * solo: alone (maybe matched); create: start a team; join: join one by its
   * invite code; buddy: one friend on a paid solo sign-up's buddy pass.
   */
  teamMode: z.enum(["solo", "create", "join", "buddy"]).default("solo"),
  teamName: optionalTrimmed(80),
  inviteCode: z.string().regex(INVITE_CODE_RE).optional(),
  passCode: z.string().regex(BUDDY_PASS_CODE_RE).optional(),
  buddyOwe: z.enum(BUDDY_OWE_KEYS).catch(DEFAULT_BUDDY_OWE).optional(),
  members: z.array(memberSchema).min(1).max(ELEMENTAL.maxGroupSize),
  contactEmail: z.string().trim().toLowerCase().email().max(200),
  contactPhone: thaiPhone,
  contactLineId: optionalTrimmed(60),
  wantsTeamMatching: z.boolean().default(false),
  noRefundAck: z.literal(true),
  contactAfterConsent: z.boolean().default(false),
  /** Self-reported "where did you find the post". Optional so older cached forms still submit. */
  heardFrom: z.enum(HEARD_FROM_VALUES).optional(),
  source: optionalTrimmed(60),
  utm: z.record(z.string(), z.string().max(120)).optional(),
}).superRefine((r, ctx) => {
  if (r.teamMode === "create" && !r.teamName) {
    ctx.addIssue({ code: "custom", path: ["teamName"], message: "required" });
  }
  if (r.teamName && isRudeTeamName(r.teamName)) {
    ctx.addIssue({ code: "custom", path: ["teamName"], message: "rude" });
  }
  if (r.teamMode === "join" && !r.inviteCode) {
    ctx.addIssue({ code: "custom", path: ["inviteCode"], message: "required" });
  }
  if (r.teamMode === "buddy") {
    if (!r.passCode) ctx.addIssue({ code: "custom", path: ["passCode"], message: "required" });
    // A pass is for one friend.
    if (r.members.length !== 1) ctx.addIssue({ code: "custom", path: ["members"], message: "one" });
  }
});

export type MemberInput = z.input<typeof memberSchema>;
export type RegistrationInput = z.input<typeof registrationSchema>;
export type Registration = z.output<typeof registrationSchema>;

/** Tracked-link source: ?src= or utm_source, lowercased, safe characters only. */
export function normalizeSource(raw: string | null | undefined): string | undefined {
  const v = (raw ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
  return v || undefined;
}
