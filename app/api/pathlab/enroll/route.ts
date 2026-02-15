import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createOrResumePathEnrollment,
  getPathBySeedId,
  upsertMapEnrollmentForSeed,
} from "@/lib/supabase/pathlab";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Enroll API called");
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    console.log("👤 User authenticated:", user.id);

    const body = await request.json();
    const seedId = body?.seedId as string | undefined;
    const whyJoined = (body?.whyJoined as string | undefined)?.trim();
    const restart = body?.restart === true;

    console.log("📋 Request body:", { seedId, restart });

    if (!seedId) {
      console.error("❌ Missing seedId");
      return NextResponse.json({ error: "seedId is required" }, { status: 400 });
    }

    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .select("id, map_id, seed_type")
      .eq("id", seedId)
      .single();

    if (seedError || !seed) {
      return NextResponse.json({ error: "Seed not found" }, { status: 404 });
    }

    if (seed.seed_type !== "pathlab") {
      return NextResponse.json({ error: "Seed is not a PathLab seed" }, { status: 400 });
    }

    const path = await getPathBySeedId(seedId);
    if (!path) {
      return NextResponse.json({ error: "Path configuration not found" }, { status: 404 });
    }

    let enrollment;

    if (restart) {
      console.log("🔄 Restart mode - resetting enrollment");
      // For restart, update existing enrollment to reset progress
      const { data: existing, error: existingError } = await supabase
        .from("path_enrollments")
        .select("id, status, current_day")
        .eq("user_id", user.id)
        .eq("path_id", path.id)
        .maybeSingle();

      if (existingError) {
        console.error("❌ Error finding existing enrollment:", existingError);
        throw new Error(existingError.message);
      }

      console.log("📊 Existing enrollment:", existing);

      if (existing) {
        console.log("♻️ Resetting existing enrollment:", existing.id);

        // Reset the enrollment
        const { data: updated, error: updateError } = await supabase
          .from("path_enrollments")
          .update({
            current_day: 1,
            status: "active",
            completed_at: null,
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (updateError) {
          console.error("❌ Error updating enrollment:", updateError);
          throw new Error(updateError.message);
        }

        console.log("✅ Enrollment reset:", updated);

        // Delete all reflections for this enrollment
        console.log("🗑️ Deleting reflections...");
        await supabase.from("path_reflections").delete().eq("enrollment_id", existing.id);
        await supabase.from("path_exit_reflections").delete().eq("enrollment_id", existing.id);
        await supabase.from("path_end_reflections").delete().eq("enrollment_id", existing.id);

        // Delete all node progress for nodes in this path's map
        console.log("🗑️ Deleting node progress...");
        const { data: pathDays } = await supabase
          .from("path_days")
          .select("node_ids")
          .eq("path_id", path.id);

        if (pathDays && pathDays.length > 0) {
          const allNodeIds = pathDays.flatMap(day => day.node_ids || []);
          if (allNodeIds.length > 0) {
            const { error: progressError } = await supabase
              .from("student_node_progress")
              .delete()
              .eq("user_id", user.id)
              .in("node_id", allNodeIds);

            if (progressError) {
              console.error("⚠️ Error deleting node progress:", progressError);
            } else {
              console.log("✅ Deleted progress for", allNodeIds.length, "nodes");
            }
          }
        }

        enrollment = updated;
      } else {
        console.log("➕ No existing enrollment, creating new one");
        // No existing enrollment, create new one
        enrollment = await createOrResumePathEnrollment({
          userId: user.id,
          pathId: path.id,
          whyJoined: whyJoined || null,
        });
        console.log("✅ New enrollment created:", enrollment);
      }
    } else {
      console.log("📝 Normal enrollment (not restart)");
      enrollment = await createOrResumePathEnrollment({
        userId: user.id,
        pathId: path.id,
        whyJoined: whyJoined || null,
      });
      console.log("✅ Enrollment:", enrollment);
    }

    await upsertMapEnrollmentForSeed(user.id, seed.map_id);

    console.log("✅ Enrollment successful, returning:", enrollment.id);
    return NextResponse.json({
      success: true,
      enrollment,
    });
  } catch (error: any) {
    console.error("💥 Enroll API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enroll in path" },
      { status: 500 }
    );
  }
}
