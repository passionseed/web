import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { LinkUpsertBody } from "@/lib/radar-guide/admin-social";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  countLinkClicks,
  getRadarLink,
  isMissingRadarGuideTable,
  isPublishedFieldSlug,
  listRadarLinks,
  upsertRadarLink,
  type RadarAdminDb,
} from "@/lib/supabase/radar-guide-admin";

export const dynamic = "force-dynamic";

const PUBLISHED_FIELDS_TAG = "published-radar-fields";
const CLICK_WINDOW_DAYS = 30;

function missingTablesResponse() {
  return NextResponse.json(
    { error: "Radar links are not installed yet. Apply the pending migrations." },
    { status: 503 }
  );
}

/** GET: every short link with its clicks in the last 30 days. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const db = admin.value.supabase as unknown as RadarAdminDb;
    const since = new Date(Date.now() - CLICK_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [links, clicks] = await Promise.all([listRadarLinks(db), countLinkClicks(db, since)]);
    return NextResponse.json({
      links: links.map((link) => ({ ...link, clicks30d: clicks.get(link.code) ?? 0 })),
    });
  } catch (error) {
    if (isMissingRadarGuideTable(error)) return missingTablesResponse();
    return safeServerError("Failed to load radar links", error);
  }
}

/** PUT: create or update one short link by code. `ig`, `tt` and `hub-ig` stay on the hub. */
export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = LinkUpsertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid link", issues: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const db = admin.value.supabase as unknown as RadarAdminDb;
    const input = parsed.data;
    if (input.fieldSlug && !(await isPublishedFieldSlug(db, input.fieldSlug))) {
      return NextResponse.json({ error: "Point links at a published career or at the hub." }, { status: 422 });
    }
    // A reel's DM link already sits in sent DMs: its target follows the reel mapping, not this editor.
    const existing = await getRadarLink(db, input.code);
    if (
      existing?.reel_id &&
      (existing.field_slug !== input.fieldSlug || (existing.chapter_key ?? null) !== (input.pageKey ?? null))
    ) {
      return NextResponse.json(
        { error: "This link belongs to a reel. Change the reel's career or page in the mapper instead." },
        { status: 409 }
      );
    }

    const link = await upsertRadarLink(db, input, admin.value.userId);
    revalidateTag(PUBLISHED_FIELDS_TAG, { expire: 0 });
    return NextResponse.json({ link });
  } catch (error) {
    if (isMissingRadarGuideTable(error)) return missingTablesResponse();
    return safeServerError("Failed to save radar link", error);
  }
}
