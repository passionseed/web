/** @jest-environment node */
import { QUIZ_ELEMENTS } from "@/lib/hackathon/elemental/quiz";
import { QUIZ_OG_SIZE, renderQuizOg, renderQuizStory } from "../elemental-quiz";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("Elemental quiz cards", () => {
  it.each(QUIZ_ELEMENTS)("draws the %s story card at 1080x1920", (el) => {
    const png = renderQuizStory(el);
    expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(pngSize(png)).toEqual({ width: 1080, height: 1920 });
  });

  it.each(QUIZ_ELEMENTS)("draws the %s link preview at 1200x630", (el) => {
    const png = renderQuizOg(el);
    expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(pngSize(png)).toEqual(QUIZ_OG_SIZE);
  });
});
