import type { Metadata } from "next";
import type { ShiftCohort } from "@/lib/content/shift-cohort";

/** Explicit page metadata prevents social crawlers from choosing payment images. */
export function shiftSocialMetadata(
  cohort: ShiftCohort,
  title: string,
  description: string,
  path: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  const image = new URL(
    cohort.bannerSrc ?? `/shift/banners/shift-${cohort.round}.png`,
    "https://passionseed.org",
  ).href;
  return {
    openGraph: {
      title,
      description,
      url: `https://passionseed.org${path}`,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: `${cohort.name} | 7 วัน ปั้น 1 โปรเจกต์จริง` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
