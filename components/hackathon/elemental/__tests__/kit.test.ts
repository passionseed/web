import { buildFrame, checkFrame, ELEMENT_KITS, EVERY_QUESTION_TH, FRAME_MOVES } from "../kit";
import { wrapLines } from "../kit/story-card";
import { ELEMENT_CHAPTERS } from "../media";

const allText = JSON.stringify({ ELEMENT_KITS, EVERY_QUESTION_TH, FRAME_MOVES });

describe("ELEMENT_KITS", () => {
  it("has a full kit for every element", () => {
    for (const { key } of ELEMENT_CHAPTERS) {
      const k = ELEMENT_KITS[key];
      expect(k.people.length).toBeGreaterThanOrEqual(3);
      expect(k.moments.length).toBeGreaterThanOrEqual(3);
      expect(k.needs.length).toBeGreaterThanOrEqual(3);
      expect(k.look.length).toBeGreaterThanOrEqual(3);
      expect(k.questions.length).toBeGreaterThanOrEqual(3);
      expect(k.words.length).toBeGreaterThanOrEqual(3);
      expect(k.today.length).toBe(3);
      expect(k.safeTh.length).toBeGreaterThan(20);
    }
  });

  it("links only to https pages, except Air4Thai which has no https", () => {
    const urls = Object.values(ELEMENT_KITS).flatMap((k) => [...k.look, ...k.today].flatMap((l) => (l.url ? [l.url] : [])));
    for (const u of urls) {
      if (u.startsWith("http://")) expect(u).toBe("http://air4thai.pcd.go.th/");
      else expect(u).toMatch(/^https:\/\//);
    }
  });

  it("has no em dashes in user-facing text", () => {
    expect(allText).not.toContain("—");
  });

  it("keeps chips short enough for one line on a phone", () => {
    for (const k of Object.values(ELEMENT_KITS)) {
      for (const chip of [...k.people, ...k.moments, ...k.needs]) expect(chip.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("buildFrame", () => {
  it("puts the parts into a question", () => {
    expect(buildFrame({ person: "แม่", need: "หยุดคิดก่อนแชร์", moment: "สามวินาทีก่อนกดแชร์" })).toBe("สามวินาทีก่อนกดแชร์ เราจะช่วยให้แม่ หยุดคิดก่อนแชร์ได้อย่างไร");
  });

  it("falls back to someone who has it and skips empty parts", () => {
    expect(buildFrame({ person: " ", need: "", moment: "" })).toBe("เราจะช่วยให้คนที่เจอเรื่องนี้ได้อย่างไร");
  });

  it("keeps a space after ๆ", () => {
    expect(buildFrame({ person: "ลูก", need: "ป้องกันตัวเองจากอากาศแย่ ๆ", moment: "" })).toBe("เราจะช่วยให้ลูก ป้องกันตัวเองจากอากาศแย่ ๆ ได้อย่างไร");
  });

  it("never says ได้ twice", () => {
    expect(buildFrame({ person: "แม่", need: "เช็กข่าวได้", moment: "" })).toBe("เราจะช่วยให้แม่ เช็กข่าวได้อย่างไร");
  });
});

describe("checkFrame", () => {
  const ok = (text: string, person: string) => Object.fromEntries(checkFrame(text, person).map((c) => [c.key, c.ok]));

  it("passes a good question", () => {
    expect(ok("สามวินาทีก่อนกดแชร์ เราจะช่วยให้แม่ หยุดคิดก่อนแชร์ได้อย่างไร", "แม่")).toEqual({ person: true, question: true, blame: true, open: true });
  });

  it("flags blame words", () => {
    expect(ok("ทำไมไม่มีใครจัดการ คนผิดต้องโดนลงโทษ", "แม่").blame).toBe(false);
  });

  it("flags an answer hidden in the question", () => {
    expect(ok("เราจะทำแอปให้แม่หยุดคิดก่อนแชร์ได้อย่างไร", "แม่").open).toBe(false);
  });

  it("flags a statement that is not a question", () => {
    expect(ok("แม่แชร์ข่าวปลอม", "แม่").question).toBe(false);
  });

  it("flags a question with no person in it", () => {
    expect(ok("เราจะช่วยให้คนหยุดแชร์ได้อย่างไร", "แม่").person).toBe(false);
  });
});

describe("wrapLines", () => {
  it("never makes a line wider than the limit when words fit", () => {
    const measure = (s: string) => s.length * 10;
    const lines = wrapLines("เราจะช่วยให้แม่ หยุดคิดก่อนแชร์ สามวินาทีก่อนกดแชร์ ได้อย่างไร", 120, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(120);
    expect(lines.join("").replace(/\s/g, "")).toBe("เราจะช่วยให้แม่หยุดคิดก่อนแชร์สามวินาทีก่อนกดแชร์ได้อย่างไร");
  });
});
