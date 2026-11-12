import { lintText } from "@/lib/marketing/copyRules";

import * as copy from "../copy";

/** Sample arguments for the copy functions: a Thai word, a date or null, then numbers. */
const SAMPLE_ARGS: unknown[][] = [["บอร์ดห้อง 5/1", "12 พ.ย.", 4], ["บอร์ดห้อง 5/1", null, 4], [3], ["เพื่อนไม่อยากพิมพ์"]];

function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (typeof value === "function") {
    SAMPLE_ARGS.forEach((args, i) => {
      const result = (value as (...a: unknown[]) => unknown)(...args);
      if (typeof result === "string") out.push([`${path}(${i})`, result]);
    });
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
  }
}

const strings: [string, string][] = [];
for (const [name, value] of Object.entries(copy)) {
  if (name === "shortDate") continue;
  collect(value, name, strings);
}

describe("canvas copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThan(40);
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown and never talks down", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
  });

  it("uses the plan's exact lines", () => {
    expect(copy.LINK_SHEET.title).toBe("เชื่อมแคนวาส");
    expect(copy.LINK_SHEET.description).toBe("เห็นเฉพาะแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม");
    expect(copy.LINK_SHEET.meta("ห้อง 5/1", "12 พ.ย.", 4)).toBe("บอร์ด ห้อง 5/1 · แก้ล่าสุด 12 พ.ย. · โน้ต 4 ใบ");
    expect(copy.COMPOSER.pick).toBe("เลือกโน้ตที่จะส่ง (สูงสุด 8 ใบ)");
    expect(copy.PREVIEW.meter(812)).toBe("812/2000");
  });

  it("prints Bangkok short dates and tolerates nothing", () => {
    expect(copy.shortDate(Date.UTC(2026, 10, 11, 18, 30))).toMatch(/^12 พ\.ย\.$/);
    expect(copy.shortDate(null)).toBeNull();
    expect(copy.shortDate(0)).toBeNull();
  });
});
