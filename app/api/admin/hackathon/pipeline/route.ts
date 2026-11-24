import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { actorFor, pipelineCreateSchema } from "@/lib/hackathon/elemental/pipeline";
import { invalidInput, pipelineNotSetUp } from "@/lib/hackathon/elemental/pipeline-responses";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  createPipelineItem,
  listPipeline,
  PipelineNotSetUpError,
} from "@/lib/supabase/hackathon-pipeline";

export const dynamic = "force-dynamic";

/** Every sponsor, partner and speaker in the Elemental pipeline. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    return NextResponse.json({ items: await listPipeline(ELEMENTAL.slug) });
  } catch (error) {
    if (error instanceof PipelineNotSetUpError) return pipelineNotSetUp();
    return safeServerError("Failed to load pipeline", error);
  }
}

/** Add one sponsor, partner or speaker. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = pipelineCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    // Who saved comes from the signed-in admin, never from the browser.
    const updated_by = actorFor(admin.value.userId, process.env.HACKATHON_OWNER_USER_IDS);
    const item = await createPipelineItem(ELEMENTAL.slug, { ...parsed.data, updated_by }, admin.value.userId);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof PipelineNotSetUpError) return pipelineNotSetUp();
    return safeServerError("Failed to add to pipeline", error);
  }
}
