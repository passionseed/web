/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";

import { STORY_SCRIPTS } from "..";
import {
  beatDurationWithVoiceMs,
  beatNeedsVoice,
  buildStoryVoicePlan,
  classifyLineTakes,
  defaultBeatNeedsVoice,
  encodeVoiceDurationsParam,
  isTakeStale,
  lineHash,
  makeLineKey,
  parseVoiceDurationsParam,
  summarizeStoryVoice,
  VOICE_BEAT_TAIL_MS,
  type VoiceTakeRef,
} from "../voice";

describe("voice plan and lineKey", () => {
  const sample = STORY_SCRIPTS.find((s) => s.id === "lost-00-midnight")!;

  it("voices every P'Seed (host) line by default and skips other roles", () => {
    expect(defaultBeatNeedsVoice({ who: "host", lineTh: "สวัสดี" })).toBe(true);
    expect(defaultBeatNeedsVoice({ who: "student", lineTh: "สวัสดี" })).toBe(false);
    expect(defaultBeatNeedsVoice({ who: "friend", lineTh: "สวัสดี" })).toBe(false);
    expect(defaultBeatNeedsVoice({ who: "parent", lineTh: "สวัสดี" })).toBe(false);
    expect(defaultBeatNeedsVoice({ who: "text", lineTh: "สวัสดี", big: true })).toBe(false);

    const plan = buildStoryVoicePlan(sample);
    const expectedHostIndices = sample.beats
      .map((b, i) => (b.who === "host" ? i : -1))
      .filter((i) => i >= 0);
    expect(plan.map((l) => l.beatIndex)).toEqual(expectedHostIndices);
    expect(plan.every((l) => l.who === "host" && l.totalLines === expectedHostIndices.length)).toBe(true);
  });

  it("supports per-script includeBeats, excludeBeats, and custom rule overrides", () => {
    expect(
      beatNeedsVoice(sample, 0, {
        [sample.id]: { includeBeats: [0] },
      }),
    ).toBe(true);

    const firstHost = sample.beats.findIndex((b) => b.who === "host");
    expect(
      beatNeedsVoice(sample, firstHost, {
        [sample.id]: { excludeBeats: [firstHost] },
      }),
    ).toBe(false);

    const custom = buildStoryVoicePlan(sample, {
      [sample.id]: { rule: (b) => b.who === "student" },
    });
    expect(custom.every((l) => l.who === "student")).toBe(true);
    expect(custom.length).toBeGreaterThan(0);
  });

  it("hashes lineTh identically to Node SHA-256 (including Thai UTF-8) and changes when text edits", () => {
    const lines = [
      "ไม่รู้ว่าชอบอะไร ไม่ได้แปลว่า เธอช้านะ",
      "TCASfolio ให้ทำแฟ้ม ได้สูงสุด 40 รายการ",
      "hello world 123",
    ];
    for (const line of lines) {
      const expected = createHash("sha256").update(line.trim(), "utf8").digest("hex").slice(0, 8);
      expect(lineHash(line)).toBe(expected);
      expect(lineHash(`  ${line}  `)).toBe(expected);
    }

    const before = lineHash("ลองทำงานจริง ดูสักชิ้นก่อน");
    const after = lineHash("ลองทำงานจริง ดูสักชิ้นก่อนนะ");
    expect(before).not.toBe(after);
    expect(makeLineKey("lost-00-midnight", 5, before)).toBe(`lost-00-midnight:5:${before}`);
  });

  it("includes surrounding beat context and speakingTo direction for every voiced line", () => {
    const plan = buildStoryVoicePlan(sample);
    for (const line of plan) {
      expect(line.targetMs).toBeGreaterThanOrEqual(1600);
      expect(line.speakingTo).toBe("student");
      expect(line.prevBeat?.beatIndex).toBe(line.beatIndex - 1);
    }
  });

  it("builds non-empty voice plans across all registered story scripts", () => {
    expect(STORY_SCRIPTS.length).toBeGreaterThanOrEqual(13);
    for (const script of STORY_SCRIPTS) {
      const plan = buildStoryVoicePlan(script);
      expect(plan.length).toBeGreaterThan(0);
    }
  });
});

describe("staleness and story voice summary", () => {
  const sample = STORY_SCRIPTS.find((s) => s.id === "lost-00-midnight")!;
  const plan = buildStoryVoicePlan(sample);

  it("classifies picked, recorded, stale, and missing lines accurately", () => {
    const [line0, line1, line2] = plan;
    const takes: VoiceTakeRef[] = [
      // line0: picked current take + one older stale take
      { id: "t1", story_id: sample.id, beat_index: line0.beatIndex, line_hash: line0.lineHash, picked: true },
      { id: "t2", story_id: sample.id, beat_index: line0.beatIndex, line_hash: "00000000", picked: false },
      // line1: current take exists, not picked yet
      { id: "t3", story_id: sample.id, beat_index: line1.beatIndex, line_hash: line1.lineHash, picked: false },
      // line2: only an old stale take exists (script text changed)
      { id: "t4", story_id: sample.id, beat_index: line2.beatIndex, line_hash: "deadbeef", picked: true },
    ];

    expect(isTakeStale(takes[0], line0)).toBe(false);
    expect(isTakeStale(takes[1], line0)).toBe(true);

    expect(classifyLineTakes(line0, takes).status).toBe("picked");
    expect(classifyLineTakes(line1, takes).status).toBe("recorded");
    expect(classifyLineTakes(line2, takes).status).toBe("stale");

    const summary = summarizeStoryVoice(sample, takes);
    expect(summary.totalLines).toBe(3);
    expect(summary.pickedCount).toBe(1);
    expect(summary.recordedCount).toBe(2);
    expect(summary.unpickedCount).toBe(1);
    expect(summary.staleCount).toBe(1);
    expect(summary.missingCount).toBe(0);
    expect(summary.nextLineIndex).toBe(1);
  });

  it("marks lines with no takes as missing", () => {
    const summary = summarizeStoryVoice(sample, []);
    expect(summary.missingCount).toBe(plan.length);
    expect(summary.pickedCount).toBe(0);
    expect(summary.recordedCount).toBe(0);
    expect(summary.staleCount).toBe(0);
    expect(summary.nextLineIndex).toBe(0);
  });
});

describe("beat duration extension and URL param serialization", () => {
  it("extends a beat to at least voice duration + 400 ms and never shrinks it", () => {
    expect(VOICE_BEAT_TAIL_MS).toBe(400);
    expect(beatDurationWithVoiceMs(3000, undefined)).toBe(3000);
    expect(beatDurationWithVoiceMs(3000, 0)).toBe(3000);
    // Shorter voice keeps base length
    expect(beatDurationWithVoiceMs(3000, 2100)).toBe(3000);
    // Longer voice extends to voice + 400 ms
    expect(beatDurationWithVoiceMs(3000, 3200)).toBe(3600);
    expect(beatDurationWithVoiceMs(2500, 4850)).toBe(5250);
  });

  it("round-trips voice duration query params and rejects malformed entries", () => {
    const encoded = encodeVoiceDurationsParam({ 6: 3150.4, 3: 4820 });
    expect(encoded).toBe("3:4820,6:3150");
    expect(parseVoiceDurationsParam(encoded)).toEqual({ 3: 4820, 6: 3150 });
    expect(parseVoiceDurationsParam("")).toBeUndefined();
    expect(parseVoiceDurationsParam("bad:data,-1:500,4:0")).toBeUndefined();
    expect(parseVoiceDurationsParam("bad,2:2500,999:100")).toEqual({ 2: 2500 });
  });
});
