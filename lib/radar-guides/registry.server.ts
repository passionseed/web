import "server-only";

/**
 * Server-only guide registry. Static imports so the bundler sees every guide.
 * Reads clips.json and captions from disk (prerender, scripts, OG routes);
 * next.config.mjs traces lib/radar-guides/**\/clips* into the functions.
 * Never touches the network or the database.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  CareerGuide,
  ClipManifest,
  ClipMedia,
  ClipSlot,
  Fact,
  GuideIndexEntry,
  GuidePage,
  ReelPlan,
} from "@/lib/radar-guide/guide-types";
import { trackableGames } from "@/lib/radar-guide/story";
import { parseVtt, type VttCue } from "@/lib/radar-guide/vtt";
import { cybersecurityGuide } from "./cybersecurity/guide";
import { mergeFacts, pickFacts } from "./facts";
import { guideVisible } from "./index";

const GUIDES = {
  cybersecurity: cybersecurityGuide,
} satisfies Record<string, CareerGuide>;

const GUIDES_DIR = path.join(process.cwd(), "lib", "radar-guides");

function own<T>(record: Record<string, T>, key: string): T | null {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : null;
}

/** The guide for a slug, any status (scripts, admin, lint). */
export function loadGuide(slug: string): CareerGuide | null {
  return own<CareerGuide>(GUIDES, slug);
}

/** Every guide, any status. */
export function allGuides(): readonly CareerGuide[] {
  return Object.values(GUIDES);
}

/** Slugs whose guide is visible on this deployment (live, or draft off production). */
export function liveGuideSlugs(env: string | undefined = process.env.VERCEL_ENV): string[] {
  return allGuides()
    .filter((g) => guideVisible(g.meta, env))
    .map((g) => g.meta.slug);
}

/**
 * The index entry with `games` and `cutscene` derived from the pages. The shell
 * gets this from the server layout (XP maximum, level map cutscene marks).
 */
export function guideIndexFor(guide: CareerGuide): GuideIndexEntry {
  const bodies = new Map(guide.pages.map((p) => [p.key, p]));
  return {
    ...guide.meta,
    pages: guide.meta.pages.map((p) => {
      const page = bodies.get(p.key);
      return page
        ? { ...p, games: trackableGames(page.blocks).length, cutscene: Boolean(page.clip) }
        : { ...p };
    }),
  };
}

/** Shared + career facts. Throws on duplicate ids (guides.test catches it first). */
export function guideFacts(guide: CareerGuide): readonly Fact[] {
  return mergeFacts(guide.facts);
}

/** lib/radar-guides/<slug>/clips.json, or {} when missing or unreadable. */
export function readClipManifest(slug: string): ClipManifest {
  try {
    const raw = fs.readFileSync(path.join(GUIDES_DIR, slug, "clips.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as ClipManifest) : {};
  } catch {
    return {};
  }
}

/** A captions file relative to the guide folder ("clips/mythos.vtt"), or null. */
export function readGuideFile(slug: string, file: string): string | null {
  const resolved = path.resolve(GUIDES_DIR, slug, file);
  if (!resolved.startsWith(path.join(GUIDES_DIR, slug) + path.sep)) return null;
  try {
    return fs.readFileSync(resolved, "utf8");
  } catch {
    return null;
  }
}

export interface LoadedClip {
  slot: ClipSlot;
  media: ClipMedia | null; // null: not recorded yet, the cutscene falls back to the host NPC
  cues: VttCue[];
}

export interface LoadedGuidePage {
  guide: CareerGuide;
  /** Index with derived games/cutscene: pass to the shell. */
  index: GuideIndexEntry;
  page: GuidePage;
  /** Facts in page.factIds order (the sources sheet). */
  facts: Fact[];
  clip: LoadedClip | null;
}

function loadClip(slug: string, page: GuidePage): LoadedClip | null {
  if (!page.clip) return null;
  const media = readClipManifest(slug)[page.key] ?? null;
  const cues = media ? parseVtt(readGuideFile(slug, media.captionsFile)) : [];
  return { slot: page.clip, media, cues };
}

/** One page of a visible guide, or null (unknown slug/page, or a draft on production). */
export function loadGuidePage(
  slug: string,
  pageKey: string,
  env: string | undefined = process.env.VERCEL_ENV
): LoadedGuidePage | null {
  const guide = loadGuide(slug);
  if (!guide || !guideVisible(guide.meta, env)) return null;
  const page = guide.pages.find((p) => p.key === pageKey);
  if (!page) return null;
  return {
    guide,
    index: guideIndexFor(guide),
    page,
    facts: pickFacts(guideFacts(guide), page.factIds),
    clip: loadClip(slug, page),
  };
}

/** generateStaticParams for /radar/[slug]/[page]: every page of every visible guide. */
export function guideStaticParams(
  env: string | undefined = process.env.VERCEL_ENV
): { slug: string; page: string }[] {
  return allGuides()
    .filter((g) => guideVisible(g.meta, env))
    .flatMap((g) =>
      [...g.pages].sort((a, b) => a.order - b.order).map((p) => ({ slug: g.meta.slug, page: p.key }))
    );
}

export interface GuideReelPlan {
  slug: string;
  pageKey: string;
  format: ReelPlan["format"];
  hookTh: string;
  variantsTh: readonly [string, string];
}

/** Reel hooks per page for the admin reel mapper (replaces listChapterReelPlans). */
export function listGuideReelPlans(): GuideReelPlan[] {
  return allGuides().flatMap((g) =>
    g.pages
      .filter((p): p is GuidePage & { reel: ReelPlan } => Boolean(p.reel))
      .map((p) => ({
        slug: g.meta.slug,
        pageKey: p.key,
        format: p.reel.format,
        hookTh: p.reel.hook.th,
        variantsTh: p.reel.variantsTh,
      }))
  );
}
