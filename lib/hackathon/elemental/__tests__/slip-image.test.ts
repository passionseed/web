import { fitWithin, MAX_SLIP_BYTES, slipNeedsShrink } from "@/lib/hackathon/elemental/slip-image";

describe("slip images before upload", () => {
  it("passes a normal bank slip through untouched", () => {
    expect(slipNeedsShrink("image/jpeg", 400 * 1024)).toBe(false);
    expect(slipNeedsShrink("image/png", 2 * 1024 * 1024)).toBe(false);
  });

  it("re-encodes big screenshots and files without a known type", () => {
    expect(slipNeedsShrink("image/png", 4.6 * 1024 * 1024)).toBe(true);
    expect(slipNeedsShrink("", 300 * 1024)).toBe(true);
    expect(slipNeedsShrink("image/heic", 1024 * 1024)).toBe(true);
  });

  it("keeps the server limit under Vercel's 4.5 MB request body limit", () => {
    expect(MAX_SLIP_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });

  it("shrinks the long edge to 2000px and never scales up", () => {
    expect(fitWithin(1440, 3200)).toEqual({ width: 900, height: 2000 });
    expect(fitWithin(3000, 1500)).toEqual({ width: 2000, height: 1000 });
    expect(fitWithin(1080, 1920)).toEqual({ width: 1080, height: 1920 });
  });
});
