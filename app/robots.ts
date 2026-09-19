import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://passionseed.org";

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
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
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
