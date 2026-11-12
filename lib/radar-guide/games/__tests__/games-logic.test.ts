import type { GuideState } from "../../guide-types";
import { emptyProgress } from "../../story";
import * as fx from "../__fixtures__/engines";
import { addSeen, fitResult, fitValue, proofBitmask, tallyFit, togglePick } from "../choices";
import { buildWriteupMarkdown, copyText, localIsoDate } from "../evidence";
import { findLineResult, initFindLine, solvedFindLine, tapFindLine } from "../find-line";
import { bucketIndex, clampGuess, guessFeedback, initialGuess, stepGuess } from "../guess-reveal";
import {
  CLOSED_TH,
  countdownLabel,
  filterProgrammes,
  fitOrderFor,
  gpaxGreyed,
  hasExplicitOffset,
  orderProgrammes,
  showsCountdown,
} from "../programme";
import { favouriteLine, favouriteOptions, recapLines, wasPlayed } from "../recap";
import {
  judgeItem,
  placeItem,
  placementLine,
  solvedPlacements,
  sortOutcomeLines,
  sortResultText,
  sortScore,
  sortValue,
  visibleFlags,
  type Placements,
} from "../sort-game";
import { fillTemplate, formatNumber, splitHighlight } from "../text";

describe("text", () => {
  test("fillTemplate fills names with colons and blanks missing ones", () => {
    expect(fillTemplate("{a}/{b} {c:x:y}", { a: 1, b: 2, "c:x:y": "z" })).toBe("1/2 z");
    expect(fillTemplate("เดา {g}", {})).toBe("เดา ");
  });
  test("formatNumber groups with commas and never uses Thai digits", () => {
    expect(formatNumber(5_000_000)).toBe("5,000,000");
    expect(formatNumber(35500)).toBe("35,500");
    expect(formatNumber(-1200)).toBe("-1,200");
  });
  test("splitHighlight marks every occurrence", () => {
    const parts = splitHighlight("a X b X", "X");
    expect(parts.filter((p) => p.hit)).toHaveLength(2);
    expect(parts.map((p) => p.text).join("")).toBe("a X b X");
  });
});

describe("FindLine", () => {
  test("goes idle -> wrong -> found and counts attempts", () => {
    let s = initFindLine();
    expect(s.phase).toBe("idle");
    s = tapFindLine(s, fx.findLine, 2);
    expect(s.phase).toBe("wrong");
    expect(s.attempts).toBe(1);
    s = tapFindLine(s, fx.findLine, 7);
    expect(s.phase).toBe("found");
    expect(s.attempts).toBe(2);
    expect(tapFindLine(s, fx.findLine, 3)).toBe(s);
    expect(findLineResult(s)).toMatchObject({ done: true, attempts: 2, score: 0, total: 1 });
  });

  test("hint 1, then hint 2 outlining lines 5, 7 and 8", () => {
    let s = tapFindLine(initFindLine(), fx.findLine, 1);
    expect(s.hint).toBe(1);
    expect(s.feedback).toBe(fx.findLine.hintsTh[0]);
    expect(s.outlined).toEqual([]);
    s = tapFindLine(s, fx.findLine, 3);
    expect(s.hint).toBe(2);
    expect(s.feedback).toBe(fx.findLine.hintsTh[1]);
    expect(s.outlined).toEqual([5, 7, 8]);
  });

  test("near-miss lines give their own feedback", () => {
    const s = tapFindLine(initFindLine(), fx.findLine, 8);
    expect(s.feedback).toBe(fx.findLine.nearMissTh[8]);
    expect(s.hint).toBe(0);
  });

  test("first-tap find is perfect; solved state is found", () => {
    expect(findLineResult(tapFindLine(initFindLine(), fx.findLine, 7)).score).toBe(1);
    expect(solvedFindLine(fx.findLine).phase).toBe("found");
  });
});

