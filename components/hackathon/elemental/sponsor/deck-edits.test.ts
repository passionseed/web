/** @jest-environment node */
import { applyDeckEdits } from "./deck-edits";

const SRC = `/**
 * ข้อมูลโครงการ in a comment
 */
const LIST = ["ทำความเข้าใจปัญหาจริง", "ลงมือแก้ให้คนจริง"];
const TARGET = 350;
function Page() {
  return (
    <main>
      <H2>ข้อมูลโครงการ</H2>
      <Body>
        หัวข้อหลักคือ ปัญหาสิ่งแวดล้อม
        แต่ละทีมเลือกธาตุ
      </Body>
      <Row label="ผู้จัด">ค่าสมัคร {PRICE} บาทต่อคน</Row>
      <Stat big={<Fill>reach</Fill>} label="ยอด" />
      <p>ทุน <Fill>how many</Fill> ที่นั่ง</p>
      <p>ทุน <Fill>how many</Fill> ที่นั่ง</p>
      <p>{\`ชวนนักเรียน \${TARGET} คน\`}</p>
    </main>
  );
}
`;

const edit = (kind: "text" | "fill", before: string, after: string, nth = 0) => ({ kind, before, after, nth });

describe("applyDeckEdits", () => {
  it("changes JSX text, not the same words in a comment", () => {
    const { text, results } = applyDeckEdits(SRC, [edit("text", "ข้อมูลโครงการ", "ข้อมูลการแข่งขัน")]);
    expect(results[0].ok).toBe(true);
    expect(text).toContain("<H2>ข้อมูลการแข่งขัน</H2>");
    expect(text).toContain("* ข้อมูลโครงการ in a comment");
  });

  it("matches JSX text that wraps over lines", () => {
    const { text, results } = applyDeckEdits(SRC, [edit("text", "หัวข้อหลักคือ ปัญหาสิ่งแวดล้อม แต่ละทีมเลือกธาตุ", "ข้อความใหม่")]);
    expect(results[0].ok).toBe(true);
    expect(text).toContain("<Body>\n        ข้อความใหม่\n      </Body>");
  });

  it("changes string literals and escapes quotes", () => {
    const { text } = applyDeckEdits(SRC, [edit("text", "ลงมือแก้ให้คนจริง", 'แก้ "จริง"'), edit("text", "ผู้จัด", "ผู้จัดงาน")]);
    expect(text).toContain('"แก้ \\"จริง\\""');
    expect(text).toContain('label="ผู้จัดงาน"');
  });

  it("changes text next to an expression", () => {
    const { text, results } = applyDeckEdits(SRC, [edit("text", "บาทต่อคน", "บาท/คน")]);
    expect(results[0].ok).toBe(true);
    expect(text).toContain("{PRICE} บาท/คน</Row>");
  });

  it("refuses text built from code", () => {
    const { text, results } = applyDeckEdits(SRC, [edit("text", "ชวนนักเรียน 350 คน", "x"), edit("text", "350", "400")]);
    expect(results.map((r) => r.ok)).toEqual([false, false]);
    expect(text).toBe(SRC);
  });

  it("refuses braces in JSX text", () => {
    const { results } = applyDeckEdits(SRC, [edit("text", "ข้อมูลโครงการ", "a {b}")]);
    expect(results[0].ok).toBe(false);
  });

  it("fills a marker in a prop with a string, and in JSX with text", () => {
    const { text } = applyDeckEdits(SRC, [edit("fill", "reach", "12,000"), edit("fill", "how many", "10", 1)]);
    expect(text).toContain('big={"12,000"}');
    expect(text).toContain("ทุน <Fill>how many</Fill> ที่นั่ง</p>\n      <p>ทุน 10 ที่นั่ง</p>");
  });

  it("skips unchanged edits and refuses empty ones", () => {
    const { text, results } = applyDeckEdits(SRC, [edit("text", "ผู้จัด", "ผู้จัด"), edit("text", "ผู้จัด", "  ")]);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(text).toBe(SRC);
  });
});
