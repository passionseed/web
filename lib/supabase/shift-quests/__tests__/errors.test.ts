/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

import { lintText } from "@/lib/marketing/copyRules";

import { hasQuestErrorText, questErrorText } from "../errors";

const MIGRATIONS = path.resolve(__dirname, "../../../../supabase/migrations");

/** Every refusal code the quest migrations can raise ('sq:<code>' or shift_quest__fail('<code>')). */
function migrationCodes(): string[] {
  const codes = new Set<string>();
  for (const file of fs.readdirSync(MIGRATIONS)) {
    if (!/^2026111109\d{4}_shift_quest.*\.sql$/.test(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
    for (const match of sql.matchAll(/sq:([a-z_]+)/g)) codes.add(match[1]);
    for (const match of sql.matchAll(/__fail\('([a-z_]+)'/g)) codes.add(match[1]);
  }
  return [...codes].sort();
}

/** The web's own codes, the side-quest codes (migration 090900) and the bot API's retry code. */
const EXTRA_CODES = [
  "invalid_input",
  "signed_out",
  "not_eligible",
  "not_started",
  "unavailable",
  "busy",
  "unknown",
  "discord_unavailable",
  "quest_locked",
  "quest_done",
  "quest_appealed",
];

describe("questErrorText", () => {
  const codes = [...new Set([...migrationCodes(), ...EXTRA_CODES])];

  it("finds the quest migrations", () => {
    expect(migrationCodes().length).toBeGreaterThan(40);
  });

  it.each(codes)("has its own Thai words for %s", (code) => {
    expect(hasQuestErrorText(code)).toBe(true);
    expect(questErrorText(code)).toMatch(/[฀-๿]/);
  });

  it("gives an unknown code the generic line", () => {
    expect(questErrorText("no_such_code")).toBe(questErrorText("unknown"));
    expect(hasQuestErrorText("no_such_code")).toBe(false);
    expect(hasQuestErrorText("toString")).toBe(false);
    expect(questErrorText("toString")).toBe(questErrorText("unknown"));
  });

  it("uses the exact words for the side quest codes", () => {
    expect(questErrorText("quest_locked")).toBe("เควสต์นี้ยังล็อกอยู่ ทำเควสต์ที่ปลดล็อกมันให้ผ่านก่อน");
    expect(questErrorText("quest_done")).toBe("โปรเจกต์นี้ผ่านเควสต์นี้แล้ว เลือกเควสต์อื่นได้เลย");
    expect(questErrorText("quest_appealed")).toBe("เควสต์นี้มีอุทธรณ์รอผลอยู่ ส่งใหม่ได้หลังรู้ผล");
  });

  it.each([...codes, "no_such_code"])("%s passes the copy rules: no em dash, emoji, markdown or slash commands", (code) => {
    const text = questErrorText(code);
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|`/);
    expect(text).not.toMatch(/(^|\s)\/[a-z]/);
    expect(text).not.toContain("\n");
    expect(lintText(text, code, "instagram")).toEqual([]);
  });
});
