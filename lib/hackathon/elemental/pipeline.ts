import { z } from "zod";

import { bangkokDate, daysBetween } from "./bangkok-date";
import { ELEMENTAL_TARGETS, OWNERS, type Owner } from "./targets";

/**
 * Sponsor, partner and speaker pipeline for the Elemental hackathon. Shared
 * by the API routes (validation) and the admin board (types, progress).
 * Pure: no database, no network.
 */

export const PIPELINE_KINDS = ["sponsor", "partner", "speaker"] as const;
export type PipelineKind = (typeof PIPELINE_KINDS)[number];

export const PIPELINE_STAGES = ["to_contact", "contacted", "talking", "yes", "signed", "no"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Board columns, left to right. "no" is a separate, collapsed pile. */
export const BOARD_STAGES = ["to_contact", "contacted", "talking", "yes", "signed"] as const satisfies readonly PipelineStage[];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  talking: "Talking",
  yes: "Yes",
  signed: "Signed",
  no: "No",
};

export const KIND_LABEL: Record<PipelineKind, string> = {
  sponsor: "Sponsors",
  partner: "Partners",
  speaker: "Speakers",
};

export const PIPELINE_ELEMENTS = ["water", "earth", "air", "fire", "aether"] as const;
export type PipelineElement = (typeof PIPELINE_ELEMENTS)[number];

export const ELEMENT_LABEL: Record<PipelineElement, string> = {
  water: "Water",
  earth: "Earth",
  air: "Air",
  fire: "Fire",
  aether: "Aether",
};

/** Stages that count as a commitment. */
export const COMMITTED_STAGES: readonly PipelineStage[] = ["yes", "signed"];

/** Moving into one of these needs a next step and a date, so nothing sits there without a plan. */
export const NEEDS_NEXT_STEP: readonly PipelineStage[] = ["contacted", "talking", "yes"];

/** Open conversations that go stale when nobody touches them. */
export const STALE_STAGES: readonly PipelineStage[] = ["contacted", "talking"];
/** A card in a stale stage turns red after this many days without a touch. */
export const STALE_AFTER_DAYS = 2;

/**
 * Chance that a deal in each stage ends up signed. These are guesses, not
 * measured rates: they only weight the column totals so a full "To contact"
 * column does not look like money.
 */
export const STAGE_WEIGHT_GUESS: Record<PipelineStage, number> = {
  to_contact: 0.05,
  contacted: 0.1,
  talking: 0.3,
  yes: 0.8,
  signed: 1,
  no: 0,
};

/** Sponsor packages the team offers, in baht (cash or merchandise of the same value). */
export const AMOUNT_PRESETS = [10000, 5000, 1000] as const;

