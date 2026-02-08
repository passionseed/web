import { NextRequest, NextResponse } from "next/server";
import {
  generatePathLabDraft,
} from "@/lib/ai/pathlab-generator";
import { pathLabGeneratorRequestSchema } from "@/lib/ai/pathlab-generator-schema";
import { isUnsafePathLabPrompt } from "@/lib/ai/pathlab-generator-prompts";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import { createPathLabDraftFromGeneration } from "@/lib/pathlab/generation-persistence";
import { hasAdminOrInstructorRole, requireAuth } from "./_auth";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const roleAllowed = await hasAdminOrInstructorRole(supabase, user.id);
    if (!roleAllowed) {
      return NextResponse.json(
        { error: "Forbidden - admin or instructor role required" },
        { status: 403 },
      );
    }

    const rawBody = await request.json();
    const parsedBody = pathLabGeneratorRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parsedBody.data;

    if (isUnsafePathLabPrompt({ topic: input.topic, constraints: input.constraints })) {
      return NextResponse.json(
        {
          error: "Topic or constraints are blocked by safety policy",
        },
        { status: 400 },
      );
    }

    const draft = await generatePathLabDraft(input);
    const quality = validatePathLabDraft(draft);

    if (!quality.valid) {
      return NextResponse.json(
        {
          error: "Generated draft failed validation",
          issues: quality.issues,
        },
        { status: 422 },
      );
    }

    const persisted = await createPathLabDraftFromGeneration({
      userId: user.id,
      request: input,
      draft,
    });

    console.info("[pathlab.generate] success", {
      userId: user.id,
      seedId: persisted.seedId,
      mapId: persisted.mapId,
      pathId: persisted.pathId,
      dayCount: persisted.dayCount,
      nodeCount: persisted.nodeCount,
      warningCount: quality.warnings.length,
    });

    return NextResponse.json({
      seedId: persisted.seedId,
      mapId: persisted.mapId,
      pathId: persisted.pathId,
      dayCount: persisted.dayCount,
      nodeCount: persisted.nodeCount,
      warnings: quality.warnings.map((warning) => warning.message),
    });
  } catch (error: any) {
    console.error("[pathlab.generate] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate PathLab draft",
      },
      { status: 500 },
    );
  }
}
