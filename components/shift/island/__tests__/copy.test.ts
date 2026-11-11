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
  if (name === "thaiShortDate" || name === "stageName" || name === "tileChip" || name === "unlockLine") continue;
  collect(value, name, strings);
}

describe("island copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThan(150);
  });

  it.each(strings)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(strings)("%s has no em dash, emoji or markdown", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
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
    expect(copy.stageName(0)).toBe("ที่ดินว่าง");
    expect(copy.stageName(7)).toBe("ผลิดอก");
    expect(copy.stageName(12)).toBe("ผลิดอก");
    expect(copy.stageName(-1)).toBe("ที่ดินว่าง");
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
});
