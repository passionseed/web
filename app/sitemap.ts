import type { MetadataRoute } from "next";

import { SHIFT_COHORTS, cohortPath } from "@/lib/content/shift-cohort";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://passionseed.org";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shift`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...SHIFT_COHORTS.map((cohort) => ({
      url: `${baseUrl}${cohortPath(cohort)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    {
      url: `${baseUrl}/techseed`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hackathon`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hackathon/gallery`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/impact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/hackathon/sponsor`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