describe("GuessReveal", () => {
  test("bucket thresholds match the design tables", () => {
    // Firefox: 0 <50, 1 50 to 149, 2 150 to 299, 3 300+
    expect([0, 49, 50, 149, 150, 299, 300, 500].map((v) => bucketIndex(v, fx.firefox.buckets))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ]);
    // Money: 0 <30k, 1 30 to 40k, 2 40 to 60k, 3 above
    expect([15000, 29500, 30000, 39500, 40000, 59500, 60500].map((v) => bucketIndex(v, fx.money.buckets))).toEqual([
      0, 0, 1, 1, 2, 2, 3,
    ]);
  });

  test("เกือบเป๊ะ within the tolerance, otherwise over or under with the gap", () => {
    expect(guessFeedback(35000, fx.money)).toEqual({ kind: "near", text: "เกือบเป๊ะ" });
    expect(guessFeedback(36500, fx.money).kind).toBe("near");
    expect(guessFeedback(40000, fx.money)).toEqual({ kind: "over", text: "เธอเดาสูงไป 4,500 บาท" });
    expect(guessFeedback(20000, fx.money)).toEqual({ kind: "under", text: "เธอเดาต่ำไป 15,500 บาท" });
  });

  test("guesses snap to the step and stay in range", () => {
    expect(clampGuess(423, fx.firefox)).toBe(420);
    expect(clampGuess(-5, fx.firefox)).toBe(0);
    expect(stepGuess(500, 1, fx.firefox)).toBe(500);
    expect(stepGuess(35500, -1, fx.money)).toBe(35000);
    expect(initialGuess(fx.money) % 500).toBe(0);
  });
});

describe("SortGame", () => {
  const placeAll = (bins: Record<string, string>) =>
    Object.entries(bins).reduce<Placements>((p, [id, bin]) => placeItem(p, fx.doors, id, bin), {});

  test("near-miss answers are near, not correct", () => {
    const hunter = fx.doors.items.find((i) => i.id === "hunter")!;
    expect(judgeItem(hunter, "redteam")).toBe("near");
    expect(judgeItem(hunter, "no")).toBe("wrong");
    const p = placeItem({}, fx.doors, "hunter", "redteam");
    expect(placementLine(fx.doors, hunter, p.hunter)).toBe("ใกล้แล้ว Red Team รับเฉพาะองค์กร");
  });

  test("multi-answer items accept every listed bin (ผู้ดูแลระบบไฟฟ้า)", () => {
    const grid = fx.doors.items.find((i) => i.id === "grid")!;
    expect(judgeItem(grid, "specialized")).toBe("correct");
    expect(judgeItem(grid, "defense")).toBe("correct");
    expect(judgeItem(grid, "redteam")).toBe("wrong");
  });

  test("unscored items accept any bin and are left out of the total", () => {
    const placed = placeAll({ hospital: "defense", hunter: "defense", pentest: "redteam", grid: "defense", anon: "no", student: "defense" });
    expect(placed.student.verdict).toBe("free");
    const s = sortScore(fx.doors, placed);
    expect(s).toMatchObject({ score: 5, total: 5, complete: true, hasGoal: false });
    expect(sortValue(s)).toBe(5);
    expect(sortResultText(fx.doors, s)).toBe("ให้กุญแจถูก 5/5");
  });

  test("a placed item stays placed", () => {
    const once = placeItem({}, fx.doors, "anon", "defense");
    expect(placeItem(once, fx.doors, "anon", "no")).toBe(once);
  });

  test("the triage value is x*10+y", () => {
    let p: Placements = {};
    // Catch a2 (goal), miss a5 (goal), get 7 of 8 agrees right (a10 wrong).
    for (const item of fx.triage.items) {
      const bin = item.id === "a2" ? "miss" : item.id === "a5" ? "agree" : item.id === "a10" ? "miss" : "agree";
      p = placeItem(p, fx.triage, item.id, bin);
    }
    const s = sortScore(fx.triage, p);
    expect(s).toMatchObject({ x: 1, xTotal: 2, y: 7, yTotal: 8, score: 8, total: 10 });
    expect(sortValue(s)).toBe(17);
    expect(sortResultText(fx.triage, s)).toBe("จับข้อที่ AI พลาดได้ 1/2 · เห็นด้วยถูก 7/8");
    expect(sortOutcomeLines(fx.triage, p)).toEqual(["ข้อ 2 คือบัญชีโดนยึดจริง"]);
    const a10 = fx.triage.items.find((i) => i.id === "a10")!;
    expect(placementLine(fx.triage, a10, p.a10)).toBe("ข้อนี้ AI ถูก: เฉลย a10");
  });

  test("engine flags are hidden; solved placements are all correct", () => {
    expect(visibleFlags(fx.triage.items[1])).toEqual([]);
    expect(visibleFlags(fx.scam.items[0])).toEqual(["เร่ง", "ขอเงิน"]);
    const s = sortScore(fx.triage, solvedPlacements(fx.triage));
    expect(s.score).toBe(s.total);
  });
});

