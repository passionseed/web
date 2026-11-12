import { NextRequest, NextResponse } from "next/server";

import { addDays, daysBetween, isIsoDay, trailingRange } from "@/lib/meta/marketing/dates";
import {
  CRON_TRAILING_DAYS,
  MARKETING_SOURCES,
  MEDIA_LOOKBACK_DAYS,
  runMetaMarketingSync,
} from "@/lib/meta/marketing/sync";
import type { MarketingSource } from "@/lib/supabase/meta-marketing";

export const maxDuration = 60;

const TIME_BUDGET_MS = 50_000;
/** Longest range one request accepts; longer backfills use the script. */
const MAX_RANGE_DAYS = 93;

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

/**
 * Daily read-only sync of Instagram insights and Meta Ads results.
 *
 * Scheduled: no params, refreshes the last few days. Manual backfill: same
 * bearer, plus `?since=YYYY-MM-DD&until=YYYY-MM-DD` and optionally
 * `&sources=meta_ads,ig_account,ig_media`. When the time budget runs out the
 * response carries `resumeFrom` per source; call again from that day.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const since = params.get("since");
  const until = params.get("until");
  const manual = since !== null || until !== null;

  let range = trailingRange(CRON_TRAILING_DAYS);
  if (manual) {
    if (!isIsoDay(since) || !isIsoDay(until) || since > until) {
      return badRequest("since and until must be YYYY-MM-DD with since <= until");
    }
    if (daysBetween(since, until).length > MAX_RANGE_DAYS) {
      return badRequest(`range is limited to ${MAX_RANGE_DAYS} days per request`);
    }
    range = { since, until };
  }

  const requested = params.get("sources")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (requested?.some((s) => !MARKETING_SOURCES.includes(s as MarketingSource))) {
    return badRequest(`sources must be among ${MARKETING_SOURCES.join(",")}`);
  }
  const sources = (requested ?? MARKETING_SOURCES) as MarketingSource[];

  try {
    const results = await runMetaMarketingSync({
      range,
      mediaSince: manual ? range.since : addDays(range.until, -MEDIA_LOOKBACK_DAYS),
      sources,
      trigger: manual ? "manual" : "cron",
      deadlineMs: Date.now() + TIME_BUDGET_MS,
    });
    return NextResponse.json({ ok: true, range, results });
  } catch (error) {
    console.error("[meta marketing] sync failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  }
}
