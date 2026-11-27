import {
  BOARD_NAME_MAX,
  checkBoardName,
  checkStyleSave,
  clampStyle,
  DEFAULT_STYLE,
  lockedChoices,
  NAME_COLORS,
  NAME_FONTS,
  NAME_PAIRS,
  nameStyleCss,
  nextUnlock,
  pairColors,
  parseStyle,
  readStyle,
  TEAM_STYLE_TIERS,
  unlockedParts,
  type TeamNameStyle,
} from "../team-style";

const FULL: TeamNameStyle = { font: "chakra", color: "water", effect: "gradient", pair: "river" };

describe("team name style tiers", () => {
  it("unlocks colours, then fonts, then effects as devices grow", () => {
    expect(TEAM_STYLE_TIERS.color).toBeLessThan(TEAM_STYLE_TIERS.font);
    expect(TEAM_STYLE_TIERS.font).toBeLessThan(TEAM_STYLE_TIERS.effect);
    expect(unlockedParts(0)).toEqual({ color: false, font: false, effect: false });
    expect(unlockedParts(TEAM_STYLE_TIERS.color - 1)).toEqual({ color: false, font: false, effect: false });
    expect(unlockedParts(TEAM_STYLE_TIERS.color)).toEqual({ color: true, font: false, effect: false });
    expect(unlockedParts(TEAM_STYLE_TIERS.font)).toEqual({ color: true, font: true, effect: false });
    expect(unlockedParts(TEAM_STYLE_TIERS.effect)).toEqual({ color: true, font: true, effect: true });
  });

  it("says what unlocks next and how far away it is", () => {
    expect(nextUnlock(0)).toEqual({ part: "color", at: TEAM_STYLE_TIERS.color, left: TEAM_STYLE_TIERS.color });
    expect(nextUnlock(TEAM_STYLE_TIERS.color + 2)).toEqual({
      part: "font",
      at: TEAM_STYLE_TIERS.font,
      left: TEAM_STYLE_TIERS.font - TEAM_STYLE_TIERS.color - 2,
    });
    expect(nextUnlock(TEAM_STYLE_TIERS.effect)).toBeNull();
    expect(nextUnlock(TEAM_STYLE_TIERS.effect + 100)).toBeNull();
  });

  it("lists only the changed parts that are still locked", () => {
    expect(lockedChoices(DEFAULT_STYLE, 0)).toEqual([]);
    expect(lockedChoices(FULL, 0)).toEqual(["color", "font", "effect"]);
    expect(lockedChoices(FULL, TEAM_STYLE_TIERS.font)).toEqual(["effect"]);
    expect(lockedChoices({ ...DEFAULT_STYLE, font: "itim" }, TEAM_STYLE_TIERS.color)).toEqual(["font"]);
    expect(lockedChoices(FULL, TEAM_STYLE_TIERS.effect)).toEqual([]);
  });

  it("shows a style only as far as the team has unlocked it", () => {
    expect(clampStyle(FULL, 0)).toEqual(DEFAULT_STYLE);
    expect(clampStyle(FULL, TEAM_STYLE_TIERS.color)).toEqual({ ...DEFAULT_STYLE, color: "water" });
    expect(clampStyle(FULL, TEAM_STYLE_TIERS.font)).toEqual({ ...DEFAULT_STYLE, color: "water", font: "chakra" });
    expect(clampStyle(FULL, TEAM_STYLE_TIERS.effect)).toEqual(FULL);
  });
});

