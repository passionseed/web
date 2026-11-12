import {
  alignScriptToCues,
  alignScriptToCuesDetailed,
  buildVtt,
  distributeLines,
  formatVttTimestamp,
  normalizeForAlign,
  splitCaptionLine,
  toCaptionCues,
  type TimedText,
} from "../caption-align";
import { parseVtt } from "../vtt";

const SCRIPT = [
  "สายไซเบอร์ในไทย เงินเดือนเท่าไหร่กันแน่",
  "ค่าเฉลี่ยจากประกาศงานบน JobsDB อยู่ที่สามหมื่นห้าพันห้าร้อยบาท",
  "แต่นี่คือค่าเฉลี่ย ไม่ใช่เงินเดือนจบใหม่",
  "ฝึกเฉพาะในแล็บที่ได้รับอนุญาตเท่านั้น",
];

/** whisper-style cues: different chunking, small spelling slips, a filler word. */
const WHISPER: TimedText[] = [
  { start: 0.32, end: 2.1, text: "สายไซเบอร์ในไทย เงินเดือน" },
  { start: 2.1, end: 3.4, text: "เท่าไรกันแน่" },
  { start: 3.6, end: 6.9, text: "ค่าเฉลี่ยจากประกาศงานบน jobs db อยู่ที่" },
  { start: 6.9, end: 9.2, text: "สามหมื่นห้าพันห้าร้อยบาท เอ่อ" },
  { start: 9.5, end: 12.0, text: "แต่นี่คือค่าเฉลี่ยไม่ใช่เงินเดือนจบใหม่" },
  { start: 12.4, end: 15.1, text: "ฝึกเฉพาะในแลปที่ได้รับอนุญาตเท่านั้น" },
];

function expectWellFormed(lines: TimedText[], count: number) {
  expect(lines).toHaveLength(count);
  lines.forEach((line, i) => {
    expect(line.end).toBeGreaterThan(line.start);
    if (i > 0) expect(line.start).toBeGreaterThanOrEqual(lines[i - 1].end - 1e-9);
  });
}

describe("normalizeForAlign", () => {
  it("drops spaces and punctuation, lowercases and maps Thai digits", () => {
    expect(normalizeForAlign("Jobs DB, ๒๕ ปี!")).toBe("jobsdb25ปี");
  });

  it("keeps Thai vowel and tone marks", () => {
    expect(normalizeForAlign("เท่าไหร่")).toBe("เท่าไหร่");
  });
});

describe("alignScriptToCues", () => {
  it("keeps the line count and our text", () => {
    const lines = alignScriptToCues(SCRIPT, WHISPER);
    expectWellFormed(lines, SCRIPT.length);
    expect(lines.map((l) => l.text)).toEqual(SCRIPT);
  });

  it("is monotonic and takes whisper's timings", () => {
    const result = alignScriptToCuesDetailed(SCRIPT, WHISPER);
    expect(result.method).toBe("aligned");
    expect(result.similarity).toBeGreaterThan(0.8);
    const [first, second, third, fourth] = result.lines;
    expect(first.start).toBeCloseTo(0.32, 2);
    // Each boundary lands near where whisper heard the next line begin.
    expect(second.start).toBeGreaterThan(3.2);
    expect(second.start).toBeLessThan(3.9);
    expect(third.start).toBeGreaterThan(9.0);
    expect(third.start).toBeLessThan(9.8);
    expect(fourth.start).toBeGreaterThan(12.0);
    expect(fourth.start).toBeLessThan(12.7);
    expect(fourth.end).toBeCloseTo(15.1, 2);
  });

  it("falls back to proportional timing when whisper heard something else", () => {
    const junk: TimedText[] = [{ start: 1, end: 9, text: "hello world this is english" }];
    const result = alignScriptToCuesDetailed(SCRIPT, junk);
    expect(result.method).toBe("proportional");
    expectWellFormed(result.lines, SCRIPT.length);
    expect(result.lines[0].start).toBe(1);
    expect(result.lines[SCRIPT.length - 1].end).toBe(9);
  });

  it("spreads lines over the clip when there are no whisper cues", () => {
    const result = alignScriptToCuesDetailed(SCRIPT, [], { duration: 20 });
    expect(result.method).toBe("proportional");
    expectWellFormed(result.lines, SCRIPT.length);
    expect(result.lines[0].start).toBe(0);
    expect(result.lines[SCRIPT.length - 1].end).toBe(20);
  });

  it("never collapses a line to zero length, even with crowded cues", () => {
    const crowded: TimedText[] = [{ start: 0, end: 0.5, text: SCRIPT.join(" ") }];
    const lines = alignScriptToCues(SCRIPT, crowded);
    expectWellFormed(lines, SCRIPT.length);
  });

  it("returns [] for no lines", () => {
    expect(alignScriptToCues([], WHISPER)).toEqual([]);
  });

  it("ignores malformed cues", () => {
    const lines = alignScriptToCues(SCRIPT, [
      { start: 5, end: 4, text: "x" },
      { start: NaN, end: 2, text: "y" },
      ...WHISPER,
    ]);
    expectWellFormed(lines, SCRIPT.length);
  });
});

describe("distributeLines", () => {
  it("gives longer lines more time and covers the span exactly", () => {
    const lines = distributeLines(["สั้น", "ยาวกว่ามากๆ หลายคำเลย"], 2, 12);
    expect(lines[0].start).toBe(2);
    expect(lines[1].end).toBe(12);
    expect(lines[1].end - lines[1].start).toBeGreaterThan(lines[0].end - lines[0].start);
  });
});

describe("captions", () => {
  it("splits only at spaces and keeps every phrase", () => {
    const text = "ค่าเฉลี่ยจากประกาศงาน บน JobsDB อยู่ที่ สามหมื่นห้าพันห้าร้อยบาท ต่อเดือน";
    const chunks = splitCaptionLine(text, 24);
    expect(chunks.join(" ")).toBe(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("keeps a long phrase whole rather than cutting a word", () => {
    const phrase = "ความมั่นคงปลอดภัยทางไซเบอร์ระดับองค์กรขนาดใหญ่มากๆ";
    expect(splitCaptionLine(phrase, 10)).toEqual([phrase]);
  });

  it("chunks share their line's time", () => {
    const cues = toCaptionCues([{ start: 1, end: 5, text: "หนึ่ง สอง สาม สี่ ห้า หก เจ็ด แปด" }], 10);
    expect(cues.length).toBeGreaterThan(1);
    expect(cues[0].start).toBe(1);
    expect(cues[cues.length - 1].end).toBe(5);
  });

  it("formats timestamps", () => {
    expect(formatVttTimestamp(0)).toBe("00:00:00.000");
    expect(formatVttTimestamp(75.4321)).toBe("00:01:15.432");
    expect(formatVttTimestamp(3725.5)).toBe("01:02:05.500");
  });

  it("builds a VTT the player parses back", () => {
    const aligned = alignScriptToCues(SCRIPT, WHISPER);
    const vtt = buildVtt(toCaptionCues(aligned));
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    const parsed = parseVtt(vtt);
    expect(parsed.map((c) => c.text).join(" ")).toBe(SCRIPT.join(" "));
  });

  it("escapes markup characters", () => {
    const vtt = buildVtt([{ start: 0, end: 1, text: "a < b & c" }]);
    expect(vtt).toContain("a &lt; b &amp; c");
    expect(parseVtt(vtt)[0].text).toBe("a < b & c");
  });
});
