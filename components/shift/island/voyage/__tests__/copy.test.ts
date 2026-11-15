import { lintText } from "@/lib/marketing/copyRules";

import { VOYAGE_COPY } from "../copy";
import { VOYAGE_HREF, VOYAGE_PARAM } from "../link";

const strings: [string, string][] = [];
for (const [key, value] of Object.entries(VOYAGE_COPY)) {
  if (typeof value === "string") strings.push([key, value]);
  else value.forEach((line, i) => strings.push([`${key}[${i}]`, line]));
}

describe("voyage copy", () => {
  it("has a line per beat", () => {
    expect(VOYAGE_COPY.lines).toHaveLength(3);
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown, and never talks down", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
  });

  it("links the ticket to the island page with the crossing asked for", () => {
    expect(VOYAGE_HREF).toBe(`/shift/island?at=${VOYAGE_PARAM}`);
  });
});