export type PipelineItem = {
  id: string;
  event_slug: string;
  kind: PipelineKind;
  name: string;
  organisation: string | null;
  element: PipelineElement | null;
  stage: PipelineStage;
  owner: string | null;
  amount_thb: number | null;
  why_fit: string | null;
  reach: string | null;
  next_step: string | null;
  next_step_due: string | null;
  notes: string | null;
  position: number | null;
  /** True when the amount is merchandise (in kind), not cash. */
  in_kind: boolean;
  stage_changed_at: string | null;
  last_touched_at: string | null;
  /** Short owner name of whoever saved last. Never an email. */
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Validation

/** Links and domain paths: public pages, whose long ids are not phone numbers. */
const URL_LIKE = /(?:https?:\/\/|www\.)\S+|\b[\w-]+(?:\.[\w-]+)+\/\S*/gi;

/**
 * A Thai phone number written in the usual ways: 0 or +66, then 8 or 9 more
 * digits, optionally split by spaces, dots, dashes or brackets. Links are
 * left out first, and digits must not run on, so a Facebook page id or a
 * date and time ("2026-11-30 10.00") never reads as a phone number.
 */
const THAI_PHONE = /(?:^|[^\d])(?:\+?66|0)[\s.()-]{0,2}\d(?:[\s.()-]{0,2}\d){7,8}(?!\d)/;

export function looksLikePhoneNumber(value: string): boolean {
  return THAI_PHONE.test(value.replace(URL_LIKE, " "));
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

/** The pipeline never stores personal phone numbers, in any field. */
function noPhone<O extends string | null, I>(
  schema: z.ZodType<O, z.ZodTypeDef, I>,
  label: string,
): z.ZodType<O, z.ZodTypeDef, I> {
  return schema.refine((v) => typeof v !== "string" || !looksLikePhoneNumber(v), {
    message: `${label} cannot hold a phone number. Keep personal contact details out of the pipeline.`,
  });
}

const reachField = optionalText(500).refine((v) => !v || !looksLikePhoneNumber(v), {
  message: "Reach is a public page or channel, never a personal phone number.",
});

const dateField = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-30")
    .refine((v) => {
      // Round-trip, because Date.parse rolls 2026-02-31 over instead of failing.
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, "Not a real date")
    .nullish()
    .transform((v) => v ?? null),
);

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const ownerField = z.preprocess(
  emptyToNull,
  z
    .enum(OWNERS, { errorMap: () => ({ message: `Owner is one of ${OWNERS.join(", ")}` }) })
    .nullish()
    .transform((v) => v ?? null),
);

const fields = {
  kind: z.enum(PIPELINE_KINDS),
  name: noPhone(z.string().trim().min(1, "Name is required").max(200), "Name"),
  organisation: noPhone(optionalText(200), "Organisation"),
  element: z.enum(PIPELINE_ELEMENTS).nullish().transform((v) => v ?? null),
  stage: z.enum(PIPELINE_STAGES),
  owner: ownerField,
  amount_thb: z.number().int().min(0).max(10_000_000).nullish().transform((v) => v ?? null),
  why_fit: noPhone(optionalText(2000), "Why they fit"),
  reach: reachField,
  next_step: noPhone(optionalText(500), "Next step"),
  next_step_due: dateField,
  notes: noPhone(optionalText(5000), "Notes"),
  position: z.number().int().min(0).max(1_000_000).nullish().transform((v) => v ?? null),
  in_kind: z.boolean(),
  updated_by: ownerField,
};

/** Why a move into `stage` cannot happen yet, or null when it can. Shared by the API and the board. */
export function stageMoveProblem(
  stage: PipelineStage,
  v: { next_step?: string | null; next_step_due?: string | null; append_note?: string | null },
): string | null {
  if (NEEDS_NEXT_STEP.includes(stage) && (!v.next_step?.trim() || !v.next_step_due?.trim())) {
    return `Moving to ${STAGE_LABEL[stage]} needs a next step and a date`;
  }
  if (stage === "no" && !v.append_note?.trim()) return "Moving to No needs a one-line reason";
  return null;
}

/**
 * Why a patch with no stage cannot clear the plan of a card that is already
 * contacted, talking or yes, or null when it can. An open conversation keeps
 * its next step and date: they can change, not vanish. `current` is the row
 * as it is now.
 */
export function clearsOpenPlanProblem(
  current: Pick<PipelineItem, "stage" | "next_step" | "next_step_due">,
  patch: Pick<PipelineUpdateInput, "stage" | "next_step" | "next_step_due">,
): string | null {
  if (patch.stage) return null; // A move is checked by stageMoveProblem.
  if (!NEEDS_NEXT_STEP.includes(current.stage)) return null;
  const step = patch.next_step !== undefined ? patch.next_step : current.next_step;
  const due = patch.next_step_due !== undefined ? patch.next_step_due : current.next_step_due;
  if (step?.trim() && due?.trim()) return null;
  return `${STAGE_LABEL[current.stage]} needs a next step and a date`;
}

/** True when a patch would empty the next step or its date, so the row must be read first. */
export function patchClearsPlan(patch: Pick<PipelineUpdateInput, "stage" | "next_step" | "next_step_due">): boolean {
  return !patch.stage && (patch.next_step === null || patch.next_step_due === null);
}

export const pipelineCreateSchema = z
  .object({
    ...fields,
    stage: fields.stage.default("to_contact"),
    in_kind: fields.in_kind.default(false),
  })
  .superRefine((v, ctx) => {
    // A new card has no notes to hold a reason, so "no" is not a starting stage.
    const problem = v.stage === "no" ? "Add it first, then move it to No" : stageMoveProblem(v.stage, v);
    if (problem) ctx.addIssue({ code: "custom", path: ["stage"], message: problem });
  });
export type PipelineCreateInput = z.infer<typeof pipelineCreateSchema>;

export type PipelineUpdateInput = Partial<Omit<PipelineCreateInput, "updated_by">> & {
  updated_by?: Owner | null;
  /** Sets last_touched_at to now. */
  touched?: true;
  /** One line added to the end of notes (never replaces them). */
  append_note?: string;
};

export const pipelineUpdateSchema = z
  .object({
    kind: fields.kind.optional(),
    name: fields.name.optional(),
    organisation: fields.organisation.optional(),
    element: fields.element.optional(),
    stage: fields.stage.optional(),
    owner: fields.owner.optional(),
    amount_thb: fields.amount_thb.optional(),
    why_fit: fields.why_fit.optional(),
    reach: fields.reach.optional(),
    next_step: fields.next_step.optional(),
    next_step_due: fields.next_step_due.optional(),
    notes: fields.notes.optional(),
    position: fields.position.optional(),
    in_kind: fields.in_kind.optional(),
    updated_by: fields.updated_by.optional(),
    touched: z.literal(true).optional(),
    append_note: noPhone(z.string().trim().min(1).max(300), "The reason").optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.stage) return;
    const problem = stageMoveProblem(v.stage, v);
    if (problem) ctx.addIssue({ code: "custom", path: ["stage"], message: problem });
  })
  .transform((v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)) as PipelineUpdateInput)
  .refine(
    (v) => Object.keys(v).some((k) => k !== "updated_by"),
    "Nothing to change",
  );

