import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MAIN_SLUGS } from "@/lib/shift-island/quest-canvas";
import { lintText } from "@/lib/marketing/copyRules";

import * as copy from "../copy";
import { PALETTE, WEB_SPRITES, HELP_FLAG, MAIN_ICONS, iconGrid, sideIcon, treeGrid } from "../sprites";

/** Sample arguments for the copy functions: a Thai word, numbers, a date, then a list. */
const SAMPLE_ARGS: unknown[][] = [["ตัวอย่าง", 3, 7, "15 พ.ค."], [["ตัวอย่าง", "อีกอย่าง"]]];

/** Every user-facing string in copy.ts, with a path for the failure message. */
function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (typeof value === "function") {
    for (const args of SAMPLE_ARGS) {
      try {
        const result = (value as (...a: unknown[]) => unknown)(...args);
        if (typeof result === "string") {
          out.push([`${path}()`, result]);
          return;
        }
      } catch {
        // Try the next argument shape.
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collect(item, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
  }
}

const strings: [string, string][] = [];
for (const [name, value] of Object.entries(copy)) {
  // Helpers that format data rather than hold copy are exercised below.
  if (name === "thaiShortDate" || name === "stageName" || name === "tileChip" || name === "unlockLine" || name === "questFlavor")
    continue;
  collect(value, name, strings);
}

describe("island copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThan(150);
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown", (path, text) => {
    expect(text).not.toMatch(/[—–]/);
    // These two Discord-matching entry/help cues are explicitly part of the reflection flow.
    const emojiCue = path === "REFLECT.entry" ? "✍️ " : "";
    if (emojiCue) expect(text.startsWith(emojiCue)).toBe(true);
    // discordHelp names the real Discord button, 🧱 ติด (I.btnStuck in the bot), and no other emoji.
    const named = path === "REFLECT.discordHelp" ? text.replace("🧱 ติด", "ติด") : text;
    if (path === "REFLECT.discordHelp") expect(text).toContain("/island แล้วกด 🧱 ติด");
    expect(named.slice(emojiCue.length)).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
  });

  it.each(strings)("%s never talks down", (_path, text) => {
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน \d+ วัน/i);
  });

  it("has a chip for every tile status and names the teammate on a held one", () => {
    expect(copy.tileChip("held", "มิ้นต์")).toBe("มิ้นต์ ทำอยู่");
    expect(copy.tileChip("held", null)).toBe("เพื่อนร่วมทีมทำอยู่");
    expect(copy.tileChip("submitted")).toBe("รอพี่เลี้ยงดู");
    expect(Object.keys(copy.TILE_CHIP).sort()).toEqual(
      ["active", "appealed", "available", "clarification", "declined", "done", "held", "locked", "paused", "submitted"].sort(),
    );
  });

  it("names all eight stages and clamps out-of-range ones", () => {
    expect(copy.STAGE_NAMES).toHaveLength(8);
    expect(copy.STAGE_NAMES[1]).toBe("เมล็ดงอก");
    expect(copy.PRE_STAGE).toBe("เมล็ด");
    expect(copy.stageName(0)).toBe("ที่ดินว่าง");
    expect(copy.stageName(7)).toBe("ผลิดอก");
    expect(copy.stageName(12)).toBe("ผลิดอก");
    expect(copy.stageName(-1)).toBe("ที่ดินว่าง");
    // A planted seed is the seed at stage 0, never an empty plot; later stages keep their names.
    expect(copy.treeStageName(0, true)).toBe(copy.PRE_STAGE);
    expect(copy.treeStageName(0, false)).toBe("ที่ดินว่าง");
    expect(copy.treeStageName(1, true)).toBe("เมล็ดงอก");
  });

  it("prints Bangkok short dates and tolerates bad input", () => {
    expect(copy.thaiShortDate("2026-05-15")).toMatch(/^15 พ\.ค\.$/);
    expect(copy.thaiShortDate("2026-05-14T18:30:00Z")).toMatch(/^15 พ\.ค\.$/);
    expect(copy.thaiShortDate(null)).toBe("");
    expect(copy.thaiShortDate("not a date")).toBe("");
  });

  it("words the Demo Day sign, the stage and the campfire", () => {
    expect(copy.FESTIVAL.sign("28 พ.ย.", 17)).toBe("Demo Day 28 พ.ย.\nอีก 17 วัน");
    expect(copy.FESTIVAL.sign("28 พ.ย.", 0)).toBe("Demo Day 28 พ.ย.\nวันนี้");
    expect(copy.FESTIVAL.stage(`28 พ.ย. · ${copy.SEASON.daysLeft(0)}`)).toBe("เวที Demo Day: 28 พ.ย. · วันนี้");
    expect(copy.CAMPFIRE.spot(0)).toBe("กองไฟ: ห้อง coworking");
    expect(copy.CAMPFIRE.spot(3)).toBe("กองไฟ: ห้อง coworking มี 3 คน");
    expect(copy.NOTICE.pinned(["ก", "ข"])).toBe("กระดานเควสต์: ก · ข");
    expect(copy.NOTICE.board).toBe(copy.HUD.board);
    expect(copy.CAMPFIRE.title).toBe("กองไฟ");
    expect(copy.FESTIVAL.title).toBe("เวที Demo Day");
    expect(copy.FESTIVAL.legendHeading).toBe("ที่ลานกลางเกาะ");
    expect(copy.FESTIVAL.lanterns(4, 10)).toBe("โคมที่ลานสว่างขึ้นทีละดวง ตามเป้าหมายของทั้งเกาะ 4/10");
  });

  it("names one pitfall or two, with a warning sign and a way around it, for every main quest", () => {
    // Every main quest, plus the first act's skill side quests (20261115090000).
    const sides = ["side-practice-talk", "side-question-check", "side-stakeholder-map"];
    expect(Object.keys(copy.QUEST_PITFALLS).sort()).toEqual([...Object.values(MAIN_SLUGS), ...sides].sort());
    for (const pitfalls of Object.values(copy.QUEST_PITFALLS)) {
      expect(pitfalls.length).toBeGreaterThanOrEqual(1);
      expect(pitfalls.length).toBeLessThanOrEqual(2);
      for (const p of pitfalls) {
        for (const text of [p.name, p.sign, p.avoid]) {
          expect(text.trim().length).toBeGreaterThan(0);
          expect(text).not.toMatch(/[—–]|น้อง/);
        }
      }
    }
    expect(copy.questPitfalls("main", "first-partner").map((p) => p.name)).toEqual(["เยสแบบสุภาพ"]);
    expect(copy.questPitfalls("proposed", "first-partner")).toEqual([]);
    expect(copy.questPitfalls("side", "side-readme")).toEqual([]);
    expect(copy.questPitfalls("main", "toString")).toEqual([]);
  });

  it("keeps every quest's English words in English, with Thai beside them and a meaning, house rules kept", () => {
    const known = new Set([...Object.values(MAIN_SLUGS), "side-stakeholder-map", "side-practice-talk", "side-question-check", "side-warm-intro"]);
    for (const [slug, terms] of Object.entries(copy.QUEST_TERMS)) {
      expect(known.has(slug)).toBe(true);
      for (const t of terms) {
        expect(t.term).toMatch(/^[A-Za-z][A-Za-z -]*$/);
        for (const text of [t.thai, t.meaning]) {
          expect(text.trim().length).toBeGreaterThan(0);
          expect(text).not.toMatch(/[—–]|น้อง/);
        }
      }
    }
    for (const [slug, steps] of Object.entries(copy.QUEST_STEPS)) {
      expect(known.has(slug)).toBe(true);
      for (const step of steps) expect(step.text).not.toMatch(/[—–]|น้อง/);
    }
    expect(copy.questTerms("side", "side-stakeholder-map").map((t) => t.term)).toContain("Stakeholder");
    expect(copy.questTerms("proposed", "side-stakeholder-map")).toEqual([]);
    expect(copy.questSteps("side", "toString")).toEqual([]);
  });

  it("puts every main quest in exactly one act, in order", () => {
    expect(copy.QUEST_ACTS.flatMap((act) => act.milestones)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(copy.QUEST_ACTS.map((act) => act.title)).toEqual(["หาคนที่ใช่", "สร้างสิ่งที่สำคัญ", "ขยาย"]);
    expect(copy.QUEST_ACTS[0].milestones).toContain(copy.PARTNER_MILESTONE);
  });

  it("names each place once, in PLACES", () => {
    expect(copy.ISLAND.title).toBe(copy.PLACES.island);
    expect(copy.HUD.board).toBe(copy.PLACES.board);
    expect(copy.CAMPFIRE.title).toBe(copy.PLACES.campfire);
    expect(copy.DEEPFIRE.title).toBe(copy.PLACES.deepfire);
    // The deep fire's button is named after its place, lit or asleep.
    expect(copy.DEEPFIRE.spot.startsWith(`${copy.PLACES.deepfire}: `)).toBe(true);
    expect(copy.DEEPFIRE.spotAsleep.startsWith(`${copy.PLACES.deepfire}: `)).toBe(true);
    expect(copy.FESTIVAL.title).toBe(copy.PLACES.stage);
  });

  it("has one short lore line for every main and side quest, none for a proposed one", () => {
    const migrations = join(__dirname, "..", "..", "..", "..", "supabase", "migrations");
    const sidesIn = (file: string) => readFileSync(join(migrations, file), "utf8").match(/'side-[a-z-]+'/g) ?? [];
    const sides = new Set(
      [...sidesIn("20261111090900_shift_quests_board.sql"), ...sidesIn("20261115090000_shift_quests_pitfall_map.sql")]
        .map((s) => s.slice(1, -1))
    );
    // Retired by the pitfall quest map (main quest 5 does the same thing).
    sides.delete("side-fix-one-thing");
    const slugs = new Set([...Object.values(MAIN_SLUGS), ...sides]);
    expect(slugs.size).toBe(24);
    expect(Object.keys(copy.QUEST_FLAVOR).sort()).toEqual([...slugs].sort());
    for (const line of Object.values(copy.QUEST_FLAVOR)) expect(line.length).toBeLessThanOrEqual(60);
    expect(copy.questFlavor("main", "meet-one-real-person")).toBe("ทุกต้นเริ่มจากคนหนึ่งคนที่เจอปัญหาจริง");
    expect(copy.questFlavor("side", "side-readme")).toBe("คู่มือที่ดี ทำให้งานเดินต่อได้แม้คุณไม่อยู่");
    expect(copy.questFlavor("proposed", "meet-one-real-person")).toBeNull();
    expect(copy.questFlavor("side", "no-such-quest")).toBeNull();
    expect(copy.questFlavor("main", null)).toBeNull();
    expect(copy.questFlavor("main", "toString")).toBeNull();
  });

  it("words unlocks by state", () => {
    const base = { id: "u1", label: "สติกเกอร์เกาะ", milestone_count: 3, deadline: "2026-05-15" };
    expect(copy.unlockLine({ ...base, earned: true })).toBe("สติกเกอร์เกาะ: ได้แล้ว");
    expect(copy.unlockLine({ ...base, earned: false, expired: true })).toBe("สติกเกอร์เกาะ: หมดเวลาแล้ว");
    expect(copy.unlockLine({ ...base, earned: false })).toMatch(/^สติกเกอร์เกาะ: ครบ 3 ขั้นก่อน 15 พ\.ค\.$/);
  });
});

