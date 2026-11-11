import { readFileSync } from "node:fs";
import { join } from "node:path";

import { lintText } from "@/lib/marketing/copyRules";

import { STORY, storyLine } from "../copy";

/** Every string in STORY (functions called with sample arguments), with a path for the failure message. */
function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") out.push([path, value]);
  else if (typeof value === "function") out.push([`${path}()`, String((value as (...a: unknown[]) => unknown)("15 พ.ค.", 4))]);
  else if (Array.isArray(value)) value.forEach((item, i) => collect(item, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
}

const strings: [string, string][] = [];
collect(STORY, "STORY", strings);
for (let i = 0; i < 4; i++) {
  strings.push([`storyLine(${i}, null)`, storyLine(i, null)]);
  strings.push([`storyLine(${i}, date)`, storyLine(i, "2026-11-28")]);
}
strings.push(["STORY.panel(1, 4)", STORY.panel(1, 4)]);

describe("story copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThan(15);
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
  });

  it.each(strings)("%s never talks down and never counts streaks", (_path, text) => {
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน|pivot/i);
  });

  it("has the three panel lines in order", () => {
    expect([0, 1, 2].map((i) => storyLine(i, null))).toEqual([
      "เกาะนี้ยังว่าง รอคนที่อยากสร้างของจริง",
      "ทุกโปรเจกต์คือต้นไม้หนึ่งต้น เริ่มจากเรื่องที่คุณใส่ใจ",
      "ต้นไม้โตจากงานจริง ไม่ได้โตจากเวลาออนไลน์",
    ]);
  });

  it("dates the festival panel from the season, in Bangkok time", () => {
    expect(storyLine(3, "2026-11-28")).toMatch(/^28 พ\.ย\. เทศกาล Demo Day ทั้งเกาะมาโชว์งานด้วยกัน$/);
    expect(storyLine(3, "2026-05-14T18:30:00Z")).toMatch(/^15 พ\.ค\. เทศกาล Demo Day ทั้งเกาะมาโชว์งานด้วยกัน$/);
  });

  it("falls back to the undated festival line without a usable date", () => {
    expect(storyLine(3, null)).toBe("คืนเทศกาล Demo Day ทั้งเกาะมาโชว์งานด้วยกัน");
    expect(storyLine(3, "not a date")).toBe("คืนเทศกาล Demo Day ทั้งเกาะมาโชว์งานด้วยกัน");
  });

  it("never hardcodes a Demo Day date", () => {
    const source = readFileSync(join(__dirname, "..", "copy.ts"), "utf8");
    expect(source).not.toMatch(/\d{1,2}\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/);
  });

  it("labels the last button by where the student is", () => {
    expect(STORY.cta).toEqual({ start: "ไปที่เกาะ", claim: "จับจองที่ดิน", island: "ไปที่เกาะ" });
    expect(STORY.panel(2, 4)).toBe("ภาพ 2 จาก 4");
  });
});
