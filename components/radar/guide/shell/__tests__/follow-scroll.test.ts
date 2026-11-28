import { middleDelta } from "../follow-scroll";

describe("middleDelta", () => {
  // Visible area between a 60px rail and a 72px bar on an 800px screen: 60 to 728.
  const top = 60;
  const bottom = 728;

  it("centres a box that fits", () => {
    // Box at 700..800 (centre 750); the area's middle is 394.
    expect(middleDelta({ top: 700, height: 100 }, top, bottom)).toBe(356);
  });

  it("scrolls back up to a box above the middle", () => {
    expect(middleDelta({ top: 100, height: 100 }, top, bottom)).toBe(-244);
  });

  it("lines up something too tall under the rail instead of cutting its top", () => {
    expect(middleDelta({ top: 500, height: 900 }, top, bottom)).toBe(440);
  });
});
