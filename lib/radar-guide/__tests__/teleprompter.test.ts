import { cybersecurityGuide } from "@/lib/radar-guides/cybersecurity/guide";

import type { CareerGuide, ClipSlot, GuidePage } from "../guide-types";
import { clipScriptHash } from "../guide-lint";
import { clipCommand, safetyLineIndexes, teleprompterPages, teleprompterSteps } from "../teleprompter";

function slot(over: Partial<ClipSlot> = {}): ClipSlot {
  return { seconds: 20, hookTh: "ฮุก", scriptLinesTh: ["บรรทัดหนึ่ง", "บรรทัดสอง"], required: false, safety: false, factIds: [], ...over };
}

function page(key: string, order: number, over: Partial<GuidePage> = {}): GuidePage {
  return {
    key,
    order,
    titleTh: `หน้า ${key}`,
    questionTh: "คำถาม",
    navLabelTh: key,
    asOf: "2026-11-11",
    minutes: 2,
    blocks: [],
    factIds: [],
    og: { headlineTh: key },
    ...over,
  };
}

const guide: Pick<CareerGuide, "pages"> = {
  pages: [
    page("mythos", 1, { clip: slot() }),
    page("doors", 2, { clip: slot({ safety: true, scriptLinesTh: ["เปิดประตู", "ทำได้เมื่อได้รับอนุญาตเท่านั้น"] }) }),
    page("triage", 3),
    page("money", 4, {
      clip: slot({ required: true }),
      reel: { format: "founder", hook: { th: "เงินเดือนแรก" }, variantsTh: ["เงินเดือนแรก", "เริ่มที่เท่าไร"], sendToFriendTh: "ส่งให้เพื่อน", visual: [] },
    }),
    page("tonight", 5, {
      clip: slot({ required: true, safety: true, scriptLinesTh: ["คืนนี้ลองทำห้องแรก", "ฝึกในห้องที่เขาเปิดให้ฝึกเท่านั้น"] }),
      blocks: [{ kind: "safety", id: "safe", lineTh: "ฝึกในห้องที่เขาเปิดให้ฝึกเท่านั้น" }],
    }),
  ],
};

test("orders required clips, then safety clips, then page order, and skips pages without a clip", () => {
  expect(teleprompterPages(guide).map((p) => p.pageKey)).toEqual(["tonight", "money", "doors", "mythos"]);
});

test("marks safety lines from the page's safety block or a permission line", () => {
  const pages = teleprompterPages(guide);
  expect(pages.find((p) => p.pageKey === "tonight")!.safetyLines).toEqual([1]);
  expect(pages.find((p) => p.pageKey === "doors")!.safetyLines).toEqual([1]);
  expect(pages.find((p) => p.pageKey === "mythos")!.safetyLines).toEqual([]);
});

test("a safety clip with no matching line keeps the face on screen for every line", () => {
  expect(safetyLineIndexes(slot({ safety: true }), { blocks: [] })).toEqual([0, 1]);
});

test("reel hook takes are deduplicated and come after the script lines", () => {
  const money = teleprompterPages(guide).find((p) => p.pageKey === "money")!;
  expect(money.reelHooksTh).toEqual(["เงินเดือนแรก", "เริ่มที่เท่าไร"]);
  const steps = teleprompterSteps(money);
  expect(steps.map((s) => s.kind)).toEqual(["line", "line", "reelHook", "reelHook"]);
  expect(steps[0].cue).toContain("ขึ้นจอ: ฮุก");
  expect(money.sendToFriendTh).toBe("ส่งให้เพื่อน");
});

test("clip status follows clips.json and the script hash", () => {
  const recorded = {
    videoUrl: "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.abcdef12.mp4",
    posterUrl: "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.abcdef12.webp",
    captionsFile: "clips/mythos.vtt" as const,
    durationS: 20,
    sha8: "abcdef12",
    recordedAt: "2026-11-10" as const,
    scriptHash: clipScriptHash(["บรรทัดหนึ่ง", "บรรทัดสอง"]),
  };
  const pages = teleprompterPages(guide, {
    manifest: { mythos: recorded, money: { ...recorded, scriptHash: "000000000000" } },
    hash: clipScriptHash,
  });
  const status = Object.fromEntries(pages.map((p) => [p.pageKey, p.status]));
  expect(status).toEqual({ tonight: "missing", money: "stale", doors: "missing", mythos: "recorded" });
  expect(pages.find((p) => p.pageKey === "mythos")!.recordedAt).toBe("2026-11-10");
});

test("prints a dry-run clip command", () => {
  expect(clipCommand("cybersecurity", "tonight")).toBe("pnpm radar:clip cybersecurity tonight ~/Movies/take.mov --dry-run");
});

test("the real cybersecurity guide: every cutscene is on the teleprompter, safety clips mark a line", () => {
  const pages = teleprompterPages(cybersecurityGuide, { manifest: {}, hash: clipScriptHash });
  expect(pages.map((p) => p.pageKey).sort()).toEqual(
    cybersecurityGuide.pages.filter((p) => p.clip).map((p) => p.key).sort()
  );
  for (const p of pages) {
    expect(p.status).toBe("missing");
    expect(p.scriptLinesTh.length).toBeGreaterThan(0);
    expect(teleprompterSteps(p).length).toBeGreaterThanOrEqual(p.scriptLinesTh.length);
    if (p.safety) expect(p.safetyLines.length).toBeGreaterThan(0);
  }
  const order = pages.map((p) => [Number(p.required), Number(p.safety)]);
  expect(order).toEqual([...order].sort((a, b) => b[0] - a[0] || b[1] - a[1]));
});
