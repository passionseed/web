import { adminRouteFromSegments } from "@/lib/admin/metadata";
import { copyForRoute } from "@/lib/og/copy";
import { renderPoster } from "@/lib/og/poster";

export const runtime = "nodejs";

/** Poster for an admin link preview. Copy is public; unknown slugs get the admin fallback. */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("route") ?? "/admin";
  const route = adminRouteFromSegments(requested.split("/").slice(2));
  const response = await renderPoster(copyForRoute(route));
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return response;
}
