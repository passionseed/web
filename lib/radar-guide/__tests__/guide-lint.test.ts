import {
  clipScriptHash,
  formatIssues,
  lintErrors,
  lintFactIdsUnique,
  lintFacts,
  lintGuide,
  numberTokens,
  type GuideLintOptions,
  type LintIssue,
} from "../guide-lint";
import type { CareerGuide, Fact, GuideBlock, GuidePage } from "../guide-types";

const NOW = new Date("2026-11-11T12:00:00+07:00");

const FACTS: Fact[] = [
  {
    id: "f.firefox",
    claimEn: "Mozilla says 271 vulnerabilities were found with Mythos Preview; 423 fixed in April 2026",
    values: ["35,500"],
    sources: [{ outlet: "Mozilla Hacks", url: "https://hacks.mozilla.org/x", publishedAt: "2026-05-07" }],
    asOf: "2026-11-11",
    badge: "confirmed",
  },
  {
    id: "f.drawer",
    claimEn: "Severity gap 91.5 vs 61.3",
    sources: [{ outlet: "VulnCheck", url: "https://vulncheck.com/x", publishedAt: "2026-09-08" }],
    asOf: "2026-11-11",
    badge: "pending",
    drawerOnly: true,
  },
  {
    id: "sim.snippet",
    claimEn: "Simulated code: buffer 64 bytes",
    sources: [],
    asOf: "2026-11-11",
    badge: "simulated",
  },
];

function page(over: Partial<GuidePage> = {}, blocks: GuideBlock[] = []): GuidePage {
  return {
    key: "mythos",
    order: 1,
    titleTh: "AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ",
    questionTh: "AI เก่งแค่ไหนแล้วจริงๆ",
    navLabelTh: "บั๊กเก่า",
    asOf: "2026-11-11",
    minutes: 2,
    factIds: ["f.firefox", "f.drawer", "sim.snippet"],
    og: { headlineTh: "AI เจอบั๊กเก่า" },
    blocks: [{ kind: "copy", id: "hero", role: "hero", text: { th: "Mozilla บอกว่า 271 ตัวเจอด้วย AI", factIds: ["f.firefox"] } }, ...blocks],
    ...over,
  };
}

function guide(pages: GuidePage[] = [page()], over: Partial<CareerGuide> = {}): CareerGuide {
  return {
    meta: {
      slug: "cybersecurity",
      alias: "cyber",
      nameTh: "ไซเบอร์",
      nameEn: "Cybersecurity",
      accent: "#5cff5c",
      status: "draft",
      asOf: "2026-11-11",
      intentPathSlug: "interested",
      pages: pages.map((p) => ({
        key: p.key,
        order: p.order,
        titleTh: p.titleTh,
        navLabelTh: p.navLabelTh,
        minutes: p.minutes,
        legacyHashes: p.legacyHashes,
      })),
    },
    pages,
    facts: FACTS,
    banned: [{ pattern: /zero-day 271/i, reason: "say Mozilla บอกว่า", scope: "reel" }],
    ...over,
  };
}

function run(g: CareerGuide, opts: GuideLintOptions = {}): LintIssue[] {
  return lintGuide(g, { now: NOW, ...opts });
}

function hasError(issues: LintIssue[], fragment: string | RegExp): boolean {
  return issues.some((i) => i.level === "error" && (typeof fragment === "string" ? i.message.includes(fragment) : fragment.test(i.message)));
}

