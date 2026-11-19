/**
 * @jest-environment node
 */
import { STORY_SCRIPTS } from "@/lib/radar-stories";
import { beatMs, defaultBeatMs, FRAME_MS, hookMs, STORY_FPS, toFrames } from "@/lib/radar-stories/timing";
import type { StoryScript } from "@/lib/radar-stories/types";

import { storyEndCard, storyTiktokUrl, splitKeyword } from "../story/endCard";
import { buildStoryTimeline, FLOORLESS_SCENES, phaseAt, segmentAt, typedAt, wipeAt, STORY_REEL_TIMING } from "../story/storyTimeline";

const lost = STORY_SCRIPTS.find((s) => s.series === "lost")!;
const round1 = STORY_SCRIPTS.find((s) => s.series === "round1")!;

describe("beat lengths", () => {
  it("reads about 14 characters a second plus 600 ms, clamped to 1.6 to 4 s", () => {
    expect(defaultBeatMs("ก".repeat(14))).toBeCloseTo(1600);
    expect(defaultBeatMs("ก".repeat(28))).toBeCloseTo(2600);
    expect(defaultBeatMs("สั้น")).toBe(1600);
    expect(defaultBeatMs("ก".repeat(60))).toBe(4000);
    // Thai marks ride on their letter: "ที่" is one character.
    expect(defaultBeatMs("ที่".repeat(28))).toBeCloseTo(defaultBeatMs("ก".repeat(28)));
  });

  it("honours an explicit ms, and keeps the hook within 1.5 to 2.5 s", () => {
    expect(beatMs({ lineTh: "สั้น", ms: 3200 })).toBe(3200);
    expect(hookMs("ก")).toBe(1500);
    expect(hookMs("ก".repeat(28))).toBe(2500);
  });
});

describe.each([lost, round1])("timeline for $id", (script: StoryScript) => {
  const t = buildStoryTimeline(script);

  it("is deterministic", () => {
    expect(buildStoryTimeline(script)).toEqual(t);
    expect(JSON.stringify(buildStoryTimeline(structuredClone(script)))).toBe(JSON.stringify(t));
  });

  it("sums: hook, beats and end card back to back, whole frames, total = sum", () => {
    expect(t.hook.startF).toBe(0);
    expect(t.beats[0].startF).toBe(t.hook.endF);
    t.beats.forEach((b, i) => {
      expect(Number.isInteger(b.startF) && Number.isInteger(b.endF)).toBe(true);
      expect(b.endF - b.startF).toBe(toFrames(beatMs(script.beats[i])));
      if (i > 0) expect(b.startF).toBe(t.beats[i - 1].endF);
    });
    expect(t.end.startF).toBe(t.beats[t.beats.length - 1].endF);
    expect(t.end.endF).toBe(t.totalF);
    const sum = t.hook.endF + t.beats.reduce((a, b) => a + b.endF - b.startF, 0) + (t.end.endF - t.end.startF);
    expect(sum).toBe(t.totalF);
    expect(t.seconds).toBeCloseTo(t.totalF / STORY_FPS, 3);
    expect(t.seconds).toBeGreaterThanOrEqual(20);
    expect(t.seconds).toBeLessThanOrEqual(40);
  });

  it("groups beats into scene segments and wipes only on a change of scene", () => {
    const changes = script.beats.map((b, i) => i > 0 && b.scene !== script.beats[i - 1].scene).filter(Boolean).length;
    expect(t.segments).toHaveLength(changes + 1);
    expect(t.wipes).toHaveLength(changes + 1); // plus the cut to the end card
    expect(t.wipes[t.wipes.length - 1]).toBe(t.end.startF);
    t.segments.forEach((s) => s.beats.forEach((i) => expect(script.beats[i].scene).toBe(s.scene)));
    expect(wipeAt(t, t.wipes[0])).not.toBeNull();
    expect(wipeAt(t, t.wipes[0] - STORY_REEL_TIMING.wipeFrames)).toBeNull();
  });

  it("puts every speaker on stage (nobody on a floorless scene), and P'Seed enters on its first line", () => {
    for (const s of t.segments) {
      const cast = new Set(s.cast.map((c) => c.who));
      if (FLOORLESS_SCENES.includes(s.scene)) {
        expect(cast.size).toBe(0);
        continue;
      }
      for (const i of s.beats) if (script.beats[i].who !== "text") expect(cast).toContain(script.beats[i].who);
      const host = s.cast.find((c) => c.who === "host");
      if (host) {
        const first = s.beats.find((i) => script.beats[i].who === "host")!;
        expect(host.enterF).toBe(first === s.beats[0] ? s.startF : t.beats[first].startF);
      }
      s.cast.filter((c) => c.who !== "host").forEach((c) => expect(c.enterF).toBe(s.startF));
    }
  });

  it("types normal lines within 45% of the beat and slams big lines whole", () => {
    for (const b of t.beats) {
      if (b.beat.big) {
        expect(b.typeF).toBe(0);
        expect(typedAt(b, b.startF, 10)).toBe(10);
      } else {
        expect(b.typeF).toBeGreaterThan(0);
        expect(b.typeF).toBeLessThanOrEqual(Math.floor((b.endF - b.startF) * 0.45));
        expect(typedAt(b, b.startF + b.typeF - 1, 20)).toBe(20);
        expect(typedAt(b, b.startF, 20)).toBeLessThan(20);
      }
    }
  });

  it("finds the phase and segment for any frame", () => {
    expect(phaseAt(t, 0).kind).toBe("hook");
    expect(phaseAt(t, t.end.startF).kind).toBe("end");
    const mid = t.beats[2];
    const p = phaseAt(t, mid.startF + 1);
    expect(p.kind === "beat" && p.cue.index).toBe(2);
    expect(segmentAt(t, mid.startF).index).toBe(mid.segment);
  });

  it("gives the soundtrack a sorted cue sheet that ends on the end card", () => {
    const { cues } = t;
    expect(cues.seconds).toBe(t.seconds);
    expect(cues.cuts[cues.cuts.length - 1]).toBeCloseTo(t.end.startF / STORY_FPS, 3);
    for (const xs of [cues.cuts, cues.slams, cues.pops]) {
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
      xs.forEach((x) => expect(x >= 0 && x < t.seconds).toBe(true));
    }
    expect(cues.coin).toBeGreaterThan(cues.cuts[cues.cuts.length - 1]);
    const moods = cues.moods!;
    expect(moods[0]).toEqual([0, "build"]);
    expect(moods[moods.length - 1][1]).toBe("offer");
    moods.slice(1).forEach((m, i) => expect(m[0]).toBeGreaterThan(moods[i][0]));
  });
});

