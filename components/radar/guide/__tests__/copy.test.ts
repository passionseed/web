/**
 * House copy rule: no em dashes (or their look-alikes) in user-facing copy.
 * The guide's strings live in these files, so scan them whole.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { findDashes } from "@/lib/radar-guide/thai-copy";

const GUIDE_DIR = join(__dirname, "..");
const FILES = [
  ...readdirSync(GUIDE_DIR)
    .filter((name) => /\.(tsx?|css)$/.test(name))
    .map((name) => join(GUIDE_DIR, name)),
  join(GUIDE_DIR, "../../../lib/radar-guide/social.ts"),
  join(GUIDE_DIR, "../../../lib/radar-guide/vtt.ts"),
];

test.each(FILES)("%s has no dashes", (file) => {
  expect(findDashes(readFileSync(file, "utf8"))).toEqual([]);
});

test("น้องๆ never appears in guide copy", () => {
  for (const file of FILES) expect(readFileSync(file, "utf8")).not.toMatch(/น้อง\s?ๆ/);
});
