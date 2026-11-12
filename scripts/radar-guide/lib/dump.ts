/**
 * The shape `radar:dump` writes to .cache/radar-guide/<slug>.json. It is the
 * field row with its cards and sources (the same shape as the copies in
 * lib/radar-guide/__fixtures__, so a dump can refresh a fixture), plus the
 * field's published skills and their start options.
 */
import { existsSync, readFileSync } from "node:fs";

import type { RadarCardRow } from "../../../lib/radar-guide/types";
import { fail, paths } from "./cli";

export interface DumpSource {
  id?: string;
  ref: number;
  url: string;
  title: string;
  publisher: string | null;
  accessed_at?: string | null;
  published_at?: string | null;
  [key: string]: unknown;
}

export interface DumpStartOption {
  id: string;
  kind: string;
  title_th: string;
  summary_th: string | null;
  provider: string | null;
  destination_url: string | null;
  sort_order: number | null;
  metadata: Record<string, unknown>;
}

export interface DumpSkill {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  is_primary: boolean;
  sort_order: number | null;
  start_options: DumpStartOption[];
}

export interface RadarDump {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  tagline_th: string | null;
  is_published: boolean;
  radar_cards: RadarCardRow[];
  radar_sources: DumpSource[];
  /** Absent in the fixture copies. */
  radar_skills?: DumpSkill[];
  /** ISO time of the dump. Absent in the fixture copies. */
  dumped_at?: string;
  [key: string]: unknown;
}

export function readDump(slug: string): RadarDump {
  const path = paths.dump(slug);
  if (!existsSync(path)) {
    fail(`No dump for "${slug}" at ${path}. Run: pnpm radar:dump ${slug}`);
  }
  const dump = JSON.parse(readFileSync(path, "utf8")) as RadarDump;
  if (dump.slug !== slug || !Array.isArray(dump.radar_cards)) {
    fail(`${path} is not a radar dump for "${slug}". Re-run: pnpm radar:dump ${slug}`);
  }
  return dump;
}

/** Cards the page renders: not hidden, in DB position order. */
export function visibleCards(dump: Pick<RadarDump, "radar_cards">): RadarCardRow[] {
  return dump.radar_cards
    .filter((card) => !card.is_hidden)
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function cardContentTh(card: Pick<RadarCardRow, "content_th">): Record<string, unknown> {
  const value = card.content_th;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
