import fs from "node:fs";
import path from "node:path";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import {
  ELEMENT_CHAPTERS,
  ELEMENT_SCRUB_FRAME_COUNT,
  KEY_VISUAL_MEDIA,
  TEASER_MEDIA,
  elementFrameUrl,
} from "../media";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const ELEMENTAL_DIR = path.join(process.cwd(), "components/hackathon/elemental");

function assertPublicAssetExists(publicUrl: string) {
  const fullPath = path.join(PUBLIC_DIR, publicUrl.replace(/^\//, ""));
  expect(fs.existsSync(fullPath)).toBe(true);
}

describe("Elemental cinematic media manifest", () => {
  it("references existing files in public/ for all key visual assets", () => {
    for (const url of Object.values(KEY_VISUAL_MEDIA)) {
      assertPublicAssetExists(url);
    }
  });

  it("references existing 4:5 and 9:16 teaser videos and posters", () => {
    for (const url of Object.values(TEASER_MEDIA)) {
      assertPublicAssetExists(url);
    }
  });

  it("covers all five canonical elements with videos, stills, and all 36 scroll-scrub WebP frames", () => {
    const canonicalKeys = new Set(ELEMENTAL.elements.map((e) => e.key));
    const chapterKeys = new Set(ELEMENT_CHAPTERS.map((c) => c.key));
    expect(chapterKeys).toEqual(canonicalKeys);

    for (const chapter of ELEMENT_CHAPTERS) {
      assertPublicAssetExists(chapter.video);
      assertPublicAssetExists(chapter.before);
      assertPublicAssetExists(chapter.after);
      for (let i = 1; i <= ELEMENT_SCRUB_FRAME_COUNT; i++) {
        assertPublicAssetExists(elementFrameUrl(chapter.key, i));
      }
    }
  });

  it("uses the Thai element names from facts.ts, so the page and the posters say the same thing", () => {
    for (const chapter of ELEMENT_CHAPTERS) {
      const fact = ELEMENTAL.elements.find((e) => e.key === chapter.key);
      expect(chapter.th).toBe(fact?.th);
    }
  });

  it("contains no em dashes in user-facing copy", () => {
    const strings: string[] = ELEMENT_CHAPTERS.flatMap((c) => [
      c.th,
      c.subtitleTh,
      c.whatHappensTh,
      c.examplesTh,
    ]);
    for (const text of strings) {
      expect(text).not.toContain("—");
    }
  });

  it("keeps the landing components free of rounded SaaS chrome, backdrop-blur, and 'พิกเซล' copy", () => {
    const landingFiles = [
      "ElementalHero.tsx",
      "ScrollHookStatement.tsx",
      "TeaserTheater.tsx",
      "ElementalPlacesShowcase.tsx",
      "BeginnerJourneySection.tsx",
      "ElementalExperience.tsx",
    ];
    for (const file of landingFiles) {
      const source = fs.readFileSync(path.join(ELEMENTAL_DIR, file), "utf8");
      expect(source).not.toMatch(/\brounded-/);
      expect(source).not.toMatch(/\bbackdrop-blur/);
      expect(source).not.toContain("พิกเซล");
    }
  });
});