export const MAX_IMPORT_ROWS = 300;

export const pipelineImportSchema = z.object({
  rows: z.array(pipelineCreateSchema).min(1, "No rows to import").max(MAX_IMPORT_ROWS),
});

// ---------------------------------------------------------------------------
// Board math

export type ColumnSummary = {
  stage: PipelineStage;
  count: number;
  /** Cash only. Merchandise never counts as baht in the totals. */
  baht: number;
  /** Merchandise value, kept apart from cash. */
  inKind: number;
  /** Cash times the stage's guessed chance of signing (STAGE_WEIGHT_GUESS). */
  weighted: number;
};

export function columnSummaries(items: readonly PipelineItem[], kind: PipelineKind): Record<PipelineStage, ColumnSummary> {
  const out = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, { stage: s, count: 0, baht: 0, inKind: 0, weighted: 0 }]),
  ) as Record<PipelineStage, ColumnSummary>;
  for (const it of items) {
    if (it.kind !== kind) continue;
    const col = out[it.stage];
    col.count += 1;
    const amount = it.amount_thb ?? 0;
    if (it.in_kind) col.inKind += amount;
    else col.baht += amount;
  }
  for (const col of Object.values(out)) col.weighted = Math.round(col.baht * STAGE_WEIGHT_GUESS[col.stage]);
  return out;
}

/** Sponsor money, cash and merchandise kept apart. Only signed cash fills the prize pool bar. */
export type SponsorMoney = {
  cashSigned: number;
  /** Cash from sponsors at "yes": promised, not signed. */
  cashYes: number;
  /** Merchandise value from sponsors at yes or signed. */
  inKindValue: number;
};

export function sponsorMoney(items: readonly PipelineItem[]): SponsorMoney {
  const out: SponsorMoney = { cashSigned: 0, cashYes: 0, inKindValue: 0 };
  for (const i of items) {
    if (i.kind !== "sponsor" || !COMMITTED_STAGES.includes(i.stage)) continue;
    const amount = i.amount_thb ?? 0;
    if (i.in_kind) out.inKindValue += amount;
    else if (i.stage === "signed") out.cashSigned += amount;
    else out.cashYes += amount;
  }
  return out;
}

