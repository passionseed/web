import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { actorFor, pipelineImportSchema } from "@/lib/hackathon/elemental/pipeline";
import { invalidInput, pipelineNotSetUp } from "@/lib/hackathon/elemental/pipeline-responses";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { importPipelineItems, PipelineNotSetUpError } from "@/lib/supabase/hackathon-pipeline";

/**
 * Add many rows at once, from the "Paste list" dialog. All or nothing for
 * the new rows; rows already on the board are skipped and counted.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = pipelineImportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    // Who saved comes from the signed-in admin, never from the browser.
    const updated_by = actorFor(admin.value.userId, process.env.HACKATHON_OWNER_USER_IDS);
    const rows = parsed.data.rows.map((r) => ({ ...r, updated_by }));
    const { items, skipped } = await importPipelineItems(ELEMENTAL.slug, rows, admin.value.userId);
    return NextResponse.json({ items, skipped }, { status: 201 });
  } catch (error) {
    if (error instanceof PipelineNotSetUpError) return pipelineNotSetUp();
    return safeServerError("Failed to import pipeline rows", error);
  }
}
