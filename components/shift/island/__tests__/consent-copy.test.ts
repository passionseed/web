import { lintText } from "@/lib/marketing/copyRules";
import { ISLAND_PRIZES_DRAFT } from "@/lib/content/shift-island-economy";
import { ISLAND_NOTICE } from "@/lib/shift-island/consent/notice";
import { SHIFT_NOTICE } from "@/lib/shift/parentConsent";
import { ISLAND_CONSENT_VERSION } from "@/lib/supabase/shift-quests/playerTypes";

import * as copy from "../consent/copy";

/** Sample arguments for the copy functions: a Thai nickname or a date, then an age. */
const SAMPLE_ARGS: unknown[][] = [["มิ้นต์"], [20], ["25 พ.ย."]];

/** Every user-facing string, with a path for the failure message. */
function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (typeof value === "function") {
    for (const args of SAMPLE_ARGS) {
      const result = (value as (...a: unknown[]) => unknown)(...args);
      if (typeof result === "string") out.push([`${path}(${String(args[0])})`, result]);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collect(item, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
  }
}

const copyStrings: [string, string][] = [];
for (const [name, value] of Object.entries(copy)) collect(value, name, copyStrings);

/** The notice's words; the emoji column is rendered aria-hidden and checked separately. */
const noticeStrings: [string, string][] = [["ISLAND_NOTICE.title", ISLAND_NOTICE.title]];
ISLAND_NOTICE.rows.forEach((row, i) => {
  const { emoji: _emoji, ...words } = row;
  collect(words, `ISLAND_NOTICE.rows[${i}]`, noticeStrings);
});

describe("island consent copy", () => {
  it("collects every string", () => {
    expect(copyStrings.length).toBeGreaterThan(80);
    expect(noticeStrings.length).toBeGreaterThan(30);
  });

  it.each([...copyStrings, ...noticeStrings])("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each([...copyStrings, ...noticeStrings])("%s has no em dash, emoji or markdown", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
  });

  it.each([...copyStrings, ...noticeStrings])("%s never talks down", (_path, text) => {
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน \d+ วัน/i);
  });

  it("uses the plan's lines as written", () => {
    expect(copy.CONSENT_BANNER.none).toBe("อีกขั้นเดียว: ขอความยินยอมจากผู้ปกครอง หรือยืนยันอายุเอง แล้วทีมจะขึ้นบนเกาะ แลกของในร้าน และลุ้นรางวัลได้");
    expect(copy.CONSENT.meanwhile).toBe("ระหว่างรอ เล่นและทำเควสต์ได้ตามปกติ แค่ยังไม่ขึ้นที่สาธารณะ");
    expect(copy.CONSENT.granted.basis.shift_parent).toBe("ผู้ปกครองยินยอมไว้แล้วตอนสมัคร SHIFT");
    expect(copy.CONSENT.status.waiting("25 พ.ย.")).toBe("ส่งลิงก์แล้ว รอผู้ปกครองกดยินยอม ลิงก์ใช้ได้ถึง 25 พ.ย.");
    expect(copy.ISLAND_PARENT.title("มิ้นต์")).toBe("ขอความยินยอมจากผู้ปกครองของ มิ้นต์");
  });

  it("takes the adult age as an argument, never a fixed number", () => {
    expect(copy.CONSENT.adultPath(18)).toBe("อายุ 18 ปีขึ้นไป ยืนยันอายุเองได้เลย");
    expect(copy.CONSENT.adultPath(20)).toBe("อายุ 20 ปีขึ้นไป ยืนยันอายุเองได้เลย");
    expect(copy.CONSENT.errors.tooYoung(20)).toContain("20");
  });
});

describe("ISLAND_NOTICE", () => {
  it("carries the island consent version", () => {
    expect(ISLAND_NOTICE.version).toBe(ISLAND_CONSENT_VERSION);
  });

  it("gives every row an emoji, a lead, a gist and its full wording", () => {
    for (const row of ISLAND_NOTICE.rows) {
      expect(row.emoji).toMatch(/\p{Extended_Pictographic}/u);
      expect(row.lead.length).toBeGreaterThan(0);
      expect(row.short.length).toBeGreaterThan(0);
      expect(Boolean(row.text) || Boolean(row.items?.length)).toBe(true);
    }
    expect(new Set(ISLAND_NOTICE.rows.map((row) => row.lead)).size).toBe(ISLAND_NOTICE.rows.length);
  });

  it("keeps the AI news a separate, optional item that names where the provider is", () => {
    const ai = ISLAND_NOTICE.rows.find((row) => row.lead.includes("AI"));
    expect(ai?.lead).toContain("เลือกได้");
    expect(ai?.text).toContain("นอกประเทศไทย");
    expect(ai?.text).toContain("ยินยอมแยก");
  });

  it("says what stays private until consent, and the money prize note from the content file", () => {
    expect(ISLAND_NOTICE.rows.some((row) => row.lead === "ก่อนยินยอม")).toBe(true);
    expect(JSON.stringify(ISLAND_NOTICE)).toContain(ISLAND_PRIZES_DRAFT.moneyNote);
  });

  it("names the data controller and the rights as SHIFT does", () => {
    const rights = ISLAND_NOTICE.rows.at(-1);
    const shift = SHIFT_NOTICE.rows.find((row) => row.lead === "สิทธิและช่องทางติดต่อ");
    expect(rights?.lead).toBe("สิทธิและช่องทางติดต่อ");
    expect(rights?.text).toContain("PassionSeed Company Limited");
    expect(rights?.text).toContain("นักเรียนและผู้ปกครอง");
    expect(rights?.text?.replace("นักเรียน", "ผู้สมัคร")).toBe(shift?.text);
  });
});