export type PipelineProgress = SponsorMoney & {
  sponsorsSigned: number;
  sponsorsYes: number;
  sponsorsTalking: number;
  sponsorsTarget: number;
  sponsorsBy: string;
  prizePool: number;
  elementsCovered: PipelineElement[];
  elementsMissing: PipelineElement[];
  voicesTarget: number;
  voicesBy: string;
  partnersCommitted: number;
};

export function pipelineProgress(items: readonly PipelineItem[]): PipelineProgress {
  const committed = items.filter((i) => COMMITTED_STAGES.includes(i.stage));
  const covered = new Set(
    committed.filter((i) => i.kind === "speaker" && i.element).map((i) => i.element as PipelineElement),
  );
  const sponsorsAt = (stage: PipelineStage) => items.filter((i) => i.kind === "sponsor" && i.stage === stage).length;
  return {
    ...sponsorMoney(items),
    sponsorsSigned: sponsorsAt("signed"),
    sponsorsYes: sponsorsAt("yes"),
    sponsorsTalking: sponsorsAt("talking"),
    sponsorsTarget: ELEMENTAL_TARGETS.sponsors.signed,
    sponsorsBy: ELEMENTAL_TARGETS.sponsors.by,
    prizePool: ELEMENTAL_TARGETS.prizePoolBaht,
    elementsCovered: PIPELINE_ELEMENTS.filter((e) => covered.has(e)),
    elementsMissing: PIPELINE_ELEMENTS.filter((e) => !covered.has(e)),
    voicesTarget: ELEMENTAL_TARGETS.voices.elements,
    voicesBy: ELEMENTAL_TARGETS.voices.by,
    partnersCommitted: committed.filter((i) => i.kind === "partner").length,
  };
}

// ---------------------------------------------------------------------------
// Staleness

/** The latest of stage change, manual touch and creation. */
export function lastTouchAt(item: Pick<PipelineItem, "stage_changed_at" | "last_touched_at" | "created_at">): string {
  return [item.stage_changed_at, item.last_touched_at, item.created_at]
    .filter((v): v is string => Boolean(v))
    .reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}

/** Whole Bangkok days since the card was last touched (0 when touched today). */
export function daysSinceTouch(
  item: Pick<PipelineItem, "stage_changed_at" | "last_touched_at" | "created_at">,
  today: string,
): number {
  return Math.max(0, daysBetween(bangkokDate(new Date(lastTouchAt(item))), today));
}

/** Whole Bangkok days since the card entered its stage (or was created). */
export function daysInStage(item: Pick<PipelineItem, "stage_changed_at" | "created_at">, today: string): number {
  return Math.max(0, daysBetween(bangkokDate(new Date(item.stage_changed_at ?? item.created_at)), today));
}

/** Contacted or talking, and nobody has touched it for more than STALE_AFTER_DAYS. */
export function isStale(
  item: Pick<PipelineItem, "stage" | "stage_changed_at" | "last_touched_at" | "created_at">,
  today: string,
): boolean {
  return STALE_STAGES.includes(item.stage) && daysSinceTouch(item, today) > STALE_AFTER_DAYS;
}

// ---------------------------------------------------------------------------
// Saving

/** Add one line to the end of the notes, keeping what is there. */
export function appendNote(existing: string | null, line: string): string {
  const add = line.trim();
  const before = (existing ?? "").replace(/\s+$/, "");
  const joined = before ? `${before}\n${add}` : add;
  return joined.slice(-5000);
}

/**
 * Turn a validated patch into the columns to write, given the row as it is
 * now: stage_changed_at moves only when the stage really changes, a touch
 * stamps last_touched_at, and a note is appended rather than replacing.
 */
export function buildPipelineWrite(
  current: Pick<PipelineItem, "stage" | "notes"> | null,
  patch: PipelineUpdateInput,
  now: Date,
): Record<string, unknown> {
  const { touched, append_note, ...rest } = patch;
  const iso = now.toISOString();
  // updated_by is left alone unless the patch sets it: the API routes always
  // set it from the signed-in admin, never from what the browser sends.
  const write: Record<string, unknown> = { ...rest, updated_at: iso };
  if (rest.stage && current && rest.stage !== current.stage) write.stage_changed_at = iso;
  if (touched) write.last_touched_at = iso;
  if (append_note) write.notes = appendNote(rest.notes !== undefined ? rest.notes : (current?.notes ?? null), append_note);
  return write;
}