describe("cast continuity", () => {
  const beat = (who: StoryScript["beats"][number]["who"], scene: StoryScript["beats"][number]["scene"]) => ({ who, scene, lineTh: "ลองดูก่อน" });
  const castOf = (beats: StoryScript["beats"]) => buildStoryTimeline({ hookTh: "ทดสอบ", beats }).segments.map((s) => s.cast.map((c) => c.who));

  it("keeps someone who stood in a scene on stage when the story comes back to it", () => {
    // round1-02: the student asks in the bedroom, scrolls the feed, and is still there when P'Seed answers.
    expect(castOf([beat("student", "bedroom-night"), beat("student", "phone-feed"), beat("host", "bedroom-night"), beat("text", "bedroom-night")])).toEqual([
      ["student"],
      [],
      ["student", "host"],
    ]);
  });

  it("keeps the one P'Seed is answering, across a change of scene", () => {
    expect(castOf([beat("parent", "dinner-table"), beat("student", "dinner-table"), beat("host", "classroom"), beat("host", "radar")])).toEqual([
      ["student", "parent"],
      ["student", "host"],
      ["student", "host"],
    ]);
  });

  it("does not drag people into a scene someone else opens", () => {
    expect(castOf([beat("parent", "dinner-table"), beat("student", "classroom"), beat("friend", "school-gate")])).toEqual([["parent"], ["student"], ["friend"]]);
  });

  it("draws nobody on the phone feed, where there is no floor", () => {
    expect(castOf([beat("student", "phone-feed"), beat("host", "phone-feed")])).toEqual([[]]);
  });
});

describe("hook variants", () => {
  it("only change the hook's length", () => {
    const main = buildStoryTimeline(lost);
    const v = buildStoryTimeline(lost, lost.hookVariantsTh[1]);
    expect(v.hookTh).toBe(lost.hookVariantsTh[1]);
    const shift = v.hook.endF - main.hook.endF;
    expect(v.totalF - main.totalF).toBe(shift);
    expect(v.beats.map((b) => b.endF - b.startF)).toEqual(main.beats.map((b) => b.endF - b.startF));
  });
});

describe("frame timing", () => {
  it("uses 30 fps frames", () => {
    expect(FRAME_MS).toBeCloseTo(33.333, 2);
  });
});

describe("end card", () => {
  it("shows the comment keyword on Instagram and the typeable link on TikTok", () => {
    expect(storyEndCard(lost, "ig")).toMatchObject({ kind: "comment", keyword: "RADAR", lineTh: lost.endCardTh });
    expect(storyEndCard(lost, "tt")).toMatchObject({ kind: "link", url: "passionseed.org/radar" });
  });

  it("takes the TikTok link from the caption, else the career alias, else the hub", () => {
    expect(storyTiktokUrl({ captionTtTh: "ข้อมูลเต็ม พิมพ์ passionseed.org/r/cyber-scam", series: "career", slug: "cybersecurity" })).toBe("passionseed.org/r/cyber-scam");
    expect(storyTiktokUrl({ captionTtTh: "ไม่มีลิงก์", series: "career", slug: "cybersecurity" })).toBe("passionseed.org/r/cyber");
    expect(storyTiktokUrl({ captionTtTh: "ไม่มีลิงก์", series: "lost" })).toBe("passionseed.org/radar");
  });

  it("splits the CTA around the keyword", () => {
    expect(splitKeyword("คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้")).toEqual([
      { text: "คอมเมนต์ ", keyword: false },
      { text: "RADAR", keyword: true },
      { text: " เดี๋ยวส่งลิงก์ให้", keyword: false },
    ]);
  });
});
