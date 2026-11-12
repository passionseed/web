import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RadarLinksEditor, type LinkEditorRow } from "@/components/admin/radar/RadarLinksEditor";
import { RadarReelMapper, type ReelPlanOption } from "@/components/admin/radar/RadarReelMapper";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { funnelWeekStart, visitsByContent } from "@/lib/radar-guide/admin-funnel";
import { listGuideReelPlans } from "@/lib/radar-guides/registry.server";
import type { RadarGuideFunnelRow, RadarLinkRow, RadarReelRow } from "@/lib/radar-guide/types";
import {
  countLinkClicks,
  isMissingRadarGuideTable,
  listFunnelRows,
  listPublishedGuideFields,
  listRadarLinks,
  type RadarAdminDb,
  type RadarGuideFieldMeta,
} from "@/lib/supabase/radar-guide-admin";
import { listReels } from "@/lib/supabase/radar-reels";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const WINDOW_WEEKS = 5;

async function settle<T>(promise: Promise<T>, fallback: T, errors: string[], label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    errors.push(
      isMissingRadarGuideTable(error)
        ? `${label}: the Radar guide migrations are not applied yet.`
        : `${label}: ${error instanceof Error ? error.message : "failed"}`
    );
    return fallback;
  }
}

export default async function RadarReelsPage() {
  await requireAdmin();
  const db = (await createClient()) as unknown as RadarAdminDb;
  const errors: string[] = [];
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Reel hooks per page come from code, not the database.
  const plans: ReelPlanOption[] = listGuideReelPlans();
  const [reels, links, clicks, fields, funnel] = await Promise.all([
    settle<RadarReelRow[]>(listReels({ limit: 200 }, db), [], errors, "Reels"),
    settle<RadarLinkRow[]>(listRadarLinks(db), [], errors, "Links"),
    settle(countLinkClicks(db, since), new Map<string, number>(), errors, "Link clicks"),
    settle<RadarGuideFieldMeta[]>(listPublishedGuideFields(db), [], errors, "Fields"),
    settle<RadarGuideFunnelRow[]>(listFunnelRows(db, { fromWeek: funnelWeekStart(WINDOW_WEEKS) }), [], errors, "Funnel"),
  ]);

  const linkRows: LinkEditorRow[] = links.map((link) => ({
    ...link,
    clicks: clicks.get(link.code) ?? 0,
    visits: link.utm_content ? visitsByContent(funnel, link.utm_source).get(link.utm_content) ?? 0 : null,
  }));
  const fieldOptions = fields.map((field) => ({
    slug: field.slug,
    name: field.name_th || field.name_en || field.slug,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Career Radar"
        title="Reels and short links"
        description="Map every Radar reel to its career and guide page within an hour of posting, so comments get the right DM link."
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/admin/radar">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Radar workspace
            </Link>
          </Button>
        }
      />
      {errors.length > 0 ? (
        <AdminErrorState title="Some Radar data did not load" message={errors.join(" ")} />
      ) : null}
      <RadarReelMapper reels={reels} links={links} fields={fieldOptions} plans={plans} />
      <RadarLinksEditor
        links={linkRows}
        fields={fieldOptions}
        windowLabel={`clicks in the last ${WINDOW_DAYS} days, visits since ${funnelWeekStart(WINDOW_WEEKS)}`}
      />
    </div>
  );
}