/** A dated one-liner for the notes when a card moves to No. */
export function noReasonLine(reason: string, today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  const day = Number.isNaN(d.getTime())
    ? today
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `Said no (${day}): ${reason.trim()}`;
}

/** A next step is overdue when its date is before today (Bangkok) and the item is still open. */
export function isNextStepOverdue(item: Pick<PipelineItem, "next_step_due" | "stage">, today: string): boolean {
  return Boolean(item.next_step_due && item.next_step_due < today && item.stage !== "signed" && item.stage !== "no");
}

/** Overdue or due today, on an open card. */
export function isNextStepDue(item: Pick<PipelineItem, "next_step_due" | "stage">, today: string): boolean {
  return Boolean(item.next_step_due && item.next_step_due <= today && item.stage !== "signed" && item.stage !== "no");
}

/**
 * Dense list order: overdue first, then by next-step date (undated last),
 * then by name.
 */
export function compareForList(today: string) {
  return (a: PipelineItem, b: PipelineItem): number => {
    const ao = isNextStepOverdue(a, today) ? 0 : 1;
    const bo = isNextStepOverdue(b, today) ? 0 : 1;
    return (
      ao - bo ||
      (a.next_step_due ?? "9999").localeCompare(b.next_step_due ?? "9999") ||
      a.name.localeCompare(b.name)
    );
  };
}

/** Case-insensitive text filter over the fields the team scans for. */
export function matchesFilter(item: PipelineItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.organisation, item.owner, item.next_step, STAGE_LABEL[item.stage]]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(q));
}

/** The stage one step left or right on the board ("no" moves back to "talking"). */
export function neighbourStage(stage: PipelineStage, dir: -1 | 1): PipelineStage | null {
  if (stage === "no") return dir === -1 ? "talking" : null;
  const i = BOARD_STAGES.indexOf(stage as (typeof BOARD_STAGES)[number]);
  const next = BOARD_STAGES[i + dir];
  return next ?? null;
}

// ---------------------------------------------------------------------------
// Who saved

/**
 * The owner name for a signed-in admin, from HACKATHON_OWNER_USER_IDS (JSON:
 * Supabase auth user id -> "Big", "Angpao" or "Kirt"). Null when the map is
 * missing or the admin is not in it, so "last saved by" is never a guess.
 */
export function actorFor(userId: string, raw: string | undefined | null): Owner | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const v = (parsed as Record<string, unknown>)[userId];
    return typeof v === "string" ? (OWNERS.find((o) => o.toLowerCase() === v.trim().toLowerCase()) ?? null) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fresh server data on the board

/** How long a card added or deleted here is protected from an older server read. */
export const LOCAL_WRITE_GRACE_MS = 2 * 60 * 1000;

/**
 * Merge a fresh server read into what the board shows. A row this browser
 * saved more recently (newer updated_at, both server times) is kept, a row
 * deleted here in the last two minutes stays gone, and a row added here in
 * the last two minutes stays even when the read was taken before it existed.
 */
export function mergeServerItems(
  local: readonly PipelineItem[],
  incoming: readonly PipelineItem[],
  recentlyDeleted: ReadonlySet<string>,
  recentlyCreated: ReadonlySet<string>,
): PipelineItem[] {
  const localById = new Map(local.map((i) => [i.id, i]));
  const incomingIds = new Set(incoming.map((i) => i.id));
  const out = incoming
    .filter((r) => !recentlyDeleted.has(r.id))
    .map((r) => {
      const l = localById.get(r.id);
      return l && Date.parse(l.updated_at) > Date.parse(r.updated_at) ? l : r;
    });
  for (const l of local) {
    if (recentlyCreated.has(l.id) && !incomingIds.has(l.id)) out.push(l);
  }
  return out;
}