describe("choices", () => {
  test("BinaryChoice tallies the outcomes", () => {
    const t = tallyFit(fx.fit.questions, { q1: "left", q2: "left", q3: "right" });
    expect(t).toEqual({ A: 5, B: 1, C: 0 });
    expect(fitResult(t)).toBe("A");
    expect(fitValue("A")).toBe(1);
  });

  test("ties give AB (value 4)", () => {
    const t = tallyFit(fx.fit.questions, { q1: "left", q2: "right", q3: "left" });
    expect(t).toEqual({ A: 1, B: 3, C: 0 });
    expect(fitResult({ A: 2, B: 2, C: 1 })).toBe("AB");
    expect(fitResult({ A: 1, B: 0, C: 1 })).toBe("AC");
    expect(fitResult({ A: 1, B: 1, C: 1 })).toBe("AB");
    expect(fitValue("AB")).toBe(4);
    expect(fitValue("C")).toBe(3);
  });

  test("proof picks: exactly up to max, bitmask by chip position", () => {
    let picked: string[] = [];
    for (const id of ["writeup", "homelab", "oss", "ctf"]) picked = togglePick(picked, id, 3);
    expect(picked).toEqual(["writeup", "homelab", "oss"]);
    expect(proofBitmask(fx.ladder.proofChips, picked)).toBe(0b1101);
    expect(togglePick(picked, "homelab", 3)).toEqual(["writeup", "oss"]);
    expect(addSeen(["a"], "a")).toEqual(["a"]);
  });
});

describe("ProgrammeFilter", () => {
  const deadline = "2027-01-28T16:30:00+07:00";

  test("countdowns read days left, then ปิดแล้ว, never a negative number", () => {
    expect(hasExplicitOffset(deadline)).toBe(true);
    expect(hasExplicitOffset("2027-01-28T16:30:00")).toBe(false);
    const nov17 = new Date("2026-11-17T09:00:00+07:00");
    expect(countdownLabel(deadline, nov17)).toBe("อีก 72 วัน");
    expect(countdownLabel(deadline, new Date("2027-01-28T10:30:00+07:00"))).toBe("อีก 6 ชั่วโมง");
    expect(countdownLabel(deadline, new Date("2027-01-28T16:10:00+07:00"))).toBe("อีก 20 นาที");
    const jan29 = new Date("2027-01-29T09:00:00+07:00");
    expect(countdownLabel(deadline, jan29)).toBe(CLOSED_TH);
    expect(countdownLabel("not a date", jan29)).toBe(CLOSED_TH);
  });

  test("with a mocked system clock", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-17T00:00:00Z"));
    try {
      expect(countdownLabel(deadline)).toMatch(/^อีก \d+ วัน$/);
      jest.setSystemTime(new Date("2027-01-29T00:00:00Z"));
      expect(countdownLabel(deadline)).toBe("ปิดแล้ว");
    } finally {
      jest.useRealTimers();
    }
  });

  test("countdowns for ม.6 only", () => {
    expect(showsCountdown("m6")).toBe(true);
    expect(showsCountdown("m5")).toBe(false);
    expect(showsCountdown("m4")).toBe(false);
    expect(showsCountdown(undefined)).toBe(false);
  });

  test("GPAX greys cards out and never hides them", () => {
    const kmitl = fx.tcas.programmes[1];
    expect(gpaxGreyed(kmitl, 2.5)).toBe(true);
    expect(gpaxGreyed(kmitl, 3.2)).toBe(false);
    expect(gpaxGreyed(kmitl, undefined)).toBe(false);
    expect(gpaxGreyed(fx.tcas.programmes[0], 1)).toBe(false);
    const filtered = filterProgrammes(fx.tcas.programmes, { round: "all", track: "all" });
    expect(filtered).toHaveLength(fx.tcas.programmes.length);
  });

  test("filters by round and track", () => {
    expect(filterProgrammes(fx.tcas.programmes, { round: "portfolio", track: "all" }).map((p) => p.uniTh)).toEqual([
      "มข.",
      "สจล.",
    ]);
    expect(filterProgrammes(fx.tcas.programmes, { round: "all", track: "intl" }).map((p) => p.uniTh)).toEqual(["มช."]);
  });

  test("the fit result sets the order", () => {
    const list = [fx.tcas.programmes[2], ...fx.tcas.programmes.slice(0, 2)];
    expect(fitOrderFor("A", fx.tcas.fitOrder)).toBe("cyberFirst");
    expect(fitOrderFor("B", fx.tcas.fitOrder)).toBe("broadFirst");
    expect(fitOrderFor("AB", fx.tcas.fitOrder)).toBe("both");
    expect(fitOrderFor(undefined, fx.tcas.fitOrder)).toBe("both");
    expect(orderProgrammes(list, "cyberFirst").programmes.map((p) => p.uniTh)).toEqual(["มข.", "สจล.", "มช."]);
    expect(orderProgrammes(list, "broadFirst")).toMatchObject({ broadFirst: true });
    expect(orderProgrammes(list, "both").programmes[0].uniTh).toBe("มช.");
  });
});

