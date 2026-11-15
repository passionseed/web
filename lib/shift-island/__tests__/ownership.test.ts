/** @jest-environment node */
import { OWNERSHIP_ICON as BOT_ICON, OWNERSHIP_ITEM, OWNERSHIP_STATE } from "@/bot/src/quests/copy";

import {
  OWNERSHIP_ICON,
  OWNERSHIP_ITEMS,
  OWNERSHIP_LABEL,
  OWNERSHIP_STATE_LABEL,
  OWNERSHIP_STATES,
  ownershipAllLit,
  ownershipLit,
  ownershipRows,
  ownershipSnapshot,
  proofWithOwnership,
  TAKE_THE_KEYS,
  TAKE_THE_KEYS_CHECKED,
} from "../ownership";
import { MAIN_SLUGS, questGuideSpec } from "../quest-canvas";

describe("ownership", () => {
  it("uses the bot's labels, states and icons, so Discord and the web say the same", () => {
    expect(Object.keys(OWNERSHIP_ITEM)).toEqual([...OWNERSHIP_ITEMS]);
    for (const item of OWNERSHIP_ITEMS) expect(OWNERSHIP_LABEL[item]).toBe(OWNERSHIP_ITEM[item].label);
    expect(Object.keys(OWNERSHIP_STATE).sort()).toEqual([...OWNERSHIP_STATES].sort());
    for (const state of OWNERSHIP_STATES) {
      expect(OWNERSHIP_STATE_LABEL[state]).toBe(OWNERSHIP_STATE[state]);
      expect(OWNERSHIP_ICON[state]).toBe(BOT_ICON[state]);
    }
  });

  it("is a side quest since the pitfall quest map, whose first item the checklist lights", () => {
    expect(Object.values(MAIN_SLUGS)).not.toContain(TAKE_THE_KEYS);
    expect(questGuideSpec({ kind: "side", slug: TAKE_THE_KEYS }).checklist[0].id).toBe(TAKE_THE_KEYS_CHECKED);
  });

  it("parses the database's rows in the bot's order and drops anything unknown", () => {
    expect(ownershipRows(null)).toBeNull();
    expect(ownershipRows("nope")).toEqual([]);
    expect(
      ownershipRows([
        { item: "team", state: "demonstrated", mentor_held: false },
        { item: "access", state: "not_applicable", mentor_held: true, note: "never read" },
        { item: "access", state: "demonstrated" },
        { item: "keys", state: "demonstrated" },
        { item: "costs", state: "done" },
        null,
      ])
    ).toEqual([
      { item: "access", state: "not_applicable", mentorHeld: true },
      { item: "team", state: "demonstrated", mentorHeld: false },
    ]);
  });

  it("lights an item shown working or ruled out, never one resting on a mentor's account", () => {
    expect(ownershipLit({ item: "access", state: "demonstrated", mentorHeld: false })).toBe(true);
    expect(ownershipLit({ item: "access", state: "not_applicable", mentorHeld: false })).toBe(true);
    expect(ownershipLit({ item: "access", state: "demonstrated", mentorHeld: true })).toBe(false);
    expect(ownershipLit({ item: "access", state: "needs_help", mentorHeld: false })).toBe(false);
    expect(ownershipAllLit([])).toBe(false);
  });

  it("snapshots the states, and refuses rather than cut the student's proof", () => {
    const rows = [{ item: "export" as const, state: "needs_help" as const, mentorHeld: false }];
    expect(ownershipSnapshot(rows)).toBe("เช็กลิสต์ /project ownership ตอนส่ง\n🆘 สำรองหรือส่งออกได้: ต้องการความช่วยเหลือ");
    expect(proofWithOwnership("งาน", [], 10)).toBe("งาน");
    expect(proofWithOwnership("งาน", rows, 2000)).toBe(`งาน\n\n${ownershipSnapshot(rows)}`);
    expect(proofWithOwnership("ก".repeat(1990), rows, 2000)).toBeNull();
  });
});
