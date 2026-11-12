import type { MetadataRoute } from "next";

import { CANONICAL_ORIGIN } from "@/lib/seo/canonical-origin";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = CANONICAL_ORIGIN;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/admin/",
          "/auth/callback",
          "/app/",
          "/private/",
        ],
      },
      {
        // Explicitly allow AI Answer Engines (AEO) to crawl public knowledge and proof surfaces
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "Perplexity-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "Claude-Web",
          "Google-Extended",
          "Amazonbot",
          "Applebot-Extended",
        ],
        allow: [
          "/",
          "/llms.txt",
          "/llms-full.txt",
          "/shift",
          "/port",
          "/tips",
          "/techseed",
          "/hackathon",
          "/hackathon/gallery",
          "/docs/",
        ],
        disallow: ["/admin/", "/api/admin/", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