describe("guide-lint", () => {
  it("passes a clean guide", () => {
    const issues = run(guide());
    expect(formatIssues(lintErrors(issues))).toBe("");
  });

  it("flags an em dash and น้องๆ", () => {
    const issues = run(guide([page({ questionTh: "AI เก่งแค่ไหน — จริงๆ" }, [
      { kind: "copy", id: "b", role: "body", text: { th: "สวัสดีน้องๆ ทุกคน" } },
    ])]));
    expect(hasError(issues, "dash")).toBe(true);
    expect(hasError(issues, "น้องๆ")).toBe(true);
  });

  it("flags an unbacked digit and a Thai-digit number", () => {
    const issues = run(guide([page({}, [
      { kind: "copy", id: "b", role: "body", text: { th: "พบ 999 ตัว", factIds: ["f.firefox"] } },
      { kind: "copy", id: "c", role: "body", text: { th: "พบ ๗๗๗ ตัว", factIds: ["f.firefox"] } },
    ])]));
    expect(hasError(issues, 'number "999"')).toBe(true);
    expect(hasError(issues, 'number "777"')).toBe(true);
  });

  it("accepts digits backed by values, claimEn, Thai digits and Buddhist years", () => {
    const issues = run(guide([page({}, [
      { kind: "copy", id: "b", role: "body", text: { th: "ค่ากลาง 35,500 บาท", factIds: ["f.firefox"] } },
      { kind: "copy", id: "c", role: "body", text: { th: "แก้ไป ๔๒๓ จุด ในปี 2569", factIds: ["f.firefox"] } },
    ])]));
    expect(formatIssues(lintErrors(issues))).toBe("");
  });

  it("exempts ม.5, TCAS70, รอบ 1 and placeholders", () => {
    expect(numberTokens("ม.5 ยื่น TCAS70 รอบ 1 ได้ {score}/{total}")).toEqual([]);
    const issues = run(guide([page({}, [
      { kind: "copy", id: "b", role: "body", text: { th: "ม.5 เตรียม TCAS71 รอบ 2 ได้ {x} คะแนน" } },
    ])]));
    expect(formatIssues(lintErrors(issues))).toBe("");
  });

  it("exempts simulated engine data that cites a sim.* fact, and requires the citation", () => {
    const findLine = (simulatedFactId: "sim.snippet" | "f.firefox"): GuideBlock => ({
      kind: "game",
      id: "find",
      game: {
        engine: "FindLine",
        data: {
          captionTh: "โค้ดจำลอง บัฟเฟอร์ 64 ไบต์ อ่านได้ถึง 255",
          simulatedFactId,
          lines: [{ n: 1, code: "char buf[64];" }],
          answer: 1,
          nearMissTh: {},
          hintsTh: ["ดูขนาด", "ดูบรรทัด 5"],
          outlineOnHint2: [5],
          onFound: { explanationTh: "เจอแล้ว" },
        },
      },
      track: { done: "mythos:find-done", value: "attempts" },
      answersTh: ["บรรทัด 1"],
    });
    expect(formatIssues(lintErrors(run(guide([page({}, [findLine("sim.snippet")])]))))).toBe("");
    const bad = run(guide([page({}, [findLine("f.firefox")])]));
    expect(hasError(bad, "sim.* fact")).toBe(true);
  });

  it("flags a drawer-only fact cited by copy, and an unknown fact", () => {
    const issues = run(guide([page({}, [
      { kind: "copy", id: "b", role: "body", text: { th: "ช่องว่างความรุนแรง", factIds: ["f.drawer"] } },
      { kind: "copy", id: "c", role: "body", text: { th: "อะไรสักอย่าง", factIds: ["f.nope"] } },
    ])]));
    expect(hasError(issues, "drawer-only")).toBe(true);
    expect(hasError(issues, "unknown fact id f.nope")).toBe(true);
  });

  it("flags copy-level facts missing from page.factIds", () => {
    const issues = run(guide([page({ factIds: ["f.drawer"] })]));
    expect(hasError(issues, "missing from page.factIds")).toBe(true);
  });

  it("flags a missing source and a duplicate fact id", () => {
    const noSource: Fact = { id: "f.nosrc", claimEn: "x", sources: [], asOf: "2026-11-11", badge: "confirmed" };
    expect(hasError(lintFacts([noSource], NOW), "https source")).toBe(true);
    expect(hasError(lintFacts([FACTS[0], FACTS[0]], NOW), "duplicate fact id")).toBe(true);
    expect(hasError(lintFactIdsUnique({ _shared: [FACTS[0]], cybersecurity: [FACTS[0]] }), "is in both")).toBe(true);
  });

  it("flags asOf in the future, warns at 46 days, errors at 121 days", () => {
    const future = run(guide([page({ asOf: "2026-11-20" })], {}));
    expect(hasError(future, "after the run date")).toBe(true);

    const warn = run(guide([page({ asOf: "2026-09-26" })]), { now: NOW });
    expect(warn.some((i) => i.level === "warn" && i.path === "asOf")).toBe(true);
    expect(warn.some((i) => i.level === "error" && i.path === "asOf")).toBe(false);

    const error = run(guide([page({ asOf: "2026-07-13" })]));
    expect(error.some((i) => i.level === "error" && i.path === "asOf")).toBe(true);

    const strict = run(guide([page({ asOf: "2026-09-26" })]), { maxAgeDays: 45 });
    expect(strict.some((i) => i.level === "error" && i.path === "asOf")).toBe(true);
  });

  it("flags a banned pattern in a reel variant, by scope", () => {
    const withReel = page({
      reel: {
        format: "motion",
        hook: { th: "AI เจอบั๊ก", factIds: ["f.firefox"] },
        variantsTh: ["zero-day 271 ตัว", "อีกแบบ"],
        sendToFriendTh: "ส่งให้เพื่อน",
        visual: [],
      },
    });
    const issues = run(guide([withReel]));
    expect(issues.some((i) => i.path === "reel.variantsTh[0]" && i.message.includes("must-not-say"))).toBe(true);
  });

  it("flags a reserved page key, non-contiguous order and a meta mismatch", () => {
    const deck = page({ key: "deck", order: 1 });
    expect(hasError(run(guide([deck])), "reserved")).toBe(true);

    const gap = guide([page(), page({ key: "doors", order: 3 })]);
    expect(hasError(run(gap), "1..n")).toBe(true);

    const g = guide();
    const mismatched: CareerGuide = { ...g, meta: { ...g.meta, pages: [{ ...g.meta.pages[0], titleTh: "อื่น" }] } };
    expect(hasError(run(mismatched), "meta titleTh")).toBe(true);
  });

  it("flags showsHacking without a safety block", () => {
    expect(hasError(run(guide([page({ showsHacking: true })])), "safety block")).toBe(true);
    const safe = page({ showsHacking: true }, [{ kind: "safety", id: "s", lineTh: "เจาะระบบที่เจ้าของไม่อนุญาต ผิดกฎหมาย" }]);
    expect(hasError(run(guide([safe])), "safety block")).toBe(false);
  });

  it("flags an event target without the page prefix, and an empty answersTh", () => {
    const g: GuideBlock = {
      kind: "game",
      id: "guess",
      game: {
        engine: "FlipCards",
        data: { highlightTh: "ได้รับอนุญาต", cards: [] },
      },
      track: { done: "triage:done", value: "count", milestones: { flip: "mythos:flip" } },
      answersTh: [],
    };
    const issues = run(guide([page({}, [g])]));
    expect(hasError(issues, '"triage:done"')).toBe(true);
    expect(hasError(issues, '"mythos:flip"')).toBe(false);
    expect(hasError(issues, "answersTh must not be empty")).toBe(true);
  });

  it("flags deadlines without an explicit offset", () => {
    const g: GuideBlock = {
      kind: "game",
      id: "tcas",
      game: {
        engine: "ProgrammeFilter",
        data: {
          gradeQuestionTh: "ตอนนี้อยู่ชั้นไหน",
          gradeBannersTh: { m4: "ม.4", m5: "ม.5", m6: "ม.6" },
          programmes: [
            {
              id: "x",
              uniTh: "มหาวิทยาลัย",
              degreeTh: "วิศวะคอม",
              track: "thai",
              rounds: ["portfolio"],
              deadline: { at: "2027-01-28T16:30:00" as `${number}-${number}-${number}T${string}`, labelTh: "ปิดรับ" },
              badge: "pending",
              factIds: [],
              href: "https://course.mytcas.com/programs/x",
              cyberInName: true,
            },
          ],
          snapshot: "tcas.json",
          broadRoutes: [],
          fitOrder: { A: "cyberFirst", B: "broadFirst", C: "both" },
        },
      },
      track: { done: "mythos:tcas-done", value: "none" },
      answersTh: ["ดูรายการ"],
    };
    expect(hasError(run(guide([page({}, [g])])), "explicit offset")).toBe(true);
  });

  it("checks dialogue boxes, items and story meta", () => {
    const blocks: GuideBlock[] = [
      {
        kind: "dialogue",
        id: "intro",
        lines: [
          { speaker: "host", text: { th: "รู้ไหม AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ" } },
          { speaker: "host", text: { th: "ประโยคนี้ยาวมากเกินไปสำหรับกล่องเดียว เพราะมันยาวต่อไปเรื่อยๆ จนเกินสองบรรทัดบนจอโทรศัพท์แน่นอน ต้องแยก" } },
        ],
      },
      { kind: "item", id: "intel", item: "intel", text: { th: "Mozilla แก้ 423 จุด", factIds: ["f.firefox"] }, metaTh: "Mozilla Hacks" },
      { kind: "item", id: "chat", item: "chat", simulated: true, text: { th: "โอน 5,000 บาท ด่วน", factIds: ["f.firefox"] } },
    ];
    const g = guide([page({}, blocks)]);
    g.meta.story = {
      profileTitleTh: "โปรไฟล์สายไซเบอร์ของฉัน",
      badges: [
        { id: "a", nameTh: "ตาไว", descTh: "ผ่านด่านแรก", icon: "bug", trigger: { on: "clear", pageKey: "mythos" } },
        { id: "a", nameTh: "ซ้ำ 2 ครั้ง", descTh: "x", icon: "bug", trigger: { on: "clear", pageKey: "nope" } },
      ],
      traits: [{ id: "t", labelTh: "นักสำรวจ", icon: "map", when: [{ always: true }] }],
    };
    const issues = run(g);
    expect(issues.some((i) => i.level === "warn" && i.message.includes("dialogue box"))).toBe(true);
    expect(hasError(issues, "sim.* fact")).toBe(true); // simulated chat cites only f.firefox
    expect(hasError(issues, "duplicate badge id a")).toBe(true);
    expect(hasError(issues, 'unknown page "nope"')).toBe(true);
    expect(hasError(issues, "numbers are not allowed here")).toBe(true);
  });

  it("checks clips: manifest page, URLs, VTT and script hash", () => {
    const lines = ["บรรทัดแรก", "บรรทัดสอง"];
    const withClip = page({ clip: { seconds: 20, hookTh: "AI เจอบั๊ก", scriptLinesTh: lines, required: true, safety: false, factIds: [] } }, [
      { kind: "clip", id: "clip" },
    ]);
    const vtt = "WEBVTT\n\n00:00.000 --> 00:02.000\nบรรทัดแรก\n";
    const media = {
      videoUrl: "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.0123abcd.mp4",
      posterUrl: "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.0123abcd.webp",
      captionsFile: "clips/mythos.vtt" as const,
      durationS: 20,
      sha8: "0123abcd",
      recordedAt: "2026-11-11" as const,
      scriptHash: clipScriptHash(lines),
    };
    const ok = run(guide([withClip]), { clips: { manifest: { mythos: media }, readVtt: () => vtt } });
    expect(formatIssues(lintErrors(ok))).toBe("");

    const stale = run(guide([withClip]), {
      clips: { manifest: { mythos: { ...media, scriptHash: "000000000000" } }, readVtt: () => vtt },
    });
    expect(hasError(stale, "script changed after recording")).toBe(true);

    const orphan = run(guide(), { clips: { manifest: { mythos: media }, readVtt: () => null } });
    expect(hasError(orphan, "no page with a clip slot")).toBe(true);

    const live = guide([withClip]);
    live.meta = { ...live.meta, status: "live" };
    expect(hasError(run(live, { requireClips: true, clips: { manifest: {}, readVtt: () => null } }), "required clip")).toBe(true);
    expect(hasError(run(live, { clips: { manifest: {}, readVtt: () => null } }), "required clip")).toBe(false);
  });

  it("flags a clip block on a page without a clip slot, and a reserved slug", () => {
    expect(hasError(run(guide([page({}, [{ kind: "clip", id: "clip" }])])), "without a clip slot")).toBe(true);
    const g = guide();
    expect(hasError(run({ ...g, meta: { ...g.meta, slug: "skills" } }), "static /radar route")).toBe(true);
  });
});
