import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { transformExpertDataToPathLabRequest } from "@/lib/expert-interview/pathlab-transformer";
import { generatePathLabDraft } from "@/lib/ai/pathlab-generator";
import { createPathLabDraftFromGeneration } from "@/lib/pathlab/generation-persistence";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import { z } from "zod";

const approveSchema = z.object({
  adminNotes: z.string().max(2000).optional(),
  generatePathLab: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase, userId } = admin.value;
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { adminNotes, generatePathLab } = parsed.data;

    // Fetch the expert profile
    const { data: expert, error: fetchError } = await supabase
      .from("expert_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !expert) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    // Update status to approved
    const { error: updateError } = await supabase
      .from("expert_profiles")
      .update({
        status: "approved",
        admin_notes: adminNotes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq("id", id);

    if (updateError) {
      return safeServerError("Failed to approve expert", updateError);
    }

    if (!generatePathLab) {
      return NextResponse.json({ success: true, pathlabGenerated: false });
    }

    // Create pathlab record with pending status
    const { data: pathlabRecord, error: pathlabInsertError } = await supabase
      .from("expert_pathlabs")
      .insert({
        expert_profile_id: id,
        generation_status: "generating",
      })
      .select("id")
      .single();

    if (pathlabInsertError) {
      console.error("[approve] failed to create pathlab record", pathlabInsertError);
      return NextResponse.json({ success: true, pathlabGenerated: false, warning: "PathLab record creation failed" });
    }

    try {
      const pathlabInput = transformExpertDataToPathLabRequest(
        expert.interview_data,
        { name: expert.name, title: expert.title, company: expert.company }
      );

      const draft = await generatePathLabDraft(pathlabInput);
      const quality = validatePathLabDraft(draft);

      if (!quality.valid) {
        await supabase
          .from("expert_pathlabs")
          .update({
            generation_status: "failed",
            generation_error: "Draft validation failed: " + quality.issues.map((i) => i.message).join(", "),
          })
          .eq("id", pathlabRecord.id);

        return NextResponse.json({ success: true, pathlabGenerated: false, warning: "PathLab generation failed validation" });
      }

      const persisted = await createPathLabDraftFromGeneration({
        userId,
        request: pathlabInput,
        draft,
      });

      await supabase
        .from("expert_pathlabs")
        .update({
          generation_status: "completed",
          seed_id: persisted.seedId,
          path_id: persisted.pathId,
          generated_at: new Date().toISOString(),
        })
        .eq("id", pathlabRecord.id);

      return NextResponse.json({
        success: true,
        pathlabGenerated: true,
        seedId: persisted.seedId,
        mapId: persisted.mapId,
        pathId: persisted.pathId,
      });
    } catch (genError) {
      console.error("[approve] pathlab generation failed", genError);

      await supabase
        .from("expert_pathlabs")
        .update({
          generation_status: "failed",
          generation_error: genError instanceof Error ? genError.message : "Unknown error",
        })
        .eq("id", pathlabRecord.id);

      return NextResponse.json({
        success: true,
        pathlabGenerated: false,
        warning: "PathLab generation failed, expert approved",
      });
    }
  } catch (error) {
    return safeServerError("Failed to approve expert", error);
  }
}
