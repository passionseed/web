import { NextRequest, NextResponse } from "next/server";
import { generatePathLabDraft } from "@/lib/ai/pathlab-generator";
import { pathLabGeneratorRequestSchema } from "@/lib/ai/pathlab-generator-schema";
import { isUnsafePathLabPrompt } from "@/lib/ai/pathlab-generator-prompts";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import { hasAdminOrInstructorRole, requireAuth } from "../generate/_auth";

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

    // Generate draft without persisting
    const draft = await generatePathLabDraft(input);
    const validation = validatePathLabDraft(draft);

    // Calculate stats
    const stats = {
      dayCount: draft.days.length,
      nodeCount: draft.nodes.length,
      edgeCount: draft.edges.length,
      assessmentCount: draft.nodes.filter((node) => node.assessment.type !== "none").length,
    };

    console.info("[pathlab.preview] generated", {
      userId: user.id,
      stats,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    });

    return NextResponse.json({
      draft,
      validation,
      stats,
    });
  } catch (error: any) {
    console.error("[pathlab.preview] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate PathLab preview",
      },
      { status: 500 },
    );
  }
}
