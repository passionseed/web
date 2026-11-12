/**
 * Pure pieces of the radar-guide media pipeline: ffmpeg arguments, clips.json
 * and captions (radar:clip), the cut list, start options, art, CLI args, and
 * the demo reels the real guides would film.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildVtt } from "@/lib/radar-guide/caption-align";
import { clipScriptHash, lintGuide } from "@/lib/radar-guide/guide-lint";
import type { CareerGuide, ClipSlot, GuidePage } from "@/lib/radar-guide/guide-types";
import { RADAR_GUIDE_POSTER_URL_PATTERN, RADAR_GUIDE_VIDEO_URL_PATTERN } from "@/lib/radar-guide/types";
import { parseVtt } from "@/lib/radar-guide/vtt";

import { buildDemoReelPlan, demoReelProblems } from "@/components/radar/reel/demoReel";
import { cybersecurityGuide } from "@/lib/radar-guides/cybersecurity/guide";

import { agyArgs, buildArtPrompt, emptyArtIndex, mentionsPeople, parseSavedPath, recordArt } from "../lib/art";
import { CliError, parseArgs } from "../lib/cli";
import { buildClipMedia, requireClipPage, serializeManifest, upsertManifest, writeClipFiles } from "../lib/clip-manifest";
import { buildCutList, spokenLines } from "../lib/cuts";
import type { DumpSkill } from "../lib/dump";
import {
  cdnUrl,
  guideMediaKey,
  isHdr,
  masterArgs,
  parseProbe,
  posterArgs,
  sha8,
  TONEMAP_FILTER,
  webClipArgs,
} from "../lib/media";
import { checkFirstStartOption, parseDurationMinutes } from "../lib/start-options";

const SKILL: DumpSkill = {
  id: "s1",
  slug: "security-basics",
  name_th: "พื้นฐานความปลอดภัย",
  name_en: "Security basics",
  description_th: null,
  is_primary: true,
  sort_order: 0,
  start_options: [
    {
      id: "o1",
      kind: "resource",
      title_th: "ห้องฝึกแรกใน TryHackMe",
      summary_th: "ทำห้องแรกให้จบ แล้วเขียน write-up สั้นๆ",
      provider: "TryHackMe",
      destination_url: "https://tryhackme.com",
      sort_order: 0,
      metadata: { cost: "ฟรี", duration: "45 นาที" },
    },
  ],
};

// ---------------------------------------------------------------------------
// A two-level fixture guide (the real cybersecurity guide is U3's content).
// ---------------------------------------------------------------------------

const SAFETY_TH = "ฝึกในห้องที่เขาเปิดให้ฝึกเท่านั้น";

const TONIGHT_CLIP: ClipSlot = {
  seconds: 22,
  hookTh: "คืนนี้ลองเลย",
  scriptLinesTh: ["คืนนี้ลองทำห้องฝึกแรก", "จดสิ่งที่เจอไว้ในโน้ต", SAFETY_TH],
  required: true,
  safety: true,
  factIds: [],
};

function fixturePage(key: string, order: number, over: Partial<GuidePage> = {}): GuidePage {
  return {
    key,
    order,
    titleTh: `ด่าน ${key}`,
    questionTh: "คำถาม",
    navLabelTh: key,
    asOf: "2026-11-11",
    minutes: 2,
    blocks: [{ kind: "dialogue", id: "intro", lines: [{ speaker: "host", text: { th: "สวัสดี" } }] }],
    factIds: [],
    og: { headlineTh: key },
    ...over,
  };
}

const PAGES: GuidePage[] = [
  fixturePage("mythos", 1),
  fixturePage("tonight", 2, {
    clip: TONIGHT_CLIP,
    blocks: [
      { kind: "dialogue", id: "intro", lines: [{ speaker: "host", text: { th: "สวัสดี" } }] },
      { kind: "clip", id: "cut" },
      { kind: "safety", id: "safe", lineTh: SAFETY_TH },
    ],
    reel: { format: "founder", hook: { th: "คืนนี้ทำอะไรได้บ้าง" }, variantsTh: ["ลองคืนนี้", "เริ่มคืนนี้"], sendToFriendTh: "ส่งให้เพื่อนที่ชอบคอม", visual: [] },
  }),
];

const GUIDE: CareerGuide = {
  meta: {
    slug: "cybersecurity",
    alias: "cyber",
    nameTh: "ไซเบอร์",
    nameEn: "Cybersecurity",
    accent: "#5cff5c",
    status: "draft",
    asOf: "2026-11-11",
    intentPathSlug: "cybersecurity",
    pages: PAGES.map(({ key, order, titleTh, navLabelTh, minutes }) => ({ key, order, titleTh, navLabelTh, minutes })),
  },
  pages: PAGES,
  facts: [],
  banned: [],
};

describe("radar:clip manifest and captions", () => {
  const vtt = buildVtt(
    spokenLines(TONIGHT_CLIP).map((text, i) => ({ text, start: i * 2, end: i * 2 + 1.8 }))
  );

  it("fails clearly for a page without a clip slot, and for an unknown page", () => {
    expect(() => requireClipPage(GUIDE, "mythos")).toThrow(CliError);
    expect(() => requireClipPage(GUIDE, "mythos")).toThrow(/no clip slot.*Pages with a clip: tonight/);
    expect(() => requireClipPage(GUIDE, "nope")).toThrow(/has no page "nope"/);
    expect(requireClipPage(GUIDE, "tonight").slot).toBe(TONIGHT_CLIP);
  });

  it("builds a clips.json entry that passes the CDN patterns and the script hash", () => {
    const media = buildClipMedia({ slug: "cybersecurity", pageKey: "tonight", sha8: "abcdef12", durationS: 21.4, recordedAt: "2026-11-11", scriptLinesTh: TONIGHT_CLIP.scriptLinesTh });
    expect(RADAR_GUIDE_VIDEO_URL_PATTERN.test(media.videoUrl)).toBe(true);
    expect(RADAR_GUIDE_POSTER_URL_PATTERN.test(media.posterUrl)).toBe(true);
    expect(media).toMatchObject({ captionsFile: "clips/tonight.vtt", sha8: "abcdef12", scriptHash: clipScriptHash(TONIGHT_CLIP.scriptLinesTh) });
  });

  it("dry run: writes the VTT and the manifest with the expected keys and a stable sort", () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-clip-test-"));
    try {
      const older = buildClipMedia({ slug: "cybersecurity", pageKey: "mythos", sha8: "11111111", durationS: 20, recordedAt: "2026-11-01", scriptLinesTh: ["x"] });
      // An existing file with keys out of order and fields shuffled.
      writeFileSync(join(dir, "clips.json"), JSON.stringify({ zeta: Object.fromEntries(Object.entries(older).reverse()), mythos: older }));
      const media = buildClipMedia({ slug: "cybersecurity", pageKey: "tonight", sha8: "abcdef12", durationS: 21.4, recordedAt: "2026-11-11", scriptLinesTh: TONIGHT_CLIP.scriptLinesTh });
      const written = writeClipFiles(dir, "tonight", media, vtt);

      expect(written.vttPath).toBe(join(dir, "clips/tonight.vtt"));
      const savedVtt = readFileSync(written.vttPath, "utf8");
      expect(savedVtt.startsWith("WEBVTT")).toBe(true);
      expect(parseVtt(savedVtt).map((c) => c.text).join(" ")).toContain(SAFETY_TH);

      const raw = readFileSync(written.manifestPath, "utf8");
      const saved = JSON.parse(raw);
      expect(Object.keys(saved)).toEqual(["mythos", "tonight", "zeta"]);
      expect(Object.keys(saved.tonight)).toEqual(["videoUrl", "posterUrl", "captionsFile", "durationS", "sha8", "recordedAt", "scriptHash"]);
      expect(Object.keys(saved.zeta)[0]).toBe("videoUrl");
      expect(raw.endsWith("}\n")).toBe(true);
      expect(raw).toContain('\n  "mythos": {\n    "videoUrl"');

      // Writing again is byte-for-byte stable.
      writeClipFiles(dir, "tonight", media, vtt);
      expect(readFileSync(written.manifestPath, "utf8")).toBe(raw);

      // What guide-lint (and so Jest and radar:check) reads back: the tonight clip is clean.
      const issues = lintGuide(GUIDE, {
        clips: { manifest: { tonight: saved.tonight }, readVtt: (file) => readFileSync(join(dir, file), "utf8") },
      }).filter((i) => i.path.startsWith("clips.json"));
      expect(issues).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a broken clips.json instead of overwriting it", () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-clip-test-"));
    try {
      writeFileSync(join(dir, "clips.json"), "{ nope");
      const media = buildClipMedia({ slug: "cybersecurity", pageKey: "tonight", sha8: "abcdef12", durationS: 21.4, recordedAt: "2026-11-11", scriptLinesTh: TONIGHT_CLIP.scriptLinesTh });
      expect(() => writeClipFiles(dir, "tonight", media, vtt)).toThrow(/not valid JSON/);
      expect(readFileSync(join(dir, "clips.json"), "utf8")).toBe("{ nope");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("serialises sorted, 2-space JSON", () => {
    const media = buildClipMedia({ slug: "cybersecurity", pageKey: "b", sha8: "abcdef12", durationS: 1, recordedAt: "2026-11-11", scriptLinesTh: ["x"] });
    const text = serializeManifest(upsertManifest(upsertManifest({}, "b", media), "a", media));
    expect(Object.keys(JSON.parse(text))).toEqual(["a", "b"]);
    expect(text).toMatch(/^\{\n  "a": \{\n    "videoUrl"/);
  });

  it("writes a cut list with the hook, the safety line and the reel plan", () => {
    const page = requireClipPage(GUIDE, "tonight").page;
    const timed = spokenLines(TONIGHT_CLIP).map((text, i) => ({ text, start: i * 2, end: i * 2 + 1.8 }));
    const cuts = buildCutList({ slug: "cybersecurity", page, slot: TONIGHT_CLIP, durationS: 6, timed, subtitles: timed, method: "whisper", masterPath: "m", vttPath: "v" });
    expect(cuts.page).toBe("tonight");
    expect(cuts.lines).toHaveLength(3);
    expect(cuts.lines[0].on_screen_th).toBe("คืนนี้ลองเลย");
    expect(cuts.lines.map((l) => l.safety)).toEqual([false, false, true]);
    expect(cuts.reel?.variantsTh).toEqual(["ลองคืนนี้", "เริ่มคืนนี้"]);
    expect(cuts.target_s).toBe(22);
  });
});

describe("media", () => {
  const probeJson = (transfer: string, audio = true) =>
    JSON.stringify({
      streams: [
        { codec_type: "video", width: 1920, height: 1080, color_transfer: transfer, side_data_list: [{ rotation: -90 }] },
        ...(audio ? [{ codec_type: "audio" }] : []),
      ],
      format: { duration: "31.42" },
    });

  it("reads ffprobe JSON", () => {
    expect(parseProbe(probeJson("arib-std-b67"))).toMatchObject({ duration: 31.42, rotation: -90, hasAudio: true, colorTransfer: "arib-std-b67" });
  });

  it("tone-maps HLG to SDR and leaves SDR alone", () => {
    const hlg = parseProbe(probeJson("arib-std-b67"));
    const sdr = parseProbe(probeJson("bt709", false));
    expect(isHdr(hlg)).toBe(true);
    expect(masterArgs("in.mov", "m.mp4", hlg).join(" ")).toContain(TONEMAP_FILTER);
    expect(masterArgs("in.mov", "m.mp4", sdr).join(" ")).not.toContain("tonemap");
    expect(masterArgs("in.mov", "m.mp4", sdr)).toContain("-an");
  });

  it("encodes the web clip at 540x960, about 1.2 Mbps, faststart, no burned captions", () => {
    const args = webClipArgs("m.mp4", "w.mp4", true).join(" ");
    expect(args).toContain("scale=540:960");
    expect(args).toContain("-b:v 1200k");
    expect(args).toContain("+faststart");
    expect(args).not.toMatch(/subtitles|drawtext/);
    expect(masterArgs("in.mov", "m.mp4", parseProbe(probeJson("bt709"))).join(" ")).toContain("loudnorm");
  });

  it("makes webp posters", () => {
    expect(posterArgs("m.mp4", "p.webp", 0.6, 70).join(" ")).toContain("-c:v libwebp -quality 70");
  });

  it("builds content-hashed CDN URLs that pass the column checks", () => {
    const hash = sha8("bytes");
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
    expect(RADAR_GUIDE_VIDEO_URL_PATTERN.test(cdnUrl(guideMediaKey("cybersecurity", "money", hash, "mp4")))).toBe(true);
    expect(RADAR_GUIDE_POSTER_URL_PATTERN.test(cdnUrl(guideMediaKey("cybersecurity", "money", hash, "webp")))).toBe(true);
  });
});

describe("start options", () => {
  it("parses Thai and English durations", () => {
    expect(parseDurationMinutes("45 นาที")).toBe(45);
    expect(parseDurationMinutes("1-2 ชั่วโมง")).toBe(120);
    expect(parseDurationMinutes("2 hours")).toBe(120);
    expect(parseDurationMinutes("1 สัปดาห์")).toBe(10080);
    expect(parseDurationMinutes("แล้วแต่")).toBeNull();
  });

  it("passes a free, short, hands-on first option", () => {
    expect(checkFirstStartOption([SKILL]).warnings).toEqual([]);
  });

  it("warns about paid, long, certificate first options", () => {
    const paid: DumpSkill = {
      ...SKILL,
      start_options: [{ ...SKILL.start_options[0], title_th: "สอบ Security+ certificate", summary_th: null, kind: "course", metadata: { cost: "12,000 บาท", duration: "3 เดือน" } }],
    };
    const warnings = checkFirstStartOption([paid]).warnings.join("\n");
    expect(warnings).toMatch(/not free/);
    expect(warnings).toMatch(/under 2 hours/);
    expect(warnings).toMatch(/Certificates go last/);
  });

  it("warns when there are no skills", () => {
    expect(checkFirstStartOption(undefined).warnings).toHaveLength(1);
  });
});

describe("art", () => {
  it("prompts end with no people, no text, no watermark", () => {
    expect(buildArtPrompt("money", "Cybersecurity")).toMatch(/no people, no faces, no text, no watermark$/);
    expect(mentionsPeople(buildArtPrompt("day", "Data Scientist").replace(/no people, no faces/, ""))).toBe(false);
  });

  it("refuses prompts with people", () => {
    expect(mentionsPeople("a student at a desk")).toBe(true);
    expect(mentionsPeople("คนทำงานหน้าคอม")).toBe(true);
    expect(mentionsPeople("a desk lamp")).toBe(false);
  });

  it("never asks agy to skip its permission prompts", () => {
    const args = agyArgs("cyber-money", "it's a city");
    expect(args.join(" ")).not.toMatch(/dangerously|skip-permissions|--mode/);
    expect(args).toContain("stream-json");
    expect(args[1]).toContain("ImageName 'cyber-money'");
    expect(args[1]).not.toContain("it's");
  });

  it("finds the saved path in stream-json output", () => {
    const out = [
      JSON.stringify({ type: "tool_result", content: "Image saved at /Users/x/.gemini/images/cyber-money.png" }),
      JSON.stringify({ type: "result", result: "/Users/x/.gemini/images/cyber-money.png" }),
    ].join("\n");
    expect(parseSavedPath(out)).toBe("/Users/x/.gemini/images/cyber-money.png");
    expect(parseSavedPath("nothing here")).toBeNull();
  });

  it("records one current image per career and scene", () => {
    const a = recordArt(emptyArtIndex(), "cybersecurity", "money", { url: "u1", prompt: "p", created_at: "t" });
    const b = recordArt(a, "cybersecurity", "money", { url: "u2", prompt: "p", created_at: "t" });
    expect(b.fields.cybersecurity.money?.url).toBe("u2");
  });
});

describe("cli args", () => {
  it("parses flags and refuses unknown ones", () => {
    const args = parseArgs(["cyber", "--dry-run", "--page", "money", "--out=/tmp/x"], { bool: ["dry-run"], value: ["page", "out"] });
    expect(args).toEqual({ positional: ["cyber"], flags: { "dry-run": true, page: "money", out: "/tmp/x" } });
    expect(() => parseArgs(["--uplaod"], { bool: ["upload"] })).toThrow(/Unknown flag/);
    expect(() => parseArgs(["--page"], { value: ["page"] })).toThrow(/needs a value/);
  });
});

describe("demo reels from the real cybersecurity guide", () => {
  it("every level with a demo script makes a reel whose steps ascend and fit 8 to 45s", () => {
    for (const page of cybersecurityGuide.pages) {
      const plan = buildDemoReelPlan({ slug: "cybersecurity", alias: cybersecurityGuide.meta.alias, platform: "ig", page });
      if (!plan.steps.length && page.reel?.format !== "demo") continue;
      expect({ page: page.key, problems: demoReelProblems(plan) }).toEqual({ page: page.key, problems: [] });
    }
  });
});