describe("team name style validation", () => {
  it("accepts only choices from the fixed lists", () => {
    expect(parseStyle(FULL)).toEqual(FULL);
    expect(parseStyle({ font: "trirong", color: "ink", effect: "solid" })).toEqual(DEFAULT_STYLE);
    expect(parseStyle({ ...FULL, font: "Comic Sans" })).toBeNull();
    expect(parseStyle({ ...FULL, color: "#ff00ff" })).toBeNull();
    expect(parseStyle({ ...FULL, effect: "glow" })).toBeNull();
    expect(parseStyle({ ...FULL, pair: "rainbow" })).toBeNull();
  });

  it("has no free second colour: a gradient is one of the set pairs", () => {
    expect(parseStyle({ ...FULL, color2: "aether" })).toBeNull();
    expect(NAME_PAIRS.length).toBeGreaterThanOrEqual(3);
    expect(NAME_PAIRS.length).toBeLessThanOrEqual(4);
    // No pair crosses the wheel to violet (the orange-to-purple look).
    expect(NAME_PAIRS.some((p) => [p.from, p.to].includes("aether" as never))).toBe(false);
    expect(nameStyleCss(FULL).backgroundImage).toBe(`linear-gradient(90deg, ${pairColors("river").join(", ")})`);
  });

  it("turns away free-form CSS, extra keys and non-objects", () => {
    expect(parseStyle({ ...FULL, css: "color:red" })).toBeNull();
    expect(parseStyle({ ...FULL, font: "chakra; background:url(x)" })).toBeNull();
    expect(parseStyle(null)).toBeNull();
    expect(parseStyle("chakra")).toBeNull();
    expect(parseStyle([FULL])).toBeNull();
  });

  it("refuses a save that uses a locked part, and says which", () => {
    expect(checkStyleSave(FULL, TEAM_STYLE_TIERS.font)).toEqual({ ok: false, error: "locked", parts: ["effect"] });
    expect(checkStyleSave({ ...FULL, effect: "solid" }, TEAM_STYLE_TIERS.font)).toEqual({
      ok: true,
      style: { ...FULL, effect: "solid", pair: DEFAULT_STYLE.pair },
    });
    expect(checkStyleSave(FULL, TEAM_STYLE_TIERS.effect)).toEqual({ ok: true, style: FULL });
    expect(checkStyleSave({ font: "nope" }, 999)).toEqual({ ok: false, error: "invalid" });
    expect(checkStyleSave(DEFAULT_STYLE, 0)).toEqual({ ok: true, style: DEFAULT_STYLE });
  });

  it("reads anything stored back as a safe style, old second colours included", () => {
    expect(readStyle(null)).toEqual(DEFAULT_STYLE);
    expect(readStyle({ font: "chakra", color: "javascript:alert(1)" })).toEqual({ ...DEFAULT_STYLE, font: "chakra" });
    expect(readStyle({ ...FULL, color2: "aether" })).toEqual(FULL);
  });
});

describe("board names", () => {
  it("must be typed, short and clean", () => {
    expect(checkBoardName("  ไฟ   ป่า ")).toEqual({ ok: true, name: "ไฟ ป่า" });
    expect(checkBoardName("")).toEqual({ ok: false, error: "empty" });
    expect(checkBoardName("   ")).toEqual({ ok: false, error: "empty" });
    expect(checkBoardName(null)).toEqual({ ok: false, error: "empty" });
    expect(checkBoardName("ก".repeat(BOARD_NAME_MAX + 1))).toEqual({ ok: false, error: "long" });
    expect(checkBoardName("ก".repeat(BOARD_NAME_MAX)).ok).toBe(true);
    expect(checkBoardName("f.u.c.k team")).toEqual({ ok: false, error: "rude" });
  });
});

describe("team name style CSS", () => {
  it("only ever uses colours and fonts from the lists", () => {
    expect(nameStyleCss(DEFAULT_STYLE)).toMatchObject({ color: "#1d211f", fontFamily: NAME_FONTS[0].family });
    const water = NAME_COLORS.find((c) => c.id === "water")!.hex;
    expect(nameStyleCss({ ...FULL, effect: "pop" }).textShadow).toBe("0.06em 0.06em 0 rgba(14,116,112,0.28)");
    expect(nameStyleCss({ ...FULL, effect: "outline" }).WebkitTextStroke).toContain(water);
  });

  it("never loads a banned font", () => {
    const labels = NAME_FONTS.map((f) => f.label.toLowerCase());
    expect(labels).not.toContain("mitr");
    expect(labels).not.toContain("kanit");
  });
});
