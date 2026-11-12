import { GUIDE_HOST } from "@/lib/radar-guide/story";
import {
  cutsceneStart,
  cutsceneStep,
  DIALOGUE_START,
  dialogueTap,
  graphemes,
  HOST_CHEER_SRC,
  hostFrame,
  hostSpriteSrc,
  levelMapPoints,
  profileFileName,
  routePath,
  shareRoute,
  profileShareRoute,
  profileSaveRoute,
  speakerName,
  toBoxes,
  typedCount,
  xpSegments,
  type CutscenePhase,
} from "../story-logic";

describe("graphemes", () => {
  it("never leaves a Thai vowel or tone mark on its own", () => {
    const parts = graphemes("ที่นี่");
    expect(parts.join("")).toBe("ที่นี่");
    for (const p of parts) expect(p).not.toMatch(/^[ัิ-ฺ็-๎]/);
    expect(parts.length).toBeLessThan("ที่นี่".length);
  });

  it("keeps Latin text one character per step", () => {
    expect(graphemes("AI 27")).toEqual(["A", "I", " ", "2", "7"]);
  });

  it("falls back without Intl.Segmenter", () => {
    const Seg = (Intl as unknown as { Segmenter?: unknown }).Segmenter;
    (Intl as unknown as { Segmenter?: unknown }).Segmenter = undefined;
    try {
      const parts = graphemes("กี่");
      expect(parts).toEqual(["กี่"]);
    } finally {
      (Intl as unknown as { Segmenter?: unknown }).Segmenter = Seg;
    }
  });
});

describe("typedCount", () => {
  it("starts at nothing, then types one character per tick, capped", () => {
    expect(typedCount(10, 0)).toBe(0);
    expect(typedCount(10, 1)).toBe(1);
    expect(typedCount(10, 28 * 3)).toBe(4);
    expect(typedCount(10, 999_999)).toBe(10);
  });
});

describe("dialogueTap", () => {
  it("finishes typing, then advances, then closes", () => {
    let c = DIALOGUE_START;
    c = dialogueTap(c, 2);
    expect(c).toEqual({ index: 0, complete: true, done: false });
    c = dialogueTap(c, 2);
    expect(c).toEqual({ index: 1, complete: false, done: false });
    c = dialogueTap(c, 2);
    expect(c.complete).toBe(true);
    c = dialogueTap(c, 2);
    expect(c.done).toBe(true);
    expect(dialogueTap(c, 2)).toEqual(c);
  });

  it("opens each box complete under reduced motion", () => {
    const c = dialogueTap({ index: 0, complete: true, done: false }, 3, true);
    expect(c).toEqual({ index: 1, complete: true, done: false });
  });

  it("closes straight away with no boxes", () => {
    expect(dialogueTap(DIALOGUE_START, 0).done).toBe(true);
  });
});

describe("toBoxes", () => {
  it("splits long lines at spaces into about two-line boxes", () => {
    const long = Array.from({ length: 30 }, (_, i) => `คำ${i}`).join(" ");
    const boxes = toBoxes(["สั้น", long]);
    expect(boxes[0]).toBe("สั้น");
    expect(boxes.length).toBeGreaterThan(2);
    for (const b of boxes) expect(b.length).toBeLessThanOrEqual(72);
    expect(boxes.slice(1).join(" ")).toBe(long);
  });
});

describe("host sprite", () => {
  it("flaps between idle and talk, cheers on wow", () => {
    expect(hostFrame("idle", false)).toBe("idle");
    expect(hostFrame("talk", true)).toBe("talk");
    expect(hostFrame("serious", true)).toBe("talk");
    expect(hostFrame("wow", false)).toBe("cheer");
  });

  it("maps frames to GUIDE_HOST sprites with fallbacks", () => {
    expect(hostSpriteSrc("idle")).toBe(GUIDE_HOST.sprites.idle);
    expect(hostSpriteSrc("talk")).toBe(GUIDE_HOST.sprites.talk ?? GUIDE_HOST.sprites.idle);
    expect(hostSpriteSrc("cheer")).toBe(GUIDE_HOST.sprites.wow ?? HOST_CHEER_SRC);
  });

  it("names the speakers", () => {
    expect(speakerName("host")).toBe(GUIDE_HOST.nameTh);
    expect(speakerName("player")).toBe("เธอ");
    expect(speakerName("system")).toBeNull();
  });
});

