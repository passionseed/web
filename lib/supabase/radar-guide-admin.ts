/**
 * Admin data access for the Radar guide (spec 6;
 * docs/features/radar-guides-in-code.md 4.2): short links, the funnel views,
 * reel insights and career requests. Guide pages are code (lib/radar-guides),
 * so nothing here reads or writes page content.
 *
 * Every function takes the signed-in user's client (`createClient()` from
 * utils/supabase/server); RLS lets admins through via `is_admin(auth.uid())`.
 * Callers check `requireAdmin()` first. Reel writes go through Unit D's
 * `upsertReel` in lib/supabase/radar-reels.ts, passing this same client.
 *
 * Row types come from lib/radar-guide/types.ts until database.types.ts is
 * regenerated after `supabase db push`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import {
  funnelWeekStart,
  groupByChannelPage,
  groupCareerRequests,
  groupGuidePages,
  reelDmStats,
  reelFunnelRows,
  sumFunnel,
  visitsByContent,
  type CareerRequestGroup,
  type ChannelPageRow,
  type FunnelTotals,
  type GuidePageFunnelRow,
  type RadarGuidePageViewRow,
  type ReelFunnelRow,
} from "@/lib/radar-guide/admin-funnel";
import type { LinkUpsertBodyInput } from "@/lib/radar-guide/admin-social";
import type {
  RadarCareerRequestRow,
  RadarGuideFunnelRow,
  RadarLinkRow,
  RadarReelInsightRow,
  RadarReelRow,
} from "@/lib/radar-guide/types";

// The user client is typed against database.types.ts, which does not know the
// new tables yet; an untyped client keeps these queries compiling.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RadarAdminDb = SupabaseClient<any, "public", any>;

export class RadarGuideAdminError extends Error {
  constructor(
    message: string,
    readonly code: string | null = null
  ) {
    super(message);
    this.name = "RadarGuideAdminError";
  }
}

function fail(action: string, error: { message: string; code?: string } | null): never {
  throw new RadarGuideAdminError(`${action}: ${error?.message ?? "unknown error"}`, error?.code ?? null);
}

/** True when the error means the migrations have not been applied yet. */
export function isMissingRadarGuideTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /does not exist|schema cache|PGRST205|42P01/.test(message);
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export interface RadarGuideFieldMeta {
  id: string;
  slug: string;
  name_th: string | null;
  name_en: string | null;
  is_published: boolean;
}

export async function getGuideField(db: RadarAdminDb, fieldId: string): Promise<RadarGuideFieldMeta | null> {
  const { data, error } = await db
    .from("radar_fields")
    .select("id, slug, name_th, name_en, is_published")
    .eq("id", fieldId)
    .maybeSingle();
  if (error) fail("Failed to read radar field", error);
  return (data as RadarGuideFieldMeta | null) ?? null;
}

/** Published fields for the reel and link pickers, in deck order. */
export async function listPublishedGuideFields(db: RadarAdminDb): Promise<RadarGuideFieldMeta[]> {
  const { data, error } = await db
    .from("radar_fields")
    .select("id, slug, name_th, name_en, is_published")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) fail("Failed to list radar fields", error);
  return (data ?? []) as RadarGuideFieldMeta[];
}

