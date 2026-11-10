import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { canvasChatRequestSchema, MAX_CONTEXT_CHARS } from "@/lib/shift/canvas-chat";
import { streamCanvasAnswer } from "@/lib/shift/canvas-claude";
import { canvasContext } from "@/lib/supabase/shift-canvases";

// Fluid compute (vercel.json) gives Hobby up to 300 seconds; a long answer at medium effort fits well inside.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/shift/canvases/chat: asks Claude about one SHIFT canvas or
 * all of them. Site admins only. The canvases come from the database, never
 * from the request, and the answer streams back as plain text.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = canvasChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 503 });
  }

  try {
    const context = await canvasContext(parsed.data.scope);
    if (!context) return NextResponse.json({ error: "That canvas no longer exists." }, { status: 404 });
    if (context.count === 0) return NextResponse.json({ error: "There are no SHIFT canvases yet." }, { status: 404 });
    if (context.markdown.length > MAX_CONTEXT_CHARS) {
      return NextResponse.json(
        { error: `${context.count} canvases are too much to read at once. Open one canvas and ask there.` },
        { status: 413 },
      );
    }
    return new Response(streamCanvasAnswer(context.markdown, parsed.data.messages), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return safeServerError("Could not read the canvases", error);
  }
}
