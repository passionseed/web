import { activeCue, cueTranscript, parseVtt } from "../vtt";

const SAMPLE = `WEBVTT
Kind: captions

NOTE written by the pipeline

1
00:00:00.000 --> 00:00:02.500 align:center line:80%
เงินเดือนเริ่มต้น
<v Founder>สามหมื่นห้า</v>

2
00:02.500 --> 00:05.000
แต่ห้าปีถัดไป &amp; หลังจากนั้น

00:01:05.250 --> 00:01:07.000
นาทีที่หนึ่ง
`;

describe("parseVtt", () => {
  test("parses HH:MM:SS.mmm and MM:SS.mmm timings", () => {
    const cues = parseVtt(SAMPLE);
    expect(cues.map((c) => [c.start, c.end])).toEqual([
      [0, 2.5],
      [2.5, 5],
      [65.25, 67],
    ]);
  });

  test("keeps multi-line cues as lines and strips tags and entities", () => {
    const cues = parseVtt(SAMPLE);
    expect(cues[0].text).toBe("เงินเดือนเริ่มต้น\nสามหมื่นห้า");
    expect(cues[1].text).toBe("แต่ห้าปีถัดไป & หลังจากนั้น");
  });

  test("ignores NOTE blocks and the header", () => {
    expect(parseVtt(SAMPLE)).toHaveLength(3);
  });

  test("accepts CRLF and a BOM", () => {
    const vtt = "﻿WEBVTT\r\n\r\n00:00.000 --> 00:01.000\r\nสวัสดี\r\n";
    expect(parseVtt(vtt)).toEqual([{ start: 0, end: 1, text: "สวัสดี" }]);
  });

  test("bad input returns []", () => {
    expect(parseVtt(null)).toEqual([]);
    expect(parseVtt(undefined)).toEqual([]);
    expect(parseVtt("")).toEqual([]);
    expect(parseVtt("not a vtt\n\n00:00.000 --> 00:01.000\nhi")).toEqual([]);
    expect(parseVtt("WEBVTTX\n\n00:00.000 --> 00:01.000\nhi")).toEqual([]);
    expect(parseVtt(42 as unknown as string)).toEqual([]);
  });

  test("drops cues with no text or a non-positive duration", () => {
    const vtt = `WEBVTT

00:00:02.000 --> 00:00:01.000
backwards

00:00:03.000 --> 00:00:04.000

00:00:05.000 --> 00:00:06.000
ok`;
    expect(parseVtt(vtt)).toEqual([{ start: 5, end: 6, text: "ok" }]);
  });

  test("sorts cues by start time", () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:06.000
second

00:00:01.000 --> 00:00:02.000
first`;
    expect(parseVtt(vtt).map((c) => c.text)).toEqual(["first", "second"]);
  });

  test("short millisecond fields are padded", () => {
    const vtt = "WEBVTT\n\n00:00:01.5 --> 00:00:02.25\nx";
    expect(parseVtt(vtt)[0]).toMatchObject({ start: 1.5, end: 2.25 });
  });
});

describe("activeCue", () => {
  const cues = parseVtt(SAMPLE);

  test("finds the cue at t, with the end exclusive", () => {
    expect(activeCue(cues, 0)?.text).toContain("เงินเดือนเริ่มต้น");
    expect(activeCue(cues, 2.49)?.text).toContain("เงินเดือนเริ่มต้น");
    expect(activeCue(cues, 2.5)?.text).toContain("แต่ห้าปีถัดไป");
    expect(activeCue(cues, 66)?.text).toBe("นาทีที่หนึ่ง");
  });

  test("returns null in gaps, before, after, and for bad times", () => {
    expect(activeCue(cues, 10)).toBeNull();
    expect(activeCue(cues, -1)).toBeNull();
    expect(activeCue(cues, 100)).toBeNull();
    expect(activeCue(cues, Number.NaN)).toBeNull();
    expect(activeCue([], 1)).toBeNull();
  });

  test("overlapping cues: the one that started last wins", () => {
    const overlap = [
      { start: 0, end: 10, text: "long" },
      { start: 2, end: 3, text: "short" },
    ];
    expect(activeCue(overlap, 2.5)?.text).toBe("short");
    expect(activeCue(overlap, 5)?.text).toBe("long");
  });
});

test("cueTranscript joins multi-line cues with a space", () => {
  expect(cueTranscript(parseVtt(SAMPLE))[0]).toBe("เงินเดือนเริ่มต้น สามหมื่นห้า");
});