export async function isPublishedFieldSlug(db: RadarAdminDb, slug: string): Promise<boolean> {
  const { data, error } = await db
    .from("radar_fields")
    .select("id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) fail("Failed to check radar field", error);
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Short links
// ---------------------------------------------------------------------------

export async function listRadarLinks(db: RadarAdminDb): Promise<RadarLinkRow[]> {
  const { data, error } = await db
    .from("radar_links")
    .select("*")
    .order("reel_id", { ascending: true, nullsFirst: true })
    .order("code", { ascending: true });
  if (error) fail("Failed to list radar links", error);
  return (data ?? []) as RadarLinkRow[];
}

export async function getRadarLink(db: RadarAdminDb, code: string): Promise<RadarLinkRow | null> {
  const { data, error } = await db.from("radar_links").select("*").eq("code", code).maybeSingle();
  if (error) fail("Failed to read radar link", error);
  return (data as RadarLinkRow | null) ?? null;
}

/** Creates or updates a short link by code. The code is the key and never changes. */
export async function upsertRadarLink(
  db: RadarAdminDb,
  input: LinkUpsertBodyInput,
  actorId: string
): Promise<RadarLinkRow> {
  const values = {
    code: input.code,
    field_slug: input.fieldSlug,
    // The column keeps its name; it holds the code guide page key.
    chapter_key: input.fieldSlug ? input.pageKey ?? null : null,
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_campaign: input.utmCampaign,
    utm_content: input.utmContent ?? null,
    is_active: input.isActive,
    note: input.note?.trim() || null,
  };
  const existing = await getRadarLink(db, input.code);
  const { data, error } = existing
    ? await db.from("radar_links").update(values).eq("code", input.code).select("*").single()
    : await db
        .from("radar_links")
        .insert({ ...values, created_by: actorId })
        .select("*")
        .single();
  if (error || !data) fail("Failed to save radar link", error);
  return data as RadarLinkRow;
}

/** Clicks per code since `sinceIso`. Pilot volumes are small; this reads rows and counts in JS. */
export async function countLinkClicks(
  db: RadarAdminDb,
  sinceIso: string,
  maxRows = 20000
): Promise<Map<string, number>> {
  const { data, error } = await db
    .from("radar_link_clicks")
    .select("code")
    .gte("created_at", sinceIso)
    .limit(maxRows);
  if (error) fail("Failed to count radar link clicks", error);
  const out = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ code: string }>) {
    out.set(row.code, (out.get(row.code) ?? 0) + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Funnel, insights, DM stats
// ---------------------------------------------------------------------------

export async function listFunnelRows(
  db: RadarAdminDb,
  { fromWeek, page }: { fromWeek: string; page?: string | null }
): Promise<RadarGuideFunnelRow[]> {
  let query = db.from("analytics_radar_guide_funnel").select("*").gte("week", fromWeek);
  if (page) query = query.eq("page", page);
  const { data, error } = await query.order("week", { ascending: false }).limit(5000);
  if (error) fail("Failed to read the radar guide funnel", error);
  return (data ?? []) as RadarGuideFunnelRow[];
}

/** Per-page rows from `analytics_radar_guide_pages` (code guide pages), newest week first. */
export async function listGuidePageViews(
  db: RadarAdminDb,
  { fromWeek, slug }: { fromWeek: string; slug?: string | null }
): Promise<RadarGuidePageViewRow[]> {
  let query = db.from("analytics_radar_guide_pages").select("*").gte("week", fromWeek);
  if (slug) query = query.eq("field_slug", slug);
  const { data, error } = await query.order("week", { ascending: false }).limit(5000);
  if (error) fail("Failed to read the radar guide page funnel", error);
  return (data ?? []) as RadarGuidePageViewRow[];
}

export async function listReelInsights(db: RadarAdminDb, reelIds: string[]): Promise<RadarReelInsightRow[]> {
  if (reelIds.length === 0) return [];
  const { data, error } = await db
    .from("radar_reel_insights")
    .select("*")
    .in("reel_id", reelIds)
    .order("captured_on", { ascending: false })
    .limit(5000);
  if (error) fail("Failed to read reel insights", error);
  return (data ?? []) as RadarReelInsightRow[];
}

export interface ReelDmRow {
  reel_id: string | null;
  status: string;
  comment_id: string;
  commenter: string | null;
}

/** DM log rows per reel, with the commenter's IG id for distinct counts. Never returned to the browser raw. */
export async function listReelDmRows(db: RadarAdminDb, reelIds: string[]): Promise<ReelDmRow[]> {
  if (reelIds.length === 0) return [];
  const { data, error } = await db
    .from("radar_comment_dms")
    .select("reel_id, status, comment_id, ig_comments(ig_user_id)")
    .in("reel_id", reelIds)
    .limit(20000);
  if (error) fail("Failed to read radar comment DMs", error);
  return ((data ?? []) as Array<{
    reel_id: string | null;
    status: string;
    comment_id: string;
    ig_comments: { ig_user_id: string | null } | Array<{ ig_user_id: string | null }> | null;
  }>).map((row) => {
    const comment = Array.isArray(row.ig_comments) ? row.ig_comments[0] : row.ig_comments;
    return {
      reel_id: row.reel_id,
      status: row.status,
      comment_id: row.comment_id,
      commenter: comment?.ig_user_id ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Career requests (admin-only free text from minors)
// ---------------------------------------------------------------------------

export type CareerRequestAdminRow = Pick<
  RadarCareerRequestRow,
  "id" | "source" | "from_field_slug" | "request_text" | "matched_field_slug" | "status" | "created_at"
>;

/** Newest first. Session, visit and user ids are not selected: the admin view has no use for them. */
export async function listCareerRequests(db: RadarAdminDb, limit = 500): Promise<CareerRequestAdminRow[]> {
  const { data, error } = await db
    .from("radar_career_requests")
    .select("id, source, from_field_slug, request_text, matched_field_slug, status, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 2000));
  if (error) fail("Failed to list career requests", error);
  return (data ?? []) as CareerRequestAdminRow[];
}

// ---------------------------------------------------------------------------
// Admin page loaders (funnel and requests tabs)
// ---------------------------------------------------------------------------

export interface GuideFunnelView {
  weeks: number;
  page: string | null;
  fromWeek: string;
  pages: Array<{ slug: string; name: string }>;
  byChannelPage: ChannelPageRow[];
  totals: FunnelTotals;
  /** Per code guide page (level), in level order. */
  guidePages: GuidePageFunnelRow[];
  reels: ReelFunnelRow[];
  links: Array<{ code: string; pageKey: string | null; clicks: number; visits: number | null }>;
  error: string | null;
}

const FUNNEL_WEEK_CHOICES = [1, 2, 4, 8, 12];

/** Everything the funnel tab renders. Failures become `error` with empty tables, never a thrown page. */
export async function loadGuideFunnelView(
  db: RadarAdminDb,
  params: { weeks?: string | null; page?: string | null },
  now: Date = new Date()
): Promise<GuideFunnelView> {
  const weeksParam = Number(params.weeks);
  const weeks = FUNNEL_WEEK_CHOICES.includes(weeksParam) ? weeksParam : 4;
  const page = params.page && /^(hub|[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(params.page) ? params.page : null;
  const fromWeek = funnelWeekStart(weeks, now);
  const empty: GuideFunnelView = {
    weeks,
    page,
    fromWeek,
    pages: [],
    byChannelPage: [],
    totals: sumFunnel([]),
    guidePages: [],
    reels: [],
    links: [],
    error: null,
  };
  try {
    const sinceIso = new Date(`${fromWeek}T00:00:00+07:00`).toISOString();
    const pageSlug = page && page !== "hub" ? page : null;
    const [fields, funnel, pageViews, reelRows, links, clicks] = await Promise.all([
      listPublishedGuideFields(db),
      listFunnelRows(db, { fromWeek, page }),
      page === "hub" ? Promise.resolve([]) : listGuidePageViews(db, { fromWeek, slug: pageSlug }),
      db
        .from("radar_reels")
        .select("*")
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(100)
        .then(({ data, error }) => {
          if (error) fail("Failed to list radar reels", error);
          return (data ?? []) as RadarReelRow[];
        }),
      listRadarLinks(db),
      countLinkClicks(db, sinceIso),
    ]);
    const reels = page ? reelRows.filter((reel) => (reel.field_slug ?? "hub") === page) : reelRows;
    const reelIds = reels.map((reel) => reel.id);
    const [insights, dmRows] = await Promise.all([listReelInsights(db, reelIds), listReelDmRows(db, reelIds)]);
    return {
      ...empty,
      pages: fields.map((field) => ({ slug: field.slug, name: field.name_th || field.name_en || field.slug })),
      byChannelPage: groupByChannelPage(funnel),
      totals: sumFunnel(funnel),
      guidePages: groupGuidePages(
        pageViews,
        Object.values(GUIDE_INDEX).filter((guide) => !pageSlug || guide.slug === pageSlug)
      ),
      reels: reelFunnelRows(reels, funnel, insights, reelDmStats(dmRows)),
      links: links
        .filter((link) => !page || (link.field_slug ?? "hub") === page)
        .map((link) => ({
          code: link.code,
          pageKey: link.field_slug ? link.chapter_key : null,
          clicks: clicks.get(link.code) ?? 0,
          visits: link.utm_content ? visitsByContent(funnel, link.utm_source).get(link.utm_content) ?? 0 : null,
        }))
        .filter((link) => link.clicks > 0 || (link.visits ?? 0) > 0),
    };
  } catch (error) {
    return {
      ...empty,
      error: isMissingRadarGuideTable(error)
        ? "The guide funnel needs the pending Radar migrations."
        : `Could not load the funnel. ${error instanceof Error ? error.message : ""}`.trim(),
    };
  }
}

export interface CareerRequestsView {
  groups: CareerRequestGroup[];
  rows: CareerRequestAdminRow[];
  error: string | null;
}

export async function loadCareerRequestsView(db: RadarAdminDb): Promise<CareerRequestsView> {
  try {
    const rows = await listCareerRequests(db, 1000);
    return { rows, groups: groupCareerRequests(rows), error: null };
  } catch (error) {
    return {
      rows: [],
      groups: [],
      error: isMissingRadarGuideTable(error)
        ? "Career requests need the pending Radar migrations."
        : "Could not load career requests.",
    };
  }
}
