import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import {
  getPathLabDraftSnapshot,
  snapshotToDraft,
} from "@/lib/pathlab/generation-persistence";
import { canManagePathLabSeed, requireAuth } from "../_auth";

const validateRequestSchema = z.object({
  seedId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsedBody = validateRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { seedId } = parsedBody.data;

    const allowed = await canManagePathLabSeed(supabase, user, seedId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await getPathLabDraftSnapshot(seedId);
    const draft = snapshotToDraft(snapshot);
    const quality = validatePathLabDraft(draft);

    return NextResponse.json({
      valid: quality.valid,
      errors: quality.errors,
      warnings: quality.warnings,
      issues: quality.issues,
      summary: {
        dayCount: draft.days.length,
        nodeCount: draft.nodes.length,
        edgeCount: draft.edges.length,
        errorCount: quality.errors.length,
        warningCount: quality.warnings.length,
      },
    });
  } catch (error: any) {
    console.error("[pathlab.generate.validate] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to validate PathLab draft",
      },
      { status: 500 },
    );
  }
}
