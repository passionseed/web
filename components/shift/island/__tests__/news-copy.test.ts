import { lintText } from "@/lib/marketing/copyRules";

import * as copy from "../news/copy";

/** Sample arguments for the copy functions: a plot number and a team name, or a date. */
const SAMPLE_ARGS: unknown[][] = [[3, "ร้านขนม"], ["12 พ.ย."]];

/** Every user-facing string in news/copy.ts, with a path for the failure message. */
function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (typeof value === "function") {
    for (const args of SAMPLE_ARGS) {
      const result = (value as (...a: unknown[]) => unknown)(...args);
      if (typeof result === "string") out.push([`${path}(${args.join(", ")})`, result]);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collect(item, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
  }
}

const strings: [string, string][] = [];
for (const [name, value] of Object.entries(copy)) collect(value, name, strings);

describe("island news copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThanOrEqual(20);
  });

  it("names the menu row and labels the summaries as AI", () => {
    expect(copy.NEWS.menu).toBe("ข่าวเกาะ");
    expect(copy.NEWS.title).toBe("ข่าวเกาะ");
    expect(copy.NEWS.aiLabel).toBe("สรุปโดย AI จากงานที่ทีมส่งบนเกาะ");
    expect(copy.NEWS.aiShort).toContain("AI");
    expect(copy.NEWS.noUpdate).toBe("ยังไม่มีอัปเดตใหม่");
    expect(copy.NEWS.plot(3, "ร้านขนม")).toContain("ร้านขนม");
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
  });

  it.each(strings)("%s never talks down, ranks or counts a run of days", (_path, text) => {
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน \d+ วัน/i);
    expect(text).not.toMatch(/อันดับ|ที่สุด/);
  });
});