describe("EvidenceMaker", () => {
  test("Markdown includes the fixed lines and the proof picks", () => {
    const md = buildWriteupMarkdown({
      roomTitle: "Offensive Security Intro",
      date: "2026-11-11",
      fields: [
        { label: "ฉันลองอะไร", value: "ลองหาหน้าแอดมิน" },
        { label: "อะไรไม่เวิร์ก", value: "" },
      ],
      fixedLines: ["ทำในแล็บฝึกที่ได้รับอนุญาตเท่านั้น"],
      proof: ["เขียน write-up", "แข่ง CTF"],
    });
    expect(md).toContain("# Write-up: Offensive Security Intro");
    expect(md).toContain("วันที่ (Date): 2026-11-11");
    expect(md).toContain("## ฉันลองอะไร\nลองหาหน้าแอดมิน");
    expect(md).toContain("## อะไรไม่เวิร์ก\n(ยังไม่ได้เขียน)");
    expect(md).toContain("## แผนของฉัน (My plan)\n- เขียน write-up\n- แข่ง CTF");
    expect(md).toContain("> ทำในแล็บฝึกที่ได้รับอนุญาตเท่านั้น");
    expect(md).not.toMatch(/[—–]/);
  });

  test("a clipboard failure falls back", async () => {
    await expect(copyText("x", { writeText: () => Promise.reject(new Error("denied")) })).resolves.toBe("fallback");
    await expect(copyText("x", undefined)).resolves.toBe("fallback");
    await expect(copyText("x", { writeText: () => Promise.resolve() })).resolves.toBe("copied");
  });

  test("local date is YYYY-MM-DD", () => {
    expect(localIsoDate(new Date(2026, 10, 11, 23, 30))).toBe("2026-11-11");
  });
});

describe("RecapCard", () => {
  const played: GuideState = {
    ...emptyProgress(),
    games: {
      "mythos:find": { done: true, attempts: 3, score: 0, total: 1 },
      "triage:queue": { done: true, score: 8, total: 10 },
      "doors:keys": { done: true, skipped: true },
      "terminal:lab": { done: true, score: 5, total: 5 },
    },
    choices: { "triage:x": "1", "triage:y": "7", "terminal:scopeTries": "0" },
  };

  test("only played pages appear", () => {
    expect(wasPlayed(played, "doors")).toBe(false);
    const lines = recapLines(fx.recap, played);
    expect(lines.map((l) => l.pageKey)).toEqual(["mythos", "triage", "terminal"]);
    expect(lines[0].text).toBe("หาบรรทัดอันตรายเจอใน 3 ครั้ง");
    expect(lines[1].text).toBe("จับข้อที่ AI พลาดได้ 1/2");
  });

  test("alternatives pick the first with every value set", () => {
    expect(recapLines(fx.recap, played).find((l) => l.pageKey === "terminal")!.text).toBe(
      "ภารกิจ log 5/5 · ไม่หลุดขอบเขต ✓"
    );
    const tried = { ...played, choices: { ...played.choices, "terminal:scopeTries": "2" } };
    expect(recapLines(fx.recap, tried).find((l) => l.pageKey === "terminal")!.text).toBe("ลองสแกนนอกขอบเขต 2 ครั้ง");
  });

  test("the favourite line comes from the pick, not the scores", () => {
    expect(favouriteOptions(fx.recap, played)).toEqual(["mythos", "triage", "terminal"]);
    // mythos scored 0/1 and triage 8/10, the pick still decides.
    expect(favouriteLine(fx.recap, "mythos")).toBe("สายที่เธอเลือกเอง: นักล่าช่องโหว่");
    expect(favouriteLine(fx.recap, undefined)).toBeNull();
  });

  test("an empty state shows nothing", () => {
    expect(recapLines(fx.recap, emptyProgress())).toEqual([]);
    expect(favouriteOptions(fx.recap, emptyProgress())).toEqual([]);
  });
});
