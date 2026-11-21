/**
 * @jest-environment node
 *
 * Import guard for the bot-shipped Elemental folders: lib/elemental/{core,
 * canvas,island}. The bot container ships only the files bot/deploy.sh lists
 * (FILES) with only the npm packages it lists (DEPS, which has no zod), so
 * code here may import only:
 * - relative paths that stay inside those three folders;
 * - node: builtins;
 * - read-only, bot/src/quests/island/scene.ts and render.ts, and anything
 *   under bot/assets/island/ (SHIFT's island) or bot/assets/elemental/
 *   (Elemental's own sprites).
 * Anything else fails: zod, next, server-only, @supabase, lib/whiteboard,
 * '@/...' and every other package or path.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const GUARDED = ["core", "canvas", "island"] as const;
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;

const ALLOWED_FILES = ["bot/src/quests/island/scene.ts", "bot/src/quests/island/render.ts"];
const ALLOWED_DIRS = ["bot/assets/island/", "bot/assets/elemental/"];

export interface Violation {
  file: string;
  specifier: string;
  reason: string;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

/** Every module specifier in the source: static imports and re-exports, import(), require(). */
export function specifiersOf(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  const patterns = [
    /(?:^|[^\w$.])(?:import|export)\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s+)?["']([^"']+)["']/g,
    /(?:^|[^\w$.])(?:import|require)\s*\(\s*["']([^"']+)["']/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) found.push(m[1]);
  }
  return found;
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** Why the specifier is not allowed in this file (repo-relative path), or null when it is. */
export function checkSpecifier(file: string, specifier: string): string | null {
  if (specifier.startsWith("node:")) return null;
  if (specifier.startsWith("@/")) return "'@/' alias: the bot cannot resolve web paths";
  if (/^(?:zod|next|server-only|@supabase)(?:\/|$)/.test(specifier)) {
    return `'${specifier}' is not in the bot image (bot/deploy.sh DEPS)`;
  }
  if (!specifier.startsWith(".")) return `package '${specifier}': only node: builtins are allowed`;

  const target = toPosix(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
  if (target.startsWith("../")) return "relative import leaves the repository";
  if (target.startsWith("lib/whiteboard")) return "lib/whiteboard is web code";
  if (GUARDED.some((dir) => target === `lib/elemental/${dir}` || target.startsWith(`lib/elemental/${dir}/`))) {
    return null;
  }
  const withTs = /\.[cm]?[jt]sx?$/.test(target) ? target : `${target}.ts`;
  if (ALLOWED_FILES.includes(withTs)) return null;
  if (ALLOWED_DIRS.some((dir) => target.startsWith(dir))) return null;
  return `relative import of ${target}, outside lib/elemental/{${GUARDED.join(",")}} and the allowed bot island files`;
}

function walk(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return SOURCE_EXT.test(name) ? [full] : [];
  });
}

/** Scans lib/elemental/{core,canvas,island} under root; folders that do not exist yet are skipped. */
export function scanGuarded(root: string): { files: string[]; violations: Violation[] } {
  const files = GUARDED.flatMap((dir) => walk(path.join(root, "lib", "elemental", dir)));
  const violations: Violation[] = [];
  for (const full of files) {
    const file = toPosix(path.relative(root, full));
    for (const specifier of specifiersOf(readFileSync(full, "utf8"))) {
      const reason = checkSpecifier(file, specifier);
      if (reason) violations.push({ file, specifier, reason });
    }
  }
  return { files: files.map((f) => toPosix(path.relative(root, f))), violations };
}

describe("lib/elemental import guard", () => {
  it("finds no forbidden import in the real folders", () => {
    const { files, violations } = scanGuarded(REPO_ROOT);
    expect(files).toEqual(expect.arrayContaining(["lib/elemental/core/index.ts", "lib/elemental/core/pii.ts"]));
    expect(violations).toEqual([]);
  });

  describe("on a temporary tree", () => {
    let root: string;
    beforeEach(() => {
      root = mkdtempSync(path.join(tmpdir(), "elemental-guard-"));
      mkdirSync(path.join(root, "lib", "elemental", "core"), { recursive: true });
      writeFileSync(path.join(root, "lib", "elemental", "core", "ok.ts"), 'import { x } from "./other";\n');
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    const plant = (source: string, dir = "core") => {
      mkdirSync(path.join(root, "lib", "elemental", dir), { recursive: true });
      writeFileSync(path.join(root, "lib", "elemental", dir, "bad.ts"), source);
      return scanGuarded(root).violations.map((v) => v.specifier);
    };

    it("passes a clean tree", () => {
      expect(scanGuarded(root).violations).toEqual([]);
    });

    it("fails on a temporary import 'zod'", () => {
      expect(plant("import 'zod';\n")).toEqual(["zod"]);
    });

    it("fails on import '@/lib/x'", () => {
      expect(plant("import { y } from '@/lib/x';\n", "canvas")).toEqual(["@/lib/x"]);
    });

    it("fails on multi-line, type-only, re-export, dynamic and require forms", () => {
      const source = [
        "import {",
        "  a,",
        "  b as c,",
        "} from 'next/server';",
        "import type { T } from '@supabase/supabase-js';",
        "export { z } from 'server-only';",
        "const m = await import('zod/v4');",
        "const r = require('pg');",
      ].join("\n");
      expect(plant(source, "island")).toEqual(["next/server", "@supabase/supabase-js", "server-only", "zod/v4", "pg"]);
    });

    it("ignores imports inside comments", () => {
      expect(plant("// import 'zod';\n/* import '@/lib/x'; */\nexport const n = 1;\n")).toEqual([]);
    });
  });

  it.each([
    ["./elements", null],
    ["../canvas/note", null],
    ["../island/slot-pool.json", null],
    ["node:zlib", null],
    ["../../../bot/src/quests/island/scene", null],
    ["../../../bot/src/quests/island/render.ts", null],
    ["../../../bot/assets/island/sprites", null],
    ["../../../bot/assets/elemental/sprites", null],
  ])("allows %s from lib/elemental/core", (specifier, expected) => {
    expect(checkSpecifier("lib/elemental/core/x.ts", specifier)).toBe(expected);
  });

  it.each([
    "zod",
    "next",
    "next/og",
    "server-only",
    "@supabase/ssr",
    "@/lib/x",
    "zlib",
    "discord.js",
    "../../whiteboard/shift-cards",
    "../web/learn-actions",
    "../../../bot/src/quests/island/tree",
    "../../../bot/src/quests/board",
    "../../supabase/shift-quests/canvas-snapshot",
    "../../../../outside",
  ])("refuses %s from lib/elemental/core", (specifier) => {
    expect(checkSpecifier("lib/elemental/core/x.ts", specifier)).toEqual(expect.any(String));
  });
});
