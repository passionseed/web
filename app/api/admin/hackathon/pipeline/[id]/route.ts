import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { actorFor, pipelineUpdateSchema } from "@/lib/hackathon/elemental/pipeline";
import { invalidInput, pipelineNotSetUp, ruleBroken } from "@/lib/hackathon/elemental/pipeline-responses";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  deletePipelineItem,
  PipelineNotSetUpError,
  PipelineRuleError,
  updatePipelineItem,
} from "@/lib/supabase/hackathon-pipeline";

type Context = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** Change any field of one pipeline item, including its stage. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return notFound();
  const parsed = pipelineUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    // Who saved comes from the signed-in admin, never from the browser.
    const updated_by = actorFor(admin.value.userId, process.env.HACKATHON_OWNER_USER_IDS);
    const item = await updatePipelineItem(ELEMENTAL.slug, id, { ...parsed.data, updated_by });
    return item ? NextResponse.json({ item }) : notFound();
  } catch (error) {
    if (error instanceof PipelineRuleError) return ruleBroken(error.message);
    if (error instanceof PipelineNotSetUpError) return pipelineNotSetUp();
    return safeServerError("Failed to update pipeline item", error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return notFound();

  try {
    return (await deletePipelineItem(ELEMENTAL.slug, id)) ? NextResponse.json({ ok: true }) : notFound();
  } catch (error) {
    if (error instanceof PipelineNotSetUpError) return pipelineNotSetUp();
    return safeServerError("Failed to delete pipeline item", error);
  }
}
