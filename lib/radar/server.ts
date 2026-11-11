import "server-only";

import { unstable_cache } from "next/cache";
import type { RadarSkillSummary } from "@/components/radar/RadarSkillExperience";
import {
  isRadarPreview,
  radarReadClient,
  wherePublished,
} from "@/lib/radar/preview";
import { loadSkillsByField, loadStartOptionsBySkill } from "@/lib/radar/territory";
import type { Database } from "@/lib/supabase/database.types";

async function loadPublishedRadarField(slug: string) {
  const supabase = radarReadClient<Database>();
  const { data, error } = await wherePublished(
    supabase
      .from("radar_fields")
      .select("*, radar_cards(*), radar_sources(ref, title, publisher, url, published_at, accessed_at)")
      .eq("slug", slug)
  )
    .eq("radar_cards.is_hidden", false)
    .order("position", { referencedTable: "radar_cards", ascending: true })
    .order("ref", { referencedTable: "radar_sources", ascending: true })
    .maybeSingle();

  if (error) {
    console.error("Error loading Radar field:", error);
    throw new Error("Radar request failed");
  }
  return data;
}

export const getCachedPublishedRadarField = unstable_cache(
  loadPublishedRadarField,
  // Keep this version aligned with material backfills to published card JSON.
  // v8 drops entries cached by the never-shipped v7, which carried Radar Guide
  // chapter rows. Guides are code now (lib/radar-guides), so the cached field
  // is cards and sources only again.
  ["published-radar-field-v8", String(isRadarPreview())],
  { revalidate: 300, tags: ["published-radar-fields"] }
);

/**
 * Skill rail for a legacy field page. Both loads fail soft, so a field whose
 * skills are unmapped renders exactly as it did before.
 */
async function loadFieldSkills(fieldId: string): Promise<RadarSkillSummary[]> {
  const skills = (await loadSkillsByField([fieldId])).get(fieldId) ?? [];
  if (skills.length === 0) return [];

  const startOptions = await loadStartOptionsBySkill(skills.map((skill) => skill.id));

  return skills.map((skill) => ({
    id: skill.id,
    slug: skill.slug,
    name_th: skill.name_th,
    name_en: skill.name_en,
    description_th: skill.description_th,
    is_primary: skill.is_primary,
    start_options: startOptions.get(skill.id) ?? [],
  }));
}

export const getCachedFieldSkills = unstable_cache(
  loadFieldSkills,
  ["radar-field-skills-v1", String(isRadarPreview())],
  { revalidate: 300, tags: ["published-radar-fields", "radar-territories"] }
);
