/**
 * @jest-environment node
 */
import { hostIdleFrameAt, HOST_IDLE_LOOP } from "@/components/radar/guide/story/story-logic";
import { AVATAR_GRID } from "@/components/radar/guide/story/pixel-art";

import { CAST_LOOK, END_HOST, endHostSpot, headTop, spriteSize, stageXs, STAGE_FLOOR, STAGE_SPAN, SAFE, STORY_FRAME } from "../story/cast";
import { nextFitSize, overflowFactor } from "../story/fit";
import { AVATAR_FRAMES, MOTHER_FRAMES, topRow } from "../story/sprites";
import { blinking, HOST_LISTENER_FILTER, idleBob, mouthOpen } from "../story/StoryCast";
import { endUrlSize, END_COLUMN } from "../story/StoryEndCard";
import { bigBand, BOX_TOP, bigFontSize, hookScale, lineLength, phraseParts, phrases } from "../story/StoryText";

describe("story text", () => {
  it("breaks lines only between phrases, keeping numbers with their words", () => {
    expect(phrases("แต่จะรู้ได้ไงว่าชอบ ถ้ายังไม่เคยลองเลย")).toEqual(["แต่จะรู้ได้ไงว่าชอบ", "ถ้ายังไม่เคยลองเลย"]);
    expect(phrases("TCAS70 มี 4 รอบ รอบ 1 คือ Portfolio")).toEqual(["TCAS70", "มี 4 รอบ", "รอบ 1 คือ", "Portfolio"]);
    expect(phrases("ทำได้สูงสุด 40 รายการ")).toEqual(["ทำได้สูงสุด 40 รายการ"]);
    // A word that leads into a number keeps it, however long the word.
    expect(phrases("เธอจะยื่นรอบ 1 ไหม ทำพอร์ตยัง")).toEqual(["เธอจะยื่นรอบ 1 ไหม", "ทำพอร์ตยัง"]);
  });

  it("never glues a long tail after a number", () => {
    expect(phrases("สอบก็ดี รอบ 1 ก็อีกทางที่ผลงานเธอพูดแทนได้")).toEqual(["สอบก็ดี", "รอบ 1", "ก็อีกทางที่ผลงานเธอพูดแทนได้"]);
    expect(phrases("ปี 2567 ไทยส่งออกกว่า 21 ล้านเครื่อง")).toEqual(["ปี 2567", "ไทยส่งออกกว่า 21 ล้านเครื่อง"]);
  });

  it("keeps a short Latin word with its verb, and particles with their phrase", () => {
    expect(phrases("ผลสำรวจพบนักการตลาด 80% ใช้ AI ช่วยแล้ว")).toEqual(["ผลสำรวจพบนักการตลาด", "80% ใช้ AI", "ช่วยแล้ว"]);
    expect(phrases("หรือเราตามเพื่อนไม่ทันแล้วจริงๆ อะ")).toEqual(["หรือเราตามเพื่อนไม่ทันแล้วจริงๆ อะ"]);
    expect(phrases("คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ ด่าน UX/UI ให้")).toEqual(["คอมเมนต์", "RADAR", "เดี๋ยวส่งลิงก์", "ด่าน", "UX/UI ให้"]);
    expect(phrases("ไปสาย UX/UI สิ นั่งวาดหน้าจอสวยๆ")).toEqual(["ไปสาย", "UX/UI สิ", "นั่งวาดหน้าจอสวยๆ"]);
  });

  it("types a glued phrase with its inner spaces", () => {
    const line = "มี 4 รอบ นะ";
    expect(phrases(line)).toEqual(["มี 4 รอบ นะ"]);
    expect(phraseParts(line, lineLength(line))).toEqual([{ shown: "มี 4 รอบ นะ", ghost: "" }]);
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

  it("shrinks text that does not fit, a step at a time, never below the floor", () => {
    expect(overflowFactor({ avail: 300, widest: 280 })).toBe(1);
    expect(overflowFactor({ avail: 300, widest: 400 })).toBeCloseTo(0.75);
    expect(overflowFactor({ avail: 300, widest: 200, height: 200, maxHeight: 150 })).toBeLessThan(1);
    expect(overflowFactor({ avail: 300, widest: 200, height: 140, maxHeight: 150 })).toBe(1);
    expect(nextFitSize(38, 0.99, 20)).toBe(37);
    expect(nextFitSize(38, 0.5, 20)).toBe(20);
    expect(nextFitSize(40, 0.75, 20)).toBe(30);
  });
});

describe("big text", () => {
  it("stays between the top band and the highest head on stage", () => {
    const studentHead = headTop("student");
    const band = bigBand(studentHead);
    expect(band.top).toBeGreaterThanOrEqual(SAFE.top + 20); // room for the name tag above the plate
    expect(band.bottom).toBeLessThanOrEqual(studentHead - 8);
    expect(bigBand(headTop("parent")).bottom).toBeLessThan(band.bottom); // the mother is taller
    const empty = bigBand(null);
    expect(empty.bottom - empty.top).toBe(236);
    expect(bigBand(studentHead, true).top).toBeGreaterThanOrEqual(SAFE.top);
  });

  it("punches the hook in after the cover frame, from the frame number alone", () => {
    expect(hookScale(0, 60)).toBe(1); // frame 0 is the cover: at rest
    const scales = Array.from({ length: 60 }, (_, f) => hookScale(f, 60));
    expect(new Set(scales.slice(0, 45)).size).toBeGreaterThan(20); // it moves through the first 1.5 s
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.06);
    expect(hookScale(17, 60)).toBe(hookScale(17, 60));
  });
});

describe("story stage", () => {
  it("keeps words inside the platforms' safe zone and feet at the floor", () => {
    expect(SAFE.top).toBe(Math.round(STORY_FRAME.height * 0.14));
    expect(SAFE.right).toBe(Math.round(STORY_FRAME.width * 0.88));
    expect(SAFE.floor).toBe(Math.round(STORY_FRAME.height * 0.8));
    // Name tags hang 20px above their box: still below the top 14%.
    expect(BOX_TOP - 20).toBeGreaterThanOrEqual(SAFE.top);
    expect(END_COLUMN.top).toBeGreaterThanOrEqual(SAFE.top);
    expect(STORY_FRAME.width - END_COLUMN.side).toBeLessThanOrEqual(SAFE.right);
    expect(SAFE.bottom).toBe(Math.round(STORY_FRAME.height * 0.65));
    expect(STAGE_FLOOR).toBeLessThanOrEqual(SAFE.bottom + 4);
  });

  it("draws sprites on whole device pixels at 2.5x", () => {
    for (const who of ["student", "friend", "parent", "host"] as const) {
      const { w } = spriteSize(who);
      expect(Number.isInteger(w * STORY_FRAME.scale)).toBe(true);
    }
  });

  it("spreads the cast across the stage, clear of the right rail", () => {
    expect(stageXs([])).toEqual([]);
    expect(stageXs(["student"])).toEqual([216]);
    const casts = [["student", "host"], ["student", "parent"], ["friend", "host"], ["student", "friend", "host"], ["student", "friend", "parent", "host"]] as const;
    for (const cast of casts) {
      const xs = stageXs(cast);
      expect(xs).toHaveLength(cast.length);
      xs.forEach((x, i) => {
        const half = spriteSize(cast[i]).w / 2;
        expect(x + half).toBeLessThanOrEqual(STAGE_SPAN.right);
        expect(x + half).toBeLessThanOrEqual(SAFE.right);
        expect(x - half).toBeGreaterThanOrEqual(0);
        if (i > 0) expect(x).toBeGreaterThan(xs[i - 1]);
      });
    }
  });

  it("knows where each head starts", () => {
    expect(headTop("student")).toBe(STAGE_FLOOR - spriteSize("student").h + CAST_LOOK.student.cell);
    expect(headTop("parent")).toBeLessThan(headTop("student"));
    expect(headTop("host")).toBe(STAGE_FLOOR - spriteSize("host").h);
  });

  it("draws the mother as her own sprite, not a palette swap of the student", () => {
    for (const frames of [AVATAR_FRAMES, MOTHER_FRAMES]) {
      for (const grid of [frames.idle, frames.talk, frames.blink]) {
        expect(grid).toHaveLength(AVATAR_GRID.h);
        grid.forEach((row) => expect(row).toHaveLength(AVATAR_GRID.w));
      }
      expect(frames.blink).not.toEqual(frames.idle);
      expect(frames.talk).not.toEqual(frames.idle);
    }
    expect(CAST_LOOK.parent.frames).toBe(MOTHER_FRAMES);
    expect(MOTHER_FRAMES.idle).not.toEqual(AVATAR_FRAMES.idle);
    // An apron and a skirt that the student's sprite does not have.
    expect(MOTHER_FRAMES.idle.join("")).toContain("A");
    expect(AVATAR_FRAMES.idle.join("")).not.toContain("A");
    expect(topRow(MOTHER_FRAMES.idle)).toBe(1);
  });

  it("breathes and blinks from the frame number, inside the hook", () => {
    for (const who of ["student", "friend", "parent"] as const) {
      const bobs = Array.from({ length: 45 }, (_, f) => idleBob(f, who));
      expect(new Set(bobs).size).toBe(2); // moves within the first 1.5 s
      expect(Array.from({ length: 45 }, (_, f) => blinking(f, who)).some(Boolean)).toBe(true);
      expect(idleBob(123, who)).toBe(idleBob(123, who));
    }
    // Not all in step.
    expect(Array.from({ length: 45 }, (_, f) => blinking(f, "student") === blinking(f, "friend")).every(Boolean)).toBe(false);
  });

  it("barely dims P'Seed while it listens, so the flame stays yellow", () => {
    const k = Number(/brightness\(([\d.]+)\)/.exec(HOST_LISTENER_FILTER)?.[1] ?? "1");
    expect(k).toBeGreaterThanOrEqual(0.9);
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

describe("end card", () => {
  it("puts P'Seed below the share line and above the bottom 20%, or leaves it out", () => {
    const resting = endHostSpot(0)!;
    expect(resting.top).toBe(END_HOST.top);
    expect(resting.cell).toBe(END_HOST.cells[0]);
    for (const bottom of [300, 420, 460, 500, 540]) {
      const spot = endHostSpot(bottom);
      if (!spot) continue;
      expect(spot.top).toBeGreaterThanOrEqual(bottom + END_HOST.gap);
      expect(spot.floor).toBeLessThanOrEqual(SAFE.floor);
      expect(Number.isInteger(spot.cell * STORY_FRAME.scale)).toBe(true);
    }
    expect(endHostSpot(500)!.cell).toBeLessThan(END_HOST.cells[0]); // shrinks to fit
    expect(endHostSpot(SAFE.floor - 40)).toBeNull(); // no room at all: sits the card out
  });

  it("sizes the link to fit the CTA box on one line", () => {
    expect(endUrlSize("passionseed.org/radar")).toBeLessThanOrEqual(24);
    const long = "passionseed.org/r/cyber-round1";
    expect(endUrlSize(long) * 0.6 * long.length).toBeLessThanOrEqual(STORY_FRAME.width - 2 * END_COLUMN.side - 56);
  });
});
