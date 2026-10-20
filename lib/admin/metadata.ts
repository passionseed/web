import type { Metadata } from "next";
import { copyForRoute } from "@/lib/og/copy";

/** Readable names for admin pages; others fall back to their poster title. */
const ADMIN_TITLES: Record<string, string> = {
  "/admin": "Overview",
  "/admin/shift": "SHIFT Tracker",
  "/admin/shift/applications": "SHIFT Applications",
  "/admin/shift/camp": "SHIFT Interactive Camp",
  "/admin/shift/companion": "SHIFT Companion",
  "/admin/shift/seedstack": "SHIFT SeedStack",
  "/admin/shift/feedback": "SHIFT Feedback",
  "/admin/shift/alumni": "SHIFT Alumni",
  "/admin/shift/alumni/board": "SHIFT Alumni Board",
  "/admin/shift/views": "SHIFT Page Views",
};

function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Link-preview text for a team-only page. The description reuses the poster
 * caption, so the card text and the image never disagree.
 */
export function adminMetadata(route: string): Metadata {
  const copy = copyForRoute(route);
  const title = ADMIN_TITLES[route] ?? titleCase(copy.title);
  return {
    title,
    description: copy.subtitle,
    openGraph: { title: `${title} | PassionSeed Admin`, description: copy.subtitle, siteName: "PassionSeed" },
  };
}

/**
 * The admin route a preview stands for. Only slug segments survive, so record
 * IDs in a pasted link never reach the card or the poster.
 */
export function adminRouteFromSegments(segments: string[] = []): string {
  return ["/admin", ...segments.filter((s) => /^[a-z][a-z-]*$/.test(s))].join("/");
}

/** Live poster for an admin route, served from a public API route. */
export function adminPosterUrl(route: string): string {
  return `/api/og/admin?route=${encodeURIComponent(route)}`;
}
