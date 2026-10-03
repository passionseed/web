import { existsSync } from "node:fs";
import path from "node:path";
import { SHIFT_COHORTS, cohortPath } from "@/lib/content/shift-cohort";
import { shiftSocialMetadata } from "@/lib/shift/socialMetadata";

test.each(SHIFT_COHORTS)("$name shares its own banner with an absolute image URL", (cohort) => {
  const image = `https://passionseed.org${cohort.bannerSrc}`;
  const metadata = shiftSocialMetadata(cohort, cohort.name, "Description", cohortPath(cohort));
  expect(metadata.openGraph).toMatchObject({
    url: `https://passionseed.org${cohortPath(cohort)}`,
    images: [{ url: image, width: 1200, height: 630 }],
  });
  expect(metadata.twitter).toMatchObject({ card: "summary_large_image", images: [image] });
  expect(existsSync(path.join(process.cwd(), "public", cohort.bannerSrc!))).toBe(true);
});
