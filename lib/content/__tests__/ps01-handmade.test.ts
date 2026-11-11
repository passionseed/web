import fs from "fs";
import path from "path";
import { BADGE, KEYCHAIN_LEGEND, PIXEL_PALETTE, PRINT_FILES, keychainYarnKey } from "../ps01-handmade";

describe("PS[01] first 10", () => {
  it("ships both print files in public/", () => {
    expect(PRINT_FILES.map((f) => f.id)).toEqual(["front", "back"]);
    for (const f of PRINT_FILES) {
      expect(fs.existsSync(path.join(process.cwd(), "public", f.file))).toBe(true);
    }
  });

  it("keeps the keychain chart square and in palette", () => {
    expect(BADGE).toHaveLength(16);
    BADGE.forEach((r) => expect(r).toHaveLength(16));
    new Set(BADGE.join("").replace(/\./g, "")).forEach((c) => expect(PIXEL_PALETTE[c]).toBeDefined());
  });

  it("maps every keychain pixel to a yarn colour", () => {
    const keys = new Set(KEYCHAIN_LEGEND.map((l) => l.key));
    new Set(BADGE.join("").replace(/\./g, "")).forEach((c) => expect(keys.has(keychainYarnKey(c))).toBe(true));
  });
});
