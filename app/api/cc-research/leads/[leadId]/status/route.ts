import { NextRequest, NextResponse } from "next/server";
import { leadStatusTransitionSchema } from "@/lib/cc-research/schema";
import { updateCcLeadStatus } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { leadId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = leadStatusTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await updateCcLeadStatus(leadId, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update lead status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
