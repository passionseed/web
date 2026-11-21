import { islandPng, parseOrientation } from "@/components/hackathon/elemental/island/picture";
import { RenderError } from "@/bot/src/quests/island/scene";
import { ElementalSceneError } from "@/lib/elemental/island/scene";
import { getElementalPublicIsland, resolvePublicEdition } from "@/lib/supabase/elemental";

/**
 * GET /hackathon/island/png: the Elemental island picture, public and signed
 * out. ?layout=portrait|landscape (default landscape), ?edition= one of the
 * public editions (default the event), ?v= only busts caches.
 *
 * 200 image/png, cached 60 s | 503 the island cannot be read | 500 it cannot
 * be drawn. Error bodies are a few plain words; logs carry a code only.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=60";

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const edition = resolvePublicEdition(params.get("edition"));
  const layout = parseOrientation(params.get("layout"));

  const island = await getElementalPublicIsland(edition);
  if (!island) return text(503, "unavailable");

  try {
    const png = islandPng(island, layout);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: { "Cache-Control": CACHE, "Content-Type": "image/png", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const code =
      error instanceof ElementalSceneError || error instanceof RenderError
        ? `${error.name}:${error.code}`
        : `unexpected:${error instanceof Error ? error.name : "unknown"}`;
    console.error(`[elemental-island] picture failed: ${code}`);
    return text(500, "picture failed");
  }
}
