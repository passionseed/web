import { containsNumber, countThaiChars, findDashes, hasDashes, sanitizeDashes } from "../thai-copy";

describe("findDashes", () => {
  it("finds em and en dashes with context", () => {
    const hits = findDashes("เงินดี \u2014 แต่ 25,000\u201335,000");
    expect(hits.map((h) => h.char)).toEqual(["\u2014", "\u2013"]);
    expect(hits[0].context).toContain("เงินดี");
  });

  it("ignores hyphens and empty input", () => {
    expect(findDashes("25k-35k บาท/เดือน")).toEqual([]);
    expect(findDashes(null)).toEqual([]);
    expect(hasDashes("a\u2015b")).toBe(true);
  });
});

describe("sanitizeDashes", () => {
  it("turns a numeric range dash into a hyphen", () => {
    expect(sanitizeDashes("25,000\u201335,000 บาท")).toBe("25,000-35,000 บาท");
    expect(sanitizeDashes("2025 \u2014 2035")).toBe("2025-2035");
  });

  it("keeps a hyphen in a range with units", () => {
    expect(sanitizeDashes("$25k\u201370k+ ต่อปี")).toBe("$25k-70k+ ต่อปี");
    expect(sanitizeDashes("10%\u2013฿20")).toBe("10%-฿20");
  });

  it("turns a clause dash into a comma and drops edge dashes", () => {
    expect(sanitizeDashes("ปกป้องโลกดิจิทัล \u2014 จากภัยคุกคาม")).toBe("ปกป้องโลกดิจิทัล, จากภัยคุกคาม");
    expect(sanitizeDashes("\u2014 เริ่มที่นี่ \u2014")).toBe("เริ่มที่นี่");
    expect(sanitizeDashes("หมายเหตุ: \u2014 ข้อมูล")).toBe("หมายเหตุ: ข้อมูล");
  });

  it("leaves clean copy alone", () => {
    expect(sanitizeDashes("ไม่มีขีด")).toBe("ไม่มีขีด");
  });
});

describe("containsNumber", () => {
  it.each([
    "เริ่มราว 25,000 บาท",
    "อายุ ๒๕ ปี",
    "เดือนละสามหมื่น",
    "ครึ่งล้าน",
    "50 เปอร์เซ็นต์",
    "โตขึ้น 2 เท่า",
    "เพิ่มขึ้นสองเท่า",
    "ราวสิบปี",
    "หลายร้อยตำแหน่ง",
    "AI กระทบ 30%",
  ])("detects a number in %s", (text) => {
    expect(containsNumber(text)).toBe(true);
  });

  it.each([
    "จบใหม่สายไซเบอร์ เริ่มเดือนละเท่าไหร่",
    "งานเสร็จเรียบร้อย",
    "สายพันธุ์ใหม่ของงาน",
    "ความสัมพันธ์กับลูกค้า",
    "ทุกคนเท่าเทียมกัน",
    "แค่นั้นเท่านั้น",
    "ทำงานเป็นทีม",
    "",
  ])("finds no number in %s", (text) => {
    expect(containsNumber(text)).toBe(false);
  });

  it("still catches a number next to a false-positive word", () => {
    expect(containsNumber("เรียบร้อย แล้วได้สามหมื่น")).toBe(true);
  });
});

describe("countThaiChars", () => {
  it("counts only Thai script", () => {
    expect(countThaiChars("AI ไทย")).toBe(3);
  });
});
