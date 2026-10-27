import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ADMIN_SEARCH_MAX_LENGTH,
  ADMIN_SEARCH_MIN_LENGTH,
  normalizeAdminSearchQuery,
  type AdminSearchGroup,
  type AdminSearchHit,
  type AdminSearchResponse,
  type AdminSearchType,
} from "@/lib/admin/console";

/*
 * Admin omnisearch (Cmd+K) behind GET /api/admin/search. One explicit-column
 * ILIKE query per entity, fanned out with Promise.allSettled and ranked in
 * TypeScript. Students are minors, so: never select secret columns (tokens,
 * password hashes, legal names, birth dates, parent contacts), mask emails
 * and phones in subtitles, and put only record IDs in hrefs. The caller must
 * have checked the admin role and passes the service-role client.
 */

export const SEARCH_TYPES: readonly AdminSearchType[] = [
  "user",
  "dm_lead",
  "line_contact",
  "shift_application",
  "shift_round",
  "expert",
  "map",
  "talent",
  "hackathon_participant",
];

export const SEARCH_LABELS: Record<AdminSearchType, string> = {
  user: "People",
  dm_lead: "DM leads",
  line_contact: "LINE contacts",
  shift_application: "SHIFT applications",
  shift_round: "SHIFT rounds",
  expert: "Experts",
  map: "Learning maps",
  talent: "Talent",
  hackathon_participant: "Hackathon participants",
};

export const MIN_QUERY_LENGTH = ADMIN_SEARCH_MIN_LENGTH;
export const MAX_QUERY_LENGTH = ADMIN_SEARCH_MAX_LENGTH;
export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 10;
export const MAX_TOTAL_HITS = 40;
export const ENTITY_TIMEOUT_MS = 1500;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface AdminSearchInput {
  q: string;
  types: AdminSearchType[];
  limit: number;
}

/**
 * Trim, NFC, drop control characters and leading @, collapse spaces, cap
 * length. Shared with the palette (lib/admin/console.ts), so both sides agree
 * on how long a query is.
 */
export const normalizeQuery = normalizeAdminSearchQuery;

export function parseSearchParams(
  params: URLSearchParams,
): { ok: true; value: AdminSearchInput } | { ok: false; error: string } {
  const q = normalizeQuery(params.get("q"));
  if (q.length < MIN_QUERY_LENGTH) {
    return { ok: false, error: `Type at least ${MIN_QUERY_LENGTH} characters.` };
  }
  const requested = (params.get("types") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is AdminSearchType => (SEARCH_TYPES as readonly string[]).includes(t));
  const types = requested.length ? [...new Set(requested)] : [...SEARCH_TYPES];
  const parsedLimit = Number.parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  return { ok: true, value: { q, types, limit } };
}

export type QueryShape = "uuid" | "email" | "digits" | "text";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_LIKE = /^\+?[\d\s-]+$/;

/** What the query looks like, which decides the columns searched. */
export function detectShape(q: string): QueryShape {
  if (UUID.test(q)) return "uuid";
  if (EMAIL.test(q)) return "email";
  if (PHONE_LIKE.test(q) && q.replace(/\D/g, "").length >= 3) return "digits";
  return "text";
}

/**
 * Makes user input safe inside an ILIKE pattern and a PostgREST or() list.
 * Removes the wildcards (% and *, which PostgREST reads as %), the backslash
 * escape, and the characters that structure an or() filter (, ( ) "). The
 * underscore stays: as a one-character wildcard it still matches a literal
 * underscore, and handles often contain one.
 */
