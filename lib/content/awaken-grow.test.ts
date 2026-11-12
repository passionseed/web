import { lintText } from "@/lib/marketing/copyRules";

import * as copy from "./awaken-grow";

/** Every string in the carousel copy, however deeply nested. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("awaken-grow carousel copy", () => {
  it("passes the marketing copy rules", () => {
    const hits = strings(copy).flatMap((text) => lintText(text, "awaken-grow", "instagram"));
    expect(hits).toEqual([]);
  });

  it("names every quadrant the map and moves refer to", () => {
    for (const move of copy.NEXT_MOVE.moves) expect(copy.QUADRANTS[move.from]).toBeDefined();
  });
});
