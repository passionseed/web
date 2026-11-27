import {
  BOARD_NAME_MAX,
  checkBoardName,
  checkStyleSave,
  clampStyle,
  contrastRatio,
  DEFAULT_STYLE,
  lockedChoices,
  NAME_COLORS,
  NAME_EFFECTS,
  NAME_FONTS,
  NAME_PAIRS,
  nameStyleCss,
  nextUnlock,
  offsetShadowColor,
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
    expect(lockedChoices({ ...DEFAULT_STYLE, font: "sriracha" }, TEAM_STYLE_TIERS.color)).toEqual(["font"]);
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

  it("has no free second colour: a gradient is one of the four set pairs", () => {
    expect(parseStyle({ ...FULL, color2: "aether" })).toBeNull();
    expect(NAME_PAIRS.map((p) => `${p.id}:${p.from}>${p.to}`)).toEqual(["fire:ember>amber", "river:water>leaf", "dusk:aether>rose", "soil:earth>flame"]);
    expect(nameStyleCss(FULL).backgroundImage).toBe(`linear-gradient(90deg, ${pairColors("river").join(", ")})`);
    expect(nameStyleCss(FULL, "paper").backgroundImage).toBe(`linear-gradient(90deg, ${pairColors("river", "paper").join(", ")})`);
  });

  it("refuses the fonts and effects that left the lists", () => {
    for (const font of ["charm", "kodchasan", "itim", "mitr", "kanit"]) expect(parseStyle({ ...FULL, font })).toBeNull();
    for (const effect of ["pop", "outline"]) expect(parseStyle({ ...FULL, effect })).toBeNull();
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

  it("moves a saved font or effect that left the lists to its nearest replacement, not to the default", () => {
    expect(readStyle({ ...FULL, font: "charm" }).font).toBe("trirong-italic");
    expect(readStyle({ ...FULL, font: "kodchasan" }).font).toBe("chakra");
    expect(readStyle({ ...FULL, font: "itim" }).font).toBe("sriracha");
    expect(readStyle({ ...FULL, effect: "pop" }).effect).toBe("offset");
    expect(readStyle({ ...FULL, effect: "outline" }).effect).toBe("solid");
    expect(readStyle({ ...FULL, font: "Comic Sans" }).font).toBe(DEFAULT_STYLE.font);
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
  it("only ever uses colours and fonts from the lists, in the surface's variant", () => {
    expect(nameStyleCss(DEFAULT_STYLE, "paper")).toMatchObject({ color: "#1d211f", fontFamily: NAME_FONTS[0].family, fontStyle: "normal" });
    expect(nameStyleCss(DEFAULT_STYLE)).toMatchObject({ color: "#f3efe6" });
    expect(nameStyleCss({ ...DEFAULT_STYLE, font: "trirong-italic" })).toMatchObject({ fontStyle: "italic", fontWeight: 300 });
  });

  it("offsets with a hard shadow: water under warm colours, ember under cool ones", () => {
    const shadow = (color: (typeof NAME_COLORS)[number]["id"], surface: "ground" | "paper") =>
      nameStyleCss({ ...DEFAULT_STYLE, color, effect: "offset" }, surface).textShadow;
    expect(shadow("flame", "paper")).toBe("0.05em 0.05em 0 #38c9c2");
    expect(shadow("water", "paper")).toBe("0.05em 0.05em 0 #b8301a");
    expect(shadow("ember", "ground")).toBe(`0.05em 0.05em 0 ${offsetShadowColor("ember")}`);
    // No blur anywhere: three lengths, then the colour.
    for (const c of NAME_COLORS) expect(shadow(c.id, "ground")).toMatch(/^0\.05em 0\.05em 0 #[0-9a-f]{6}$/);
  });

  it("reads on both surfaces: 4.5:1 on the dark ground, 3.5:1 on cream, gradient ends included", () => {
    for (const c of NAME_COLORS) {
      expect(contrastRatio(c.dark, "#0c0d0c")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.hex, "#f3efe6")).toBeGreaterThanOrEqual(3.5);
    }
    for (const p of NAME_PAIRS) {
      for (const end of pairColors(p.id, "ground")) expect(contrastRatio(end, "#0c0d0c")).toBeGreaterThanOrEqual(4.5);
      for (const end of pairColors(p.id, "paper")) expect(contrastRatio(end, "#f3efe6")).toBeGreaterThanOrEqual(3.5);
    }
  });

  it("keeps six distinct voices and four effects, and never loads a banned font", () => {
    expect(NAME_FONTS.map((f) => f.id)).toEqual(["trirong", "trirong-italic", "chakra", "chonburi", "sriracha", "pattaya"]);
    expect(NAME_EFFECTS.map((e) => e.id)).toEqual(["solid", "marker", "offset", "gradient"]);
    const labels = NAME_FONTS.map((f) => f.label.toLowerCase());
    for (const banned of ["mitr", "kanit", "charm", "kodchasan", "itim"]) expect(labels.join(" ")).not.toContain(banned);
  });
});
