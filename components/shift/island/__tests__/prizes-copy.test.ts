import { lintText } from "@/lib/marketing/copyRules";

import { ISLAND_PRIZES_DRAFT } from "@/lib/content/shift-island-economy";

import * as copy from "../prizes/copy";

/** Every user-facing string in prizes/copy.ts, with a path for the failure message. */
function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collect(item, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
  }
}

const strings: [string, string][] = [];
for (const [name, value] of Object.entries(copy)) collect(value, name, strings);

describe("prize copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThanOrEqual(4);
  });

  it("names the menu row, the plaza spot and the sheet title", () => {
    expect(copy.PRIZES_UI.menu).toBe("รางวัล");
    expect(copy.PRIZES_UI.spot).toContain("รางวัล");
    expect(copy.PRIZES_UI.title).toBe(ISLAND_PRIZES_DRAFT.title);
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
  });

  it.each(strings)("%s never talks down", (_path, text) => {
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน \d+ วัน/i);
  });
});
