import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { DIRECT_SOURCE } from "@/lib/shift/applicationStats";
import { normalizeShiftSource } from "@/lib/shift/attribution";
import type { ShiftViewStats } from "@/lib/shift/viewStats";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

/** All recorded SHIFT page views, across cohorts, grouped by UTM source. */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const pagePath = new URL(request.url).searchParams.get("page");
  if (pagePath && !/^\/shift(?:\/(?:apply|0|[1-9]\d*))?$/.test(pagePath)) {
    return NextResponse.json({ error: "Invalid SHIFT page" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const counts = new Map<string, number>();
    const cutoff = new Date().toISOString();
    let offset = 0;
    let totalViews = 0;

    // Read every page so the API row limit never silently truncates totals.
    while (true) {
      let query = supabase
        .from("hackathon_events")
        .select("event_data")
        .eq("event_type", "shift_page_view")
        .lte("created_at", cutoff)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (pagePath) query = query.eq("page_path", pagePath);
      const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = data ?? [];
      for (const row of rows) {
        const source = normalizeShiftSource(row.event_data?.source) ?? DIRECT_SOURCE;
        counts.set(source, (counts.get(source) ?? 0) + 1);
      }
      totalViews += rows.length;
      if (rows.length === 0) break;
      offset += rows.length;
    }

    const stats: ShiftViewStats = {
      totalViews,
      sources: [...counts.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    };
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeServerError("Failed to load SHIFT views", error);
  }
}
