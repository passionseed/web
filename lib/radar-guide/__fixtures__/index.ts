/**
 * Copies of the four published Career Radar fields (field row, `radar_cards`,
 * `radar_sources`), dumped on 2026-11-11. Public research content only: no
 * user data. Refresh them after the em dash sweep (spec section 9) with
 * `pnpm radar:dump <slug>`.
 */
import type { RadarCardRow } from "../types";
import aiEngineer from "./ai-engineer.json";
import cybersecurity from "./cybersecurity.json";
import dataScientist from "./data-scientist.json";
import softwareEngineer from "./software-engineer.json";

export const RADAR_FIXTURE_SLUGS = [
  "ai-engineer",
  "cybersecurity",
  "data-scientist",
  "software-engineer",
] as const;
export type RadarFixtureSlug = (typeof RADAR_FIXTURE_SLUGS)[number];

export interface RadarFixtureSource {
  id: string;
  ref: number;
  url: string;
  title: string;
  publisher: string | null;
  field_id: string;
}

export interface RadarFixtureField {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  tagline_th: string | null;
  tagline_en: string | null;
  color: string | null;
  is_published: boolean;
  researched_at: string | null;
  radar_cards: RadarCardRow[];
  radar_sources: RadarFixtureSource[];
  [key: string]: unknown;
}

const FIXTURES: Record<RadarFixtureSlug, unknown> = {
  "ai-engineer": aiEngineer,
  cybersecurity,
  "data-scientist": dataScientist,
  "software-engineer": softwareEngineer,
};

/** A deep copy, so tests can mutate it freely. */
export function loadRadarFixture(slug: RadarFixtureSlug): RadarFixtureField {
  return JSON.parse(JSON.stringify(FIXTURES[slug])) as RadarFixtureField;
}

/** The fixture's cards as the page receives them: `is_hidden` rows dropped, ordered by position. */
export function visibleFixtureCards(slug: RadarFixtureSlug): RadarCardRow[] {
  return loadRadarFixture(slug)
    .radar_cards.filter((card) => !card.is_hidden)
    .sort((a, b) => a.position - b.position);
}
