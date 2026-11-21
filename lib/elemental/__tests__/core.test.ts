/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { piiFlags } from "@/lib/supabase/shift-quests/canvas-snapshot";

import {
  ELEMENT_KEYS,
  ELEMENT_LABELS,
  addBangkokDays,
  atBangkok,
  bangkokDay,
  bangkokTime,
  elementIndex,
  isBangkokDay,
  isBangkokTime,
  isElementKey,
  isEventDay,
  piiKind,
  refusePii,
  scheduleDay,
  scheduledAt,
  type ElementalSchedule,
  type PiiKind,
} from "../core";
import cases from "../core/pii-cases.json";

const CORE_DIR = path.join(__dirname, "..", "core");

describe("elements", () => {
  it("match ELEMENTAL.elements in facts.ts, in order", () => {
    expect([...ELEMENT_KEYS]).toEqual(ELEMENTAL.elements.map((e) => e.key));
    for (const e of ELEMENTAL.elements) {
      expect(ELEMENT_LABELS[e.key]).toEqual({ en: e.en, th: e.th });
    }
    expect(Object.keys(ELEMENT_LABELS)).toEqual([...ELEMENT_KEYS]);
  });

  it("are the five fixed keys", () => {
    expect(ELEMENT_KEYS).toEqual(["water", "earth", "air", "fire", "aether"]);
  });

  it("checks keys and positions", () => {
    expect(isElementKey("fire")).toBe(true);
    expect(isElementKey("Fire")).toBe(false);
    expect(isElementKey("metal")).toBe(false);
    expect(isElementKey(undefined)).toBe(false);
    expect(elementIndex("water")).toBe(0);
    expect(elementIndex("aether")).toBe(4);
    expect(elementIndex("wood")).toBe(-1);
  });

  it("does not import facts.ts at runtime", () => {
    const source = readFileSync(path.join(CORE_DIR, "elements.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*facts["']/);
  });
});

describe("refusePii", () => {
  it.each([
    ["081-234-5678", "phone"],
    ["+66812345678", "phone"],
    ["๐๘๑๒๓๔๕๖๗๘", "phone"],
    ["a@b.co", "email"],
    ["@someone", "handle"],
    ["line: abc", "line"],
    ["ig: x", "social"],
  ] as const)("refuses %j as %s", (text, kind) => {
    expect(refusePii({ who: text })).toEqual({ ok: false, field: "who", kind });
  });

  it.each(["แม่ของเพื่อนที่เชียงราย", "a parent in Chiang Rai"])("passes %j", (text) => {
    expect(refusePii({ who: text })).toEqual({ ok: true });
  });

  it("names the first offending field in key order and never echoes the text", () => {
    const text = "line: abc";
    const result = refusePii({ who: "a classmate", tried: "the map", quote: text, changed: "a@b.co" });
    expect(result).toEqual({ ok: false, field: "quote", kind: "line" });
    expect(JSON.stringify(result)).not.toContain("abc");
  });

  it("skips empty, null and undefined fields", () => {
    expect(refusePii({ who: "", tried: null, quote: undefined })).toEqual({ ok: true });
    expect(refusePii({})).toEqual({ ok: true });
  });
});

describe("pii-cases.json (shared with the SQL check)", () => {
  const refuse: { text: string; kind: PiiKind }[] = cases.refuse as { text: string; kind: PiiKind }[];
  const pass: { text: string }[] = cases.pass;

  it("has the ticket's required cases", () => {
    const texts = refuse.map((c) => c.text);
    for (const t of ["081-234-5678", "+66812345678", "๐๘๑๒๓๔๕๖๗๘", "a@b.co", "@someone", "line: abc", "ig: x"]) {
      expect(texts).toContain(t);
    }
    expect(pass.map((c) => c.text)).toEqual(
      expect.arrayContaining(["แม่ของเพื่อนที่เชียงราย", "a parent in Chiang Rai"]),
    );
  });

  it.each(refuse.map((c) => [c.text, c.kind] as const))("refuses %j as %s", (text, kind) => {
    expect(piiKind(text)).toBe(kind);
  });

  it.each(pass.map((c) => [c.text] as const))("passes %j", (text) => {
    expect(piiKind(text)).toBeNull();
    // A pass case must pass piiFlags too, or it is not a safe pass.
    expect(piiFlags(text)).toBe(false);
  });

  it("is a one-way superset of piiFlags: whatever piiFlags flags is refused", () => {
    const flagged = [...refuse, ...pass].map((c) => c.text).filter((text) => piiFlags(text));
    expect(flagged.length).toBeGreaterThan(20);
    expect(flagged.filter((text) => refusePii({ text }).ok)).toEqual([]);
  });

  it("refuses strictly more than piiFlags (handles of any length, URLs)", () => {
    const onlyRefused = refuse.filter((c) => !piiFlags(c.text)).map((c) => c.text);
    expect(onlyRefused).toEqual(expect.arrayContaining(["ig: x", "line: a", "@ab", "https://example.com/x"]));
  });

  it("stays a superset of piiFlags over 20,000 random strings", () => {
    const tokens = [
      "0", "8", "1", "2", "6", "9", "๐", "๘", "+", "66", " ", "-", ".", "(", ")", "@", "＠", "a", "b", "k",
      "x", "m", "i", "g", "e", "_", ":", "：", "=", "line", "Line", "ไลน์", "id", "ID", "ig", "fb", "insta",
      "tiktok", "twitter", "ไอจี", "เฟส", ".com", ".co", "co", "th", "​", "ร้าน", "เบอร์",
    ];
    let seed = 0x5eed;
    const next = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const misses: string[] = [];
    for (let i = 0; i < 20_000; i++) {
      const length = 1 + Math.floor(next() * 14);
      let text = "";
      for (let j = 0; j < length; j++) text += tokens[Math.floor(next() * tokens.length)];
      if (piiFlags(text) && piiKind(text) === null) misses.push(text);
    }
    expect(misses).toEqual([]);
  });
});

describe("Bangkok time", () => {
  it("rolls the day over at 17:00Z", () => {
    expect(bangkokDay(new Date("2026-12-04T16:59:00Z"))).toBe("2026-12-04");
    expect(bangkokDay(new Date("2026-12-04T17:01:00Z"))).toBe("2026-12-05");
    expect(bangkokDay(Date.parse("2026-12-04T17:00:00Z"))).toBe("2026-12-05");
    expect(bangkokDay(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
  });

  it("turns a Bangkok day and time into an instant", () => {
    expect(atBangkok("2026-12-04", "20:30").toISOString()).toBe("2026-12-04T13:30:00.000Z");
    expect(atBangkok("2026-12-05", "00:00").toISOString()).toBe("2026-12-04T17:00:00.000Z");
    expect(atBangkok("2026-12-04", "19:00").toISOString()).toBe("2026-12-04T12:00:00.000Z");
    expect(bangkokTime(atBangkok("2026-12-06", "23:59"))).toBe("23:59");
    expect(bangkokDay(atBangkok("2026-12-06", "23:59"))).toBe("2026-12-06");
  });

  it("refuses malformed days and times", () => {
    expect(() => atBangkok("2026-02-30", "10:00")).toThrow(RangeError);
    expect(() => atBangkok("2026-12-4", "10:00")).toThrow(RangeError);
    expect(() => atBangkok("2026-12-04", "24:00")).toThrow(RangeError);
    expect(() => atBangkok("2026-12-04", "8:30")).toThrow(RangeError);
    expect(() => bangkokDay(new Date("nope"))).toThrow(RangeError);
    expect(isBangkokDay("2028-02-29")).toBe(true);
    expect(isBangkokDay("2026-02-29")).toBe(false);
    expect(isBangkokTime("23:59")).toBe(true);
    expect(isBangkokTime("23:60")).toBe(false);
  });

  it("adds days across months", () => {
    expect(addBangkokDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addBangkokDays("2026-12-01", -1)).toBe("2026-11-30");
  });

  describe("schedule", () => {
    const schedule: ElementalSchedule = {
      "2026-12-04": { opening_at: "19:00", call_at: "19:55", card_at: "20:30" },
      "2026-12-05": { call_at: "19:55", card_at: "20:30" },
    };

    it("knows event days by the Bangkok day", () => {
      expect(isEventDay(schedule, new Date("2026-12-04T16:59:00Z"))).toBe(true);
      expect(isEventDay(schedule, new Date("2026-12-03T17:01:00Z"))).toBe(true);
      expect(isEventDay(schedule, new Date("2026-12-03T16:59:00Z"))).toBe(false);
      expect(isEventDay(schedule, new Date("2026-12-05T17:01:00Z"))).toBe(false);
      expect(isEventDay(null, new Date("2026-12-04T12:00:00Z"))).toBe(false);
      expect(isEventDay({}, new Date("2026-12-04T12:00:00Z"))).toBe(false);
    });

    it("ignores inherited keys and non-object entries from the database", () => {
      const odd = JSON.parse('{"2026-12-04": "20:30", "2026-12-05": null}') as ElementalSchedule;
      expect(scheduleDay(odd, "2026-12-04")).toBeNull();
      expect(scheduleDay(odd, "2026-12-05")).toBeNull();
      expect(scheduleDay(schedule, "toString")).toBeNull();
    });

    it("gives each post's instant", () => {
      expect(scheduledAt(schedule, "2026-12-04", "card_at")?.toISOString()).toBe("2026-12-04T13:30:00.000Z");
      expect(scheduledAt(schedule, "2026-12-04", "opening_at")?.toISOString()).toBe("2026-12-04T12:00:00.000Z");
      expect(scheduledAt(schedule, "2026-12-05", "opening_at")).toBeNull();
      expect(scheduledAt(schedule, "2026-12-06", "card_at")).toBeNull();
      const bad = { "2026-12-04": { call_at: "7pm", card_at: "20:30" } } as ElementalSchedule;
      expect(scheduledAt(bad, "2026-12-04", "call_at")).toBeNull();
    });
  });
});