describe("cutscene states", () => {
  const run = (start: CutscenePhase, events: Parameters<typeof cutsceneStep>[1][]) =>
    events.reduce<CutscenePhase>((p, e) => cutsceneStep(p, e), start);

  it("starts on the poster with media, on the NPC fallback without", () => {
    expect(cutsceneStart(true)).toBe("poster");
    expect(cutsceneStart(false)).toBe("fallback");
  });

  it("plays to the end", () => {
    expect(run("poster", [{ type: "tapPlay" }, { type: "playing" }, { type: "ended" }])).toBe("done");
  });

  it("pauses and resumes on taps", () => {
    expect(run("poster", [{ type: "tapPlay" }, { type: "playing" }, { type: "pause" }])).toBe("paused");
    expect(run("paused", [{ type: "tapPlay" }, { type: "playing" }])).toBe("playing");
  });

  it("goes back to the poster when the browser blocks play()", () => {
    expect(run("poster", [{ type: "tapPlay" }, { type: "blocked" }])).toBe("poster");
  });

  it("falls back to the host dialogue when the video fails", () => {
    expect(run("poster", [{ type: "tapPlay" }, { type: "error" }])).toBe("fallback");
    expect(run("playing", [{ type: "error" }, { type: "fallbackDone" }])).toBe("done");
  });

  it("is final once done", () => {
    expect(run("done", [{ type: "tapPlay" }, { type: "error" }])).toBe("done");
  });
});

describe("level map layout", () => {
  it("places every level top to bottom inside the board", () => {
    const pts = levelMapPoints(11);
    expect(pts).toHaveLength(11);
    for (let i = 1; i < pts.length; i++) expect(pts[i].y).toBeGreaterThan(pts[i - 1].y);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(10);
      expect(p.x).toBeLessThanOrEqual(90);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
    expect(levelMapPoints(1)).toEqual([{ x: 22, y: 50 }]);
    expect(routePath(pts.slice(0, 2))).toBe("22,6 50,14.8");
  });
});

describe("xpSegments", () => {
  it("fills proportionally, shows any XP, never overflows", () => {
    expect(xpSegments(0, 100)).toBe(0);
    expect(xpSegments(1, 1000)).toBe(1);
    expect(xpSegments(50, 100, 12)).toBe(6);
    expect(xpSegments(500, 100, 12)).toBe(12);
    expect(xpSegments(10, 0)).toBe(0);
  });
});

describe("shareRoute", () => {
  const file = { name: "x.png" } as unknown as File;
  it("shares the image file when the phone accepts files", () => {
    expect(shareRoute({ share: jest.fn(), canShare: () => true }, file)).toBe("files");
  });
  it("shares the link when files are not accepted", () => {
    expect(shareRoute({ share: jest.fn(), canShare: () => false }, file)).toBe("url");
    expect(shareRoute({ share: jest.fn() }, file)).toBe("url");
    expect(
      shareRoute(
        {
          share: jest.fn(),
          canShare: () => {
            throw new Error("nope");
          },
        },
        file
      )
    ).toBe("url");
  });
  it("downloads without Web Share", () => {
    expect(shareRoute({}, file)).toBe("download");
    expect(shareRoute(undefined, null)).toBe("download");
  });
  it("never uses the native sheet or a download inside Instagram or Facebook", () => {
    const nav = { share: jest.fn(), canShare: () => true };
    expect(profileShareRoute({ nav, file, uaApp: "instagram" })).toBe("overlay");
    expect(profileShareRoute({ nav, file, uaApp: "facebook" })).toBe("overlay");
  });
  it("shares the link while the PNG is not ready, the file once it is", () => {
    const nav = { share: jest.fn(), canShare: () => true };
    expect(profileShareRoute({ nav, file: null, uaApp: null })).toBe("url");
    expect(profileShareRoute({ nav, file, uaApp: "tiktok" })).toBe("files");
  });
  it("uses the overlay instead of a download in other in-app browsers", () => {
    expect(profileShareRoute({ nav: {}, file, uaApp: "line" })).toBe("overlay");
    expect(profileShareRoute({ nav: {}, file, uaApp: null })).toBe("download");
    expect(profileSaveRoute("instagram")).toBe("overlay");
    expect(profileSaveRoute(null)).toBe("download");
  });
  it("names the PNG", () => {
    expect(profileFileName("cybersecurity")).toBe("passionseed-cybersecurity-profile.png");
  });
});
