import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RadarFieldPageClient, type FieldSource } from "@/components/radar/RadarFieldPageClient";
import type { Database } from "@/lib/supabase/database.types";
import { getCachedFieldSkills, getCachedPublishedRadarField } from "@/lib/radar/server";
import { radarFieldDescription, radarFieldTitle } from "@/lib/radar/field-meta";
import { isTerritoryIndex, territoryKeyOf } from "@/lib/radar/territory";
import { GuideCover } from "@/components/radar/guide/shell/GuideCover";
import {
  guideCoverMetadata,
  guideHookTh,
  shouldShowGuideCover,
} from "@/components/radar/guide/shell/guide-routes";
import { guideVisible } from "@/lib/radar-guides";
import { guideIndexFor, loadGuide } from "@/lib/radar-guides/registry.server";

type RadarField = Database["public"]["Tables"]["radar_fields"]["Row"];
type RadarCard = Database["public"]["Tables"]["radar_cards"]["Row"];
type RadarSourceRow = {
  ref: number | string | null;
  title: string | null;
  publisher: string | null;
  url: string | null;
  published_at?: string | null;
  accessed_at?: string | null;
};

export const revalidate = 300;

/** The code guide for this slug when it is visible on this deployment (no database). */
function visibleGuide(slug: string) {
  const guide = loadGuide(slug);
  return guide && guideVisible(guide.meta) ? guide : null;
}

/**
 * Link previews (spec 2.9). The title is absolute so the root layout's
 * "%s | PassionSeed" template does not add a second suffix. Utm parameters
 * and the hash never reach the server, so this reads only the slug.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Code-guide careers: metadata from code, never the database.
  const guide = visibleGuide(slug);
  if (guide) return guideCoverMetadata(guide.meta, guideHookTh(guide));

  const field = await getCachedPublishedRadarField(slug).catch(() => null);
  if (!field) return { title: { absolute: "Career Radar | PassionSeed" } };

  const title = radarFieldTitle(field);
  const description = radarFieldDescription({ ...field, cards: field.radar_cards });
  const canonical = `/radar/${field.slug ?? slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Sources as the chips and the chapter sources sheet read them. */
function toFieldSources(rows: readonly RadarSourceRow[] | null | undefined): FieldSource[] {
  return (rows ?? []).flatMap((row) => {
    const ref = Number(row.ref);
    if (!Number.isFinite(ref) || !row.url) return [];
    return [
      {
        ref,
        title: row.title ?? row.url,
        publisher: row.publisher,
        url: row.url,
        asOf: row.accessed_at ?? row.published_at ?? null,
      },
    ];
  });
}

export default async function RadarFieldPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string | string[]; view?: string | string[] }>;
}) {
  const [{ slug }, { from, view }] = await Promise.all([params, searchParams]);

  // Careers with a code guide open on its cover (title screen). The DB deck
  // stays one tap away at ?view=deck, and the plan flow (?from=plan) keeps it.
  const guide = visibleGuide(slug);
  if (guide && shouldShowGuideCover({ hasGuide: true, from, view })) {
    return <GuideCover index={guideIndexFor(guide)} hookTh={guideHookTh(guide)} />;
  }

  const fieldResult = await getCachedPublishedRadarField(slug);

  if (!fieldResult) {
    notFound();
  }

  const { radar_cards: cards, radar_sources: sources, ...field } = fieldResult;

  // Two routes into a territory: its grid tile, and any profession deep-linked
  // from outside. Professions are 30-second discovery units with no cards of
  // their own, so both land on the deck that can actually render them.
  const territoryKey = territoryKeyOf(field.research);
  if (territoryKey && (isTerritoryIndex(field.research) || (cards ?? []).length === 0)) {
    redirect(`/radar/territory/${territoryKey}`);
  }

  const initialSkills = await getCachedFieldSkills(field.id);

  // Inject score card at position 2 from field-level score/tier + research metrics
  const allCards = [...(cards || [])] as RadarCard[];
  const research = field.research as Record<string, unknown> | null;
  // `score` and `tier` are newer than the generated radar_fields types.
  const { score, tier } = field as typeof field & { score?: number | null; tier?: string | null };
  if (score != null && research?.metrics) {
    const scoreCard = {
      id: "__score__",
      field_id: field.id,
      kind: "careerSurvival",
      position: -1,
      content_th: {
        title: "แนวโน้มอาชีพนี้เป็นอย่างไร?",
        metrics: research.metrics,
        global_metrics: research.global_metrics,
        metric_details: research.metric_details,
        global_metric_details: research.global_metric_details,
        tier,
        reasoning: research.reasoning,
      },
      content_en: null,
      image_url: null,
      image_prompt: null,
      image_credit: null,
      image_license: null,
      image_alt_th: null,
      image_alt_en: null,
      created_at: field.created_at,
      updated_at: field.updated_at,
    } as unknown as RadarCard;
    const insertIdx = allCards.length > 0 ? 1 : 0;
    allCards.splice(insertIdx, 0, scoreCard);
  }

  return (
    <RadarFieldPageClient
      initialField={field as RadarField}
      initialCards={allCards}
      fieldSources={toFieldSources(sources as RadarSourceRow[] | null)}
      initialSkills={initialSkills}
      fromPlan={(Array.isArray(from) ? from[0] : from) === "plan"}
    />
  );
}
