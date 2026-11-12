import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/security/route-guards";
import type { AdminSearchResponse } from "@/lib/admin/console";
import { normalizeQuery, parseSearchParams, searchAdmin } from "@/lib/supabase/admin-search";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Admin omnisearch for the Cmd+K palette: GET /api/admin/search?q=&types=&limit=.
 * Returns AdminSearchResponse (lib/admin/console.ts). Admin-only, never cached,
 * and the query is never logged: it can be a student's name, email or phone.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    guard.response.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return guard.response;
  }

  const params = new URL(request.url).searchParams;
  const parsed = parseSearchParams(params);
  if (!parsed.ok) {
    // Too short to search yet (e.g. "@b" is one character once the @ is
    // dropped). Not an error: answer with no groups so the palette does not
    // show "search failed" while someone is still typing.
    const empty: AdminSearchResponse = {
      q: normalizeQuery(params.get("q")),
      tookMs: 0,
      partial: false,
      groups: [],
    };
    return NextResponse.json(empty, { headers: NO_STORE });
  }

  try {
    const result = await searchAdmin(createAdminClient(), parsed.value);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Search is unavailable" }, { status: 500, headers: NO_STORE });
  }
}
