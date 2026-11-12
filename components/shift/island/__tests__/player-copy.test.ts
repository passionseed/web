import { lintText } from "@/lib/marketing/copyRules";

import * as copy from "../player/copy";

/** Sample arguments for the copy functions: a Thai name with a project and a stage, a number, a formatted amount. */
const SAMPLE_ARGS: unknown[][] = [["มิ้นต์", "แอปจองห้องสมุด", 3], [5], ["2,000"]];

/** Every user-facing string in player/copy.ts, with a path for the failure message. */
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

const strings: [string, string][] = [];
for (const [name, value] of Object.entries(copy)) {
  // A number formatter, exercised below.
  if (name === "coinNumber") continue;
  collect(value, name, strings);
}

describe("player copy", () => {
  it("collects every string", () => {
    expect(strings.length).toBeGreaterThan(80);
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

  it.each(strings)("%s never ranks or compares students", (_path, text) => {
    expect(text).not.toMatch(/อันดับ|ที่ \d+ของ|เก่งกว่า|ดีกว่า|มากกว่าเพื่อน|percentile|rank/i);
  });

  it("says coins come from approved work and community value, never hours", () => {
    expect(copy.WALLET.notHours).toBe("coin มาจากงานที่ผ่านการตรวจและการช่วยชุมชน ไม่ได้นับจากเวลาที่ใช้");
    expect(copy.WALLET.off).toBe("ซีซันนี้ยังไม่เปิดแจก coin");
  });

  it("counts days shown up as a number that only goes up, as the island's rule says", () => {
    expect(copy.CHARACTER.days(12)).toBe("ลงมือมาแล้วทั้งหมด 12 วัน");
    expect(copy.CHARACTER.daysKept).toBe("วันที่ไม่ได้มาไม่ทำให้ตัวเลขนี้ลดลงหรือเริ่มนับใหม่");
    // No run that resets: the sheet has no wording for one.
    expect(copy.CHARACTER).not.toHaveProperty("run");
    expect(JSON.stringify(copy.CHARACTER)).not.toMatch(/จังหวะตอนนี้|เว้นได้/);
  });

  it("names the chip after the student, the project and the tree as the level", () => {
    expect(copy.PLAYER.chip("มิ้นต์", "แอปจองห้องสมุด", 3)).toBe("มิ้นต์, แอปจองห้องสมุด, ต้นไม้ขั้น 3 จาก 7, ดูตัวละคร");
    expect(copy.CHARACTER.level(3)).toBe("ต้นไม้ขั้น 3 จาก 7");
  });

  it("uses the plan's shop lines", () => {
    expect(copy.SHOP.lockStage(5)).toBe("ต้องถึงต้นไม้ขั้น 5");
    expect(copy.SHOP.lockCommunity).toBe("ต้องผ่านเควสต์ชุมชนอย่างน้อย 1 เควสต์");
    expect(copy.SHOP.lockConsent).toBe("รอผู้ปกครองยินยอมก่อน");
    expect(copy.SHOP.short("700")).toBe("coin ยังขาดอีก 700");
    expect(copy.SHOP.confirm("มัทฉะ", "8,000")).toBe("แลก มัทฉะ ใช้ 8,000 coin ทีมงานจะแจ้งขั้นตอนรับของในกล่องข้อความของบอทใน Discord");
  });

  it("has a word for every redemption status", () => {
    expect(Object.keys(copy.SHOP.status).sort()).toEqual(["cancelled", "completed", "processing", "reserved"]);
  });

  it("groups coin amounts as Thai readers do and tolerates bad input", () => {
    expect(copy.coinNumber(12000)).toBe("12,000");
    expect(copy.coinNumber(300)).toBe("300");
    expect(copy.coinNumber(2.9)).toBe("2");
    expect(copy.coinNumber(Number.NaN)).toBe("0");
  });
});
