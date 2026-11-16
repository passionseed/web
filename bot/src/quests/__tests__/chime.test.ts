import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { chimeEnabled } from "../chime";

describe("chime", () => {
  it("is on unless SHIFT_ROUND_CHIME is off", () => {
    expect(chimeEnabled({})).toBe(true);
    expect(chimeEnabled({ SHIFT_ROUND_CHIME: "on" })).toBe(true);
    expect(chimeEnabled({ SHIFT_ROUND_CHIME: " OFF " })).toBe(false);
  });

  it.each(["focus", "rest"])("ships %s.ogg as Ogg Opus, so no encoder is needed", (kind) => {
    const file = path.join(__dirname, "..", "..", "..", "assets", "sounds", `${kind}.ogg`);
    expect(existsSync(file)).toBe(true);
    const head = readFileSync(file).subarray(0, 64).toString("latin1");
    expect(head.startsWith("OggS")).toBe(true);
    expect(head).toContain("OpusHead");
  });
});
