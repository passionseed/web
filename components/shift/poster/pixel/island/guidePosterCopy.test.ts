/** @jest-environment node */

import { I } from "@/bot/src/quests/island/copy";
import { R } from "@/bot/src/quests/rounds-copy";
import { lintText } from "@/lib/marketing/copyRules";
import { FOCUS_MINUTES, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

import { GUIDE_POSTER_BUTTONS, ISLAND_GUIDE_POSTER, guidePosterStrings } from "./guidePosterCopy";

const ALL = guidePosterStrings();

describe("SHIFT Island guide poster copy", () => {
  it("collects the copy", () => {
    expect(ALL.length).toBeGreaterThan(20);
  });

  it("passes the marketing copy rules", () => {
    expect(ALL.flatMap((text, i) => lintText(text, `poster[${i}]`, "instagram"))).toEqual([]);
  });

  it.each([
    ["ปลูก (say ลงแปลง)", /ปลูก/],
    ["เด็ก", /เด็ก/],
    ["streak wording", /streak|สตรีค|ติดต่อกัน/i],
    ["a price", /฿|บาท/],
    ["a coin amount", /\d+\s*(?:Passioncoin|coin|เหรียญ)/i],
    ["a date", /\d{1,2}\s*(?:พ\.ย\.|ธ\.ค\.|Nov|Dec)/i],
  ])("has no %s", (_label, pattern) => {
    expect(ALL.filter((text) => pattern.test(text))).toEqual([]);
  });

  it("reads the round's minutes from the rules", () => {
    const daily = JSON.stringify(ISLAND_GUIDE_POSTER.steps[1]);
    expect(daily).toContain(`โฟกัส ${FOCUS_MINUTES} นาที`);
    expect(daily).toContain(`พัก ${REST_MINUTES} นาที`);
  });

  it("uses the bot's own button labels", () => {
    // The bot's labels start with an emoji; the poster draws a pixel icon in its place.
    const label = (button: string) => button.replace(/^\S+\s/, "");
    expect(GUIDE_POSTER_BUTTONS).toEqual({
      claim: label(I.btnClaim),
      milestone: label(I.btnMilestone),
      close: label(R.btnClose),
    });
  });

  it("numbers the steps 1 to 3 in order", () => {
    expect(ISLAND_GUIDE_POSTER.steps.map((s) => s.n)).toEqual([1, 2, 3]);
  });
});
