/**
 * Runs guide-lint over every real guide and the guide-wide checks of
 * docs/features/radar-guides-in-code.md section 5.3 (U0). Fails on errors;
 * warnings (staleness at 45 days, long dialogue boxes) are printed only by
 * `pnpm radar:check`.
 */
import fs from "node:fs";
import path from "node:path";
import { formatIssues, lintErrors, lintFactIdsUnique, lintGuide } from "@/lib/radar-guide/guide-lint";
import { RESERVED_GUIDE_SLUGS } from "@/lib/radar-guide/guide-types";
import { GLOBAL_BANNED } from "@/lib/radar-guides/banned";
import { GUIDE_INDEX, KNOWN_PUBLISHED_RADAR_SLUGS } from "@/lib/radar-guides";
import { SHARED_FACTS } from "@/lib/radar-guides/_shared/facts";

jest.mock("server-only", () => ({}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry = require("@/lib/radar-guides/registry.server") as typeof import("@/lib/radar-guides/registry.server");

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const guides = registry.allGuides();

/** guide-lint's "asOf ... is N days old" errors (date dependent). */
const DATE_AGE_ISSUE = /^asOf \S+ is \d+ days old/;

describe("code guides", () => {
  it("has a loaded guide for every index entry, and the same meta", () => {
    expect(guides.map((g) => g.meta.slug).sort()).toEqual(Object.keys(GUIDE_INDEX).sort());
    for (const g of guides) expect(g.meta).toBe(GUIDE_INDEX[g.meta.slug]);
  });

  it.each(guides.map((g) => [g.meta.slug, g] as const))("%s passes guide-lint", (slug, guide) => {
    const issues = lintGuide(guide, {
      sharedFacts: SHARED_FACTS,
      globalBanned: GLOBAL_BANNED,
      clips: {
        manifest: registry.readClipManifest(slug),
        readVtt: (file) => registry.readGuideFile(slug, file),
      },
    });
    // Fact age depends on today's date, so it is left to `pnpm radar:check`
    // (.github/workflows/radar-check.yml: PRs touching guides, and weekly).
    // A calendar date must never fail `pnpm test` for unrelated PRs.
    const errors = lintErrors(issues).filter((i) => !DATE_AGE_ISSUE.test(i.message));
    expect(formatIssues(errors)).toBe("");
  });

  it("keeps fact ids unique across _shared and every career", () => {
    const lists: Record<string, typeof SHARED_FACTS> = { _shared: SHARED_FACTS };
    for (const g of guides) lists[g.meta.slug] = g.facts;
    expect(formatIssues(lintFactIdsUnique(lists))).toBe("");
  });

  it("uses only published radar field slugs, never a static /radar route", () => {
    for (const g of guides) {
      expect(KNOWN_PUBLISHED_RADAR_SLUGS).toContain(g.meta.slug);
      expect(RESERVED_GUIDE_SLUGS as readonly string[]).not.toContain(g.meta.slug);
    }
    const aliases = guides.map((g) => g.meta.alias);
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it("registers every bespoke component a page names", () => {
    for (const g of guides) {
      const ids = new Set<string>();
      const visit = (blocks: (typeof g.pages)[number]["blocks"]) => {
        for (const b of blocks) {
          if (b.kind === "bespoke") ids.add(b.component);
          if (b.kind === "beat") visit(b.blocks);
        }
      };
      g.pages.forEach((p) => visit(p.blocks));
      if (ids.size === 0) continue;
      const file = path.join(ROOT, "components/radar/guides", g.meta.slug, "index.ts");
      expect(fs.existsSync(file)).toBe(true);
      const source = fs.readFileSync(file, "utf8");
      const missing = [...ids].filter((id) => !new RegExp(`(^|[\\s{,"'])${id}["']?\\s*:`, "m").test(source));
      expect(missing).toEqual([]);
    }
  });

  it("points scene overrides at files that exist", () => {
    for (const g of guides) {
      for (const p of g.meta.pages) {
        if (p.scene) expect(fs.existsSync(path.join(ROOT, "public", p.scene))).toBe(true);
      }
    }
  });

  it("never imports guide content into a client file", () => {
    const banned = /from\s+["']@\/lib\/radar-guides\/(?:registry\.server|_shared\/facts|[^/"']+\/(?:guide|facts|pages\/[^"']+))["']/;
    const offenders = ["app", "components", "lib"]
      .flatMap((dir) => walk(path.join(ROOT, dir)))
      .filter((file) => {
        const text = fs.readFileSync(file, "utf8");
        return /^\s*["']use client["']/.test(text) && banned.test(text);
      })
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
