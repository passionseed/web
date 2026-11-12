/**
 * House copy rules for the shell chrome and the routes it renders: no em or
 * en dashes, never น้องๆ.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { findDashes } from "@/lib/radar-guide/thai-copy";

const SHELL_DIR = join(__dirname, "..");
const ROOT = join(SHELL_DIR, "../../../..");
const FILES = [
  ...readdirSync(SHELL_DIR)
    .filter((name) => /\.(tsx?|css)$/.test(name))
    .map((name) => join(SHELL_DIR, name)),
  join(SHELL_DIR, "../SourcesSheet.tsx"),
  join(ROOT, "app/radar/[slug]/page.tsx"),
  join(ROOT, "app/radar/[slug]/opengraph-image.tsx"),
  join(ROOT, "app/radar/[slug]/(guide)/layout.tsx"),
  join(ROOT, "app/radar/[slug]/(guide)/[page]/page.tsx"),
  join(ROOT, "app/radar/[slug]/(guide)/[page]/loading.tsx"),
  join(ROOT, "app/radar/[slug]/(guide)/[page]/opengraph-image.tsx"),
];

test.each(FILES)("%s has no dashes", (file) => {
  expect(findDashes(readFileSync(file, "utf8"))).toEqual([]);
});

test("น้องๆ never appears in shell copy", () => {
  for (const file of FILES) expect(readFileSync(file, "utf8")).not.toMatch(/น้อง\s?ๆ/);
});
