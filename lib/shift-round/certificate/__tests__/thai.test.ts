/**
 * @jest-environment node
 */
import { graphemeLength, segmentThai, truncateAtSegment, ZWSP } from "../thai";

describe("segmentThai", () => {
  it("inserts U+200B at Thai word boundaries", () => {
    const out = segmentThai("ใบรับรองนี้บันทึกกิจกรรม");
    expect(out).toContain(ZWSP);
    expect(out.replace(/​/g, "")).toBe("ใบรับรองนี้บันทึกกิจกรรม");
    // Every piece is a whole word: no piece starts with a combining mark.
    for (const piece of out.split(ZWSP)) {
      expect(piece).not.toMatch(/^[ัิ-ฺ็-๎]/);
    }
  });

  it("never separates tone marks or vowels from their consonant", () => {
    const text = "ผู้ใหญ่ที่น่ารักกิ้งก่าน้ำตาลไหม้";
    for (const piece of segmentThai(text).split(ZWSP)) {
      expect(piece.length).toBeGreaterThan(0);
      expect(piece).not.toMatch(/^[ัิ-ฺ็-๎]/);
    }
  });

  it("leaves Latin-only text and whitespace boundaries alone", () => {
    expect(segmentThai("Campus Food Waste")).toBe("Campus Food Waste");
    const mixed = segmentThai("แอป LINE OA");
    expect(mixed).not.toContain(` ${ZWSP}`);
    expect(mixed).not.toContain(`${ZWSP} `);
  });

  it("is idempotent", () => {
    const once = segmentThai("ภารกิจที่หกสำเร็จแล้ว");
    expect(segmentThai(once)).toBe(once);
  });
});

describe("truncateAtSegment", () => {
  it("returns short strings unchanged (trimmed, no ZWSP)", () => {
    expect(truncateAtSegment("  ต้น  ", 24)).toBe("ต้น");
    expect(truncateAtSegment(`ต้น${ZWSP}น้ำ`, 24)).toBe("ต้นน้ำ");
  });

  it("cuts at a word boundary and adds an ellipsis", () => {
    const text = "ใบรับรองนี้บันทึกกิจกรรมที่ทำครบ";
    const out = truncateAtSegment(text, 12);
    expect(out.endsWith("…")).toBe(true);
    expect(graphemeLength(out)).toBeLessThanOrEqual(12);
    const body = out.slice(0, -1);
    expect(text.startsWith(body)).toBe(true);
    // The kept prefix ends exactly on a segment boundary.
    const boundaries = new Set<number>();
    let at = 0;
    for (const s of new Intl.Segmenter("th", { granularity: "word" }).segment(text)) {
      at += s.segment.length;
      boundaries.add(at);
    }
    expect(boundaries.has(body.length)).toBe(true);
  });

  it("falls back to a grapheme cut for one long word, keeping marks attached", () => {
    const out = truncateAtSegment("Supercalifragilisticexpialidocious", 10);
    expect(out).toBe("Supercali…");
    const thai = truncateAtSegment("น้ำ".repeat(30), 5);
    expect(graphemeLength(thai)).toBeLessThanOrEqual(5);
    // Kept text is whole "น้ำ" clusters only: the tone mark never dangles.
    expect(thai.slice(0, -1)).toMatch(/^(น้ำ)+$/);
  });

  it("applies the 24/60/80 caps used by the content model", () => {
    expect(graphemeLength(truncateAtSegment("ก".repeat(100), 24))).toBeLessThanOrEqual(24);
    expect(graphemeLength(truncateAtSegment("word ".repeat(40), 80))).toBeLessThanOrEqual(80);
  });
});