describe("island sprites", () => {
  const keys = new Set(Object.keys(PALETTE));

  it.each(Object.entries({ ...WEB_SPRITES, help_flag: HELP_FLAG }))("%s uses only palette keys on an even grid", (_name, grid) => {
    const width = grid[0].length;
    for (const row of grid) {
      expect(row).toHaveLength(width);
      for (const ch of row) if (ch !== ".") expect(keys.has(ch)).toBe(true);
    }
  });

  it("draws the 16x16 web icons at 16x16", () => {
    for (const grid of Object.values(WEB_SPRITES)) {
      expect(grid).toHaveLength(16);
      expect(grid[0]).toHaveLength(16);
    }
  });

  it("has an icon for every main quest and every tree stage", () => {
    for (let m = 1; m <= 7; m++) expect(iconGrid(MAIN_ICONS[m]).length).toBeGreaterThan(0);
    for (let s = 0; s <= 7; s++) expect(treeGrid(s)).toHaveLength(40);
    expect(treeGrid(99)).toBe(treeGrid(7));
  });

  it("maps side quest icon keys, falling back to a seed", () => {
    expect(sideIcon("key")).toBe("key_flag");
    expect(sideIcon("compass")).toBe("compass");
    expect(sideIcon("well")).toBe("well");
    expect(sideIcon("nope")).toBe("seed");
    expect(sideIcon(null)).toBe("seed");
  });

  it("words the tree: seeds, gifts, wardrobe and the close-up in the house style", () => {
    const tree: [string, string][] = [];
    collect(copy.TREE, "TREE", tree);
    expect(tree.length).toBeGreaterThan(25);
    for (const [path, text] of tree) {
      expect([path, /—|–|น้องๆ|ปลูก|สตรีค|streak|เหี่ยว|อันดับ/i.test(text)]).toEqual([path, false]);
    }
    expect(Object.keys(copy.TREE.seeds).sort()).toEqual(["maple", "oak", "pine", "sakura"]);
    expect(copy.TREE.seeds.oak.name).toBe("ต้นโอ๊ก");
    expect(copy.TREE.gift.keep).toBe("เก็บไว้ก่อน");
  });
});