export function escapeIlike(term: string): string {
  return term.replace(/[%*\\,()"]/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

/** "boonyasit@gmail.com" -> "b***@gmail.com". */
export function maskEmail(email: string | null | undefined): string | null {
  const value = email?.trim();
  if (!value) return null;
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return "***";
  return `${value[0]}***${value.slice(at)}`;
}

/** "081-234-5678" -> "***5678". */
export function maskPhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  return digits.length > 4 ? `***${digits.slice(-4)}` : "***";
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export const SCORE = {
  id: 1000,
  exact: 100,
  prefix: 80,
  wordPrefix: 65,
  substring: 40,
  /** Matched in SQL on a column we do not score (a phone number). */
  other: 20,
  needsAction: 10,
  recencyMax: 10,
} as const;

function fold(value: string): string {
  return value.normalize("NFC").toLowerCase().trim().replace(/^@+/, "");
}

/** Best match of the query against a record's searchable values. */
export function matchScore(query: string, values: readonly (string | null | undefined)[]): number {
  const q = fold(query);
  let best = 0;
  for (const raw of values) {
    if (!raw) continue;
    const value = fold(raw);
    if (!value) continue;
    if (value === q) return SCORE.exact;
    if (value.startsWith(q)) best = Math.max(best, SCORE.prefix);
    else if (value.split(/[\s._\-@/()[\],:]+/).some((w) => w && w.startsWith(q))) {
      best = Math.max(best, SCORE.wordPrefix);
    } else if (value.includes(q)) best = Math.max(best, SCORE.substring);
  }
  return best || SCORE.other;
}

/** Up to +10 for recent records, halving roughly every three weeks. */
export function recencyBoost(at: string | null | undefined, now: Date): number {
  const ms = at ? Date.parse(at) : Number.NaN;
  if (!Number.isFinite(ms)) return 0;
  const days = Math.max(0, (now.getTime() - ms) / 86_400_000);
  return SCORE.recencyMax * Math.exp(-days / 30);
}

export interface Candidate {
  hit: Omit<AdminSearchHit, "score">;
  /** Values the query is scored against (may include unmasked contact data; never returned). */
  fields: (string | null | undefined)[];
  needsAction?: boolean;
  at?: string | null;
}

export function scoreCandidate(c: Candidate, q: string, shape: QueryShape, now: Date): number {
  const base = shape === "uuid" ? SCORE.id : matchScore(q, c.fields);
  const score = base + (c.needsAction ? SCORE.needsAction : 0) + recencyBoost(c.at, now);
  return Math.round(score * 10) / 10;
}

/** Hits within a group by score; groups by their best hit; at most MAX_TOTAL_HITS overall. */
export function rankGroups(groups: AdminSearchGroup[]): AdminSearchGroup[] {
  const sorted = groups
    .map((g) => ({ ...g, hits: [...g.hits].sort((a, b) => b.score - a.score) }))
    .filter((g) => g.hits.length > 0)
    .sort((a, b) => b.hits[0].score - a.hits[0].score);
  let budget = MAX_TOTAL_HITS;
  const out: AdminSearchGroup[] = [];
  for (const group of sorted) {
    if (budget <= 0) break;
    const hits = group.hits.slice(0, budget);
    budget -= hits.length;
    out.push({ ...group, hits });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const join = (...parts: (string | null | undefined | false)[]) =>
  parts.filter((p): p is string => !!p).join(" · ") || undefined;
const handle = (v: unknown) => {
  const h = str(v)?.replace(/^@+/, "");
  return h ? `@${h}` : null;
};
const day = (v: unknown) => str(v)?.slice(0, 10) ?? null;

export interface SearchEntity {
  type: AdminSearchType;
  table: string;
  /** Explicit column list. Never `*`, never a secret column. */
  select: string;
  /** Columns searched with ILIKE %q%. */
  text: string[];
  /** Column matched exactly (case-insensitive) when the query is an email. */
  email?: string;
  /** Columns also searched when the query is mostly digits. */
  phone?: string[];
  /** Integer column matched when the query names a number ("round 3", "3"). */
  number?: string;
  order: string;
  toCandidate: (row: Row, shape: QueryShape) => Candidate;
}

/** "?cohort=SHIFT%5B3%5D&id=<id>" without importing the overview module. */
function applicationHref(cohort: string | null, id: string): string {
  const params = new URLSearchParams();
  if (cohort) params.set("cohort", cohort);
  params.set("id", id);
  return `/admin/shift/applications?${params.toString()}`;
}

const CLOSED_LEAD_STATUSES = new Set(["converted", "lost", "spam"]);
const PLATFORMS: Record<string, string> = { instagram: "Instagram", facebook: "Facebook" };

export const SEARCH_ENTITIES: Record<AdminSearchType, SearchEntity> = {
  user: {
    type: "user",
    table: "profiles",
    select: "id, username, full_name, email, created_at",
    text: ["username", "full_name", "email"],
    email: "email",
    order: "created_at",
    toCandidate: (r) => {
      const name = str(r.full_name);
      const user = handle(r.username);
      const id = String(r.id);
      return {
        hit: {
          type: "user",
          id,
          title: name ?? user ?? "User",
          subtitle: join(name ? user : null, maskEmail(str(r.email))),
          href: `/admin/users?id=${encodeURIComponent(id)}`,
        },
        fields: [str(r.username), name, str(r.email)],
        at: str(r.created_at),
      };
    },
  },
  dm_lead: {
    type: "dm_lead",
    table: "dm_conversations",
    select:
      "id, username, display_name, platform, lead_status, stage, last_message_direction, last_message_at",
    text: ["username", "display_name"],
    order: "last_message_at",
    toCandidate: (r) => {
      const id = String(r.id);
      const status = str(r.lead_status);
      const waiting = r.last_message_direction === "inbound" && !CLOSED_LEAD_STATUSES.has(status ?? "");
      const stage = str(r.stage);
      return {
        hit: {
          type: "dm_lead",
          id,
          title: handle(r.username) ?? str(r.display_name) ?? "DM lead",
          subtitle: join(
            PLATFORMS[String(r.platform)] ?? "DM",
            status,
            stage && stage !== "unknown" ? stage : null,
            waiting ? "waiting for reply" : null,
          ),
          ...(status ? { badges: [status] } : {}),
          href: `/admin/dm-leads/${encodeURIComponent(id)}`,
        },
        fields: [str(r.username), str(r.display_name)],
        needsAction: waiting,
        at: str(r.last_message_at),
      };
    },
  },
  line_contact: {
    type: "line_contact",
    table: "line_contacts",
    select: "id, display_name, is_following, last_message_direction, last_message_at, unread_count",
    text: ["display_name"],
    order: "last_message_at",
    toCandidate: (r) => {
      const id = String(r.id);
      const following = r.is_following !== false;
      const waiting = following && r.last_message_direction === "inbound";
      const unread = typeof r.unread_count === "number" ? r.unread_count : 0;
      return {
        hit: {
          type: "line_contact",
          id,
          title: str(r.display_name) ?? "LINE contact",
          subtitle: join(
            "LINE",
            following ? null : "unfollowed",
            waiting ? "waiting for reply" : null,
            unread > 0 ? `${unread} unread` : null,
          ),
          href: `/admin/line?c=${encodeURIComponent(id)}`,
        },
        fields: [str(r.display_name)],
        needsAction: waiting,
        at: str(r.last_message_at),
      };
    },
  },
  shift_application: {
    type: "shift_application",
    table: "shift_applications",
    // Never join_token, parent_contact, user_id or free text.
    select:
      "id, cohort, full_name, nickname, ig_handle, discord_handle, discord_username, status, paid_at, discord_joined_at, created_at",
    text: ["full_name", "nickname", "ig_handle", "discord_handle", "discord_username"],
    order: "created_at",
    toCandidate: (r) => {
      const id = String(r.id);
      const cohort = str(r.cohort);
      const status = str(r.status);
      const nickname = str(r.nickname);
      const ig = handle(r.ig_handle);
      return {
        hit: {
          type: "shift_application",
          id,
          title: nickname && ig ? `${nickname} (${ig})` : (nickname ?? ig ?? "Applicant"),
          subtitle: join(
            cohort,
            status,
            r.paid_at ? "paid" : null,
            r.discord_joined_at ? "in Discord" : null,
          ),
          badges: [cohort, status].filter((b): b is string => !!b),
          href: applicationHref(cohort, id),
        },
        fields: [
          nickname,
          str(r.ig_handle),
          str(r.full_name),
          str(r.discord_handle),
          str(r.discord_username),
        ],
        needsAction: status === "new",
        at: str(r.created_at),
      };
    },
  },
  shift_round: {
    type: "shift_round",
    table: "shift_rounds",
    select: "id, number, title_th, title_en, status, starts_at, application_cohort",
    text: ["title_th", "title_en", "application_cohort"],
    number: "number",
    order: "number",
    toCandidate: (r) => {
      const id = String(r.id);
      const title = str(r.title_en) ?? str(r.title_th);
      return {
        hit: {
          type: "shift_round",
          id,
          title: title ? `Round ${r.number}: ${title}` : `Round ${r.number}`,
          subtitle: join(str(r.status), str(r.application_cohort), day(r.starts_at)),
          href: `/admin/shift/rounds/${encodeURIComponent(id)}`,
        },
        fields: [
          str(r.title_en),
          str(r.title_th),
          str(r.application_cohort),
          `round ${r.number}`,
          String(r.number ?? ""),
        ],
        at: str(r.starts_at),
      };
    },
  },
  expert: {
    type: "expert",
    table: "expert_profiles",
    // Never claim_token, interview data or request metadata.
    select: "id, name, title, company, email, field_category, status, created_at",
    text: ["name", "title", "company", "email"],
    email: "email",
    order: "created_at",
    toCandidate: (r) => {
      const id = String(r.id);
      const role = [str(r.title), str(r.company)].filter(Boolean).join(", ");
      const status = str(r.status);
      return {
        hit: {
          type: "expert",
          id,
          title: str(r.name) ?? "Expert",
          subtitle: join(role || null, status, maskEmail(str(r.email))),
          ...(status ? { badges: [status] } : {}),
          href: `/admin/experts?id=${encodeURIComponent(id)}`,
        },
        fields: [str(r.name), str(r.title), str(r.company), str(r.email)],
        needsAction: status === "pending",
        at: str(r.created_at),
      };
    },
  },
  map: {
    type: "map",
    table: "learning_maps",
    select: "id, title, category, visibility, created_at",
    text: ["title"],
    order: "created_at",
    toCandidate: (r) => {
      const id = String(r.id);
      return {
        hit: {
          type: "map",
          id,
          title: str(r.title) ?? "Untitled map",
          subtitle: join(str(r.category), str(r.visibility)),
          href: `/map/${encodeURIComponent(id)}`,
        },
        fields: [str(r.title)],
        at: str(r.created_at),
      };
    },
  },
  talent: {
    type: "talent",
    table: "talent_profiles",
    // phone is read only to mask it; age and line_id are never read.
    select: "id, full_name, nickname, school, track, verified, phone, created_at",
    text: ["full_name", "nickname", "school"],
    phone: ["phone"],
    order: "created_at",
    toCandidate: (r, shape) => {
      const id = String(r.id);
      const verified = r.verified === true;
      return {
        hit: {
          type: "talent",
          id,
          title: str(r.nickname) ?? "Talent profile",
          subtitle: join(
            str(r.track),
            str(r.school),
            verified ? "verified" : "not verified",
            shape === "digits" ? maskPhone(str(r.phone)) : null,
          ),
          href: `/admin/talent?id=${encodeURIComponent(id)}`,
        },
        fields: [str(r.nickname), str(r.full_name), str(r.school)],
        needsAction: !verified,
        at: str(r.created_at),
      };
    },
  },
  hackathon_participant: {
    type: "hackathon_participant",
    table: "hackathon_participants",
    // Never password_hash.
    select:
      "id, name, display_name, email, phone, university, instagram_handle, discord_username, created_at",
    text: ["name", "display_name", "email", "instagram_handle", "discord_username"],
    email: "email",
    phone: ["phone"],
    order: "created_at",
    toCandidate: (r, shape) => {
      const id = String(r.id);
      return {
        hit: {
          type: "hackathon_participant",
          id,
          title: str(r.display_name) ?? str(r.name) ?? "Participant",
          subtitle: join(
            str(r.university),
            maskEmail(str(r.email)),
            shape === "digits" ? maskPhone(str(r.phone)) : null,
          ),
          href: "/admin/hackathon/participants",
        },
        fields: [
          str(r.display_name),
          str(r.name),
          str(r.email),
          str(r.instagram_handle),
          str(r.discord_username),
        ],
        at: str(r.created_at),
      };
    },
  },
};

// ---------------------------------------------------------------------------
// Query plans
// ---------------------------------------------------------------------------

export type FilterPlan =
  | { kind: "eq"; column: string; value: string }
  | { kind: "ilike"; column: string; pattern: string }
  | { kind: "or"; expression: string };

const ROUND_NUMBER = /^(?:shift|round|รอบ)?\s*\[?\s*(\d{1,3})\s*\]?$/i;

/** The PostgREST filter for one entity and query, or null to skip the entity. */
export function filterPlan(entity: SearchEntity, q: string, shape: QueryShape): FilterPlan | null {
  if (shape === "uuid") return { kind: "eq", column: "id", value: q.toLowerCase() };
  if (shape === "email") {
    const pattern = escapeIlike(q);
    return entity.email && pattern ? { kind: "ilike", column: entity.email, pattern } : null;
  }
  const term = escapeIlike(q);
  if (!term) return null;
  const parts = entity.text.map((column) => `${column}.ilike.%${term}%`);
  if (shape === "digits" && entity.phone) {
    const digits = q.replace(/\D/g, "");
    parts.push(...entity.phone.map((column) => `${column}.ilike.%${digits}%`));
  }
  const round = entity.number ? ROUND_NUMBER.exec(q) : null;
  if (entity.number && round) parts.push(`${entity.number}.eq.${Number.parseInt(round[1], 10)}`);
  return { kind: "or", expression: parts.join(",") };
}

async function searchEntity(
  db: SupabaseClient,
  entity: SearchEntity,
  input: AdminSearchInput,
  shape: QueryShape,
  now: Date,
): Promise<AdminSearchGroup | null> {
  const plan = filterPlan(entity, input.q, shape);
  if (!plan) return null;
  let query = db.from(entity.table).select(entity.select);
  if (plan.kind === "eq") query = query.eq(plan.column, plan.value);
  else if (plan.kind === "ilike") query = query.ilike(plan.column, plan.pattern);
  else query = query.or(plan.expression);
  const { data, error } = await query
    .order(entity.order, { ascending: false, nullsFirst: false })
    .limit(Math.min(input.limit * 3, 30))
    .abortSignal(AbortSignal.timeout(ENTITY_TIMEOUT_MS));
  if (error) throw new Error(`${entity.type} search failed`);
  const hits = ((data ?? []) as unknown as Row[])
    .map((row) => {
      const candidate = entity.toCandidate(row, shape);
      return { ...candidate.hit, score: scoreCandidate(candidate, input.q, shape, now) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit);
  return { type: entity.type, label: SEARCH_LABELS[entity.type], hits };
}

/**
 * Searches every requested entity in parallel. A failed or slow entity is
 * dropped and marks the response partial; the rest still return.
 */
export async function searchAdmin(
  db: SupabaseClient,
  input: AdminSearchInput,
  now: Date = new Date(),
): Promise<AdminSearchResponse> {
  const started = Date.now();
  const shape = detectShape(input.q);
  const settled = await Promise.allSettled(
    input.types.map((type) => searchEntity(db, SEARCH_ENTITIES[type], input, shape, now)),
  );
  const groups = settled.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  return {
    q: input.q,
    tookMs: Date.now() - started,
    partial: settled.some((r) => r.status === "rejected"),
    groups: rankGroups(groups),
  };
}
