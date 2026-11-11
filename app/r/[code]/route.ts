import { after, NextRequest, NextResponse } from "next/server";
import { isLinkPreviewBot } from "@/lib/og/linkPreviewBots";
import { detectUaApp } from "@/lib/radar-guide/attribution";
import { clientKey, createClickLimiter } from "@/lib/radar-guide/click-limit";
import {
  defaultGuidePagesFor,
  resolveShortLink,
  RADAR_INVALID_CODE,
  type ShortLinkDeps,
  type ShortLinkResolution,
  type ShortLinkRow,
} from "@/lib/radar-guide/short-links";
import { liveGuideIndex } from "@/lib/radar-guides";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Radar short links: passionseed.org/r/<code> (spec section 1;
 * docs/features/radar-guides-in-code.md 4.2). A code can land on a guide
 * page, e.g. /r/cyber-mythos goes to /radar/cybersecurity/mythos.
 *
 * Always a 302 to a fixed path on this site with `Cache-Control: no-store`.
 * The destination is built from the resolver's site-relative path, never from
 * the query string, so `?to=https://...` and similar cannot redirect away.
 * The click is logged after the response; logging failures are swallowed.
 */

const LINK_COLUMNS =
  "code, field_slug, chapter_key, utm_source, utm_medium, utm_campaign, utm_content, is_active";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Per-instance cap on logged clicks per client per minute (the redirect is never limited). */
const allowClickLog = createClickLimiter();

function databaseDeps(supabase: AdminClient): ShortLinkDeps {
  return {
    async lookup(code) {
      const { data, error } = await supabase
        .from("radar_links")
        .select(LINK_COLUMNS)
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as ShortLinkRow | null) ?? null;
    },
    async isPublishedSlug(slug) {
      // A live code guide renders from code (cover and pages): no lookup needed.
      if (liveGuideIndex(slug)) return true;
      const { data, error } = await supabase
        .from("radar_fields")
        .select("slug")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    // Pure, from the code guide index: no database involved.
    pagesFor: defaultGuidePagesFor,
  };
}

async function resolve(code: string): Promise<ShortLinkResolution> {
  try {
    return await resolveShortLink(code, databaseDeps(createAdminClient()));
  } catch {
    console.error("[radar] short link lookup unavailable");
    // The hub always works, even when the database does not. Aliases keep
    // their channel tags; everything else is tagged as an unknown short link.
    return resolveShortLink(code, {
      lookup: async () => null,
      // Code guides do not need the database, so their links still land on them.
      isPublishedSlug: async (slug) => Boolean(liveGuideIndex(slug)),
      pagesFor: defaultGuidePagesFor,
    });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const resolution = await resolve(code);

  // Site-relative path resolved against this request's own origin.
  const destination = new URL(resolution.path, request.nextUrl.origin);
  const userAgent = request.headers.get("user-agent");

  // Chat apps fetch the link to draw a preview card; that is not a click.
  // Malformed codes are not logged (nothing to count), and each client gets a
  // small per-minute allowance so a loop cannot grow the table or skew counts.
  const logCode = resolution.logCode || RADAR_INVALID_CODE;
  if (!isLinkPreviewBot(userAgent) && logCode !== RADAR_INVALID_CODE && allowClickLog(clientKey(request.headers))) {
    const click = {
      code: logCode,
      field_slug: resolution.fieldSlug,
      // Typed `<alias>-<page>` codes are counted per page (migration 20261111100300).
      page_key: resolution.pageKey,
      ua_app: detectUaApp(userAgent),
    };
    after(async () => {
      try {
        const { error } = await createAdminClient().from("radar_link_clicks").insert(click);
        if (error) console.error("[radar] short link click not logged", error.code || error.message);
      } catch {
        console.error("[radar] short link click logging unavailable");
      }
    });
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
