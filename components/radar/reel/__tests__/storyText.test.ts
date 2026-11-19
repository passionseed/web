/**
 * @jest-environment node
 */
import { hostIdleFrameAt, HOST_IDLE_LOOP } from "@/components/radar/guide/story/story-logic";

import { slotXs, spriteSize, STAGE_FLOOR, SAFE, STORY_FRAME } from "../story/cast";
import { mouthOpen } from "../story/StoryCast";
import { BOX_TOP, bigFontSize, lineLength, phraseParts, phrases } from "../story/StoryText";

describe("story text", () => {
  it("breaks lines only between phrases, keeping numbers with their words", () => {
    expect(phrases("แต่จะรู้ได้ไงว่าชอบ ถ้ายังไม่เคยลองเลย")).toEqual(["แต่จะรู้ได้ไงว่าชอบ", "ถ้ายังไม่เคยลองเลย"]);
    expect(phrases("TCAS70 มี 4 รอบ รอบ 1 คือ Portfolio")).toEqual(["TCAS70", "มี 4 รอบ", "รอบ 1 คือ", "Portfolio"]);
    expect(phrases("ทำได้สูงสุด 40 รายการ")).toEqual(["ทำได้สูงสุด 40 รายการ"]);
  });

  it("types across phrases without splitting a Thai character", () => {
    const line = "ไม่รู้ ไม่ผิด";
    expect(lineLength(line)).toBe(8); // ไ ม่ รู้ + space + ไ ม่ ผิ ด
    expect(phraseParts(line, 0)).toEqual([
      { shown: "", ghost: "ไม่รู้" },
      { shown: "", ghost: "ไม่ผิด" },
    ]);
    expect(phraseParts(line, 2)).toEqual([
      { shown: "ไม่", ghost: "รู้" },
      { shown: "", ghost: "ไม่ผิด" },
    ]);
    expect(phraseParts(line, 6).map((p) => p.shown)).toEqual(["ไม่รู้", "ไม่"]);
    expect(phraseParts(line, Infinity).every((p) => p.ghost === "")).toBe(true);
  });

  it("sizes huge text down as it gets longer", () => {
    expect(bigFontSize("สั้น")).toBeGreaterThan(bigFontSize("ก".repeat(28)));
    expect(bigFontSize("ก".repeat(28))).toBeGreaterThan(bigFontSize("ก".repeat(60)));
  });
});

describe("story stage", () => {
  it("keeps words inside Instagram's safe zone and feet at the floor", () => {
    expect(BOX_TOP).toBeGreaterThan(STORY_FRAME.height * 0.12);
    expect(SAFE.bottom).toBe(Math.round(STORY_FRAME.height * 0.65));
    expect(STAGE_FLOOR).toBeLessThanOrEqual(SAFE.bottom + 4);
  });

  it("draws sprites on whole device pixels at 2.5x", () => {
    for (const who of ["student", "friend", "parent", "host"] as const) {
      const { w } = spriteSize(who);
      expect(Number.isInteger(w * STORY_FRAME.scale)).toBe(true);
    }
  });

  it("spreads one to three people across the stage", () => {
    expect(slotXs(1)).toEqual([216]);
    expect(slotXs(2)[0]).toBeLessThan(slotXs(2)[1]);
    expect(slotXs(4)).toHaveLength(4);
  });

  it("flaps a speaker's mouth only while talking", () => {
    expect(mouthOpen(10, 10, 20)).toBe(false);
    expect([...Array(20).keys()].some((k) => mouthOpen(10 + k, 10, 20))).toBe(true);
    expect(mouthOpen(31, 10, 20)).toBe(false);
  });

  it("runs P'Seed's idle loop from a clock", () => {
    const total = HOST_IDLE_LOOP.reduce((a, s) => a + s.ms, 0);
    expect(hostIdleFrameAt(0)).toBe(HOST_IDLE_LOOP[0].frame);
    expect(hostIdleFrameAt(total)).toBe(HOST_IDLE_LOOP[0].frame);
    expect(hostIdleFrameAt(HOST_IDLE_LOOP[0].ms)).toBe(HOST_IDLE_LOOP[1].frame);
    expect(hostIdleFrameAt(-1)).toBe(HOST_IDLE_LOOP[HOST_IDLE_LOOP.length - 1].frame);
  });
});
