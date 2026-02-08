import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createOrResumePathEnrollment,
  getPathBySeedId,
  upsertMapEnrollmentForSeed,
} from "@/lib/supabase/pathlab";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const seedId = body?.seedId as string | undefined;
    const whyJoined = (body?.whyJoined as string | undefined)?.trim();

    if (!seedId) {
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

    const enrollment = await createOrResumePathEnrollment({
      userId: user.id,
      pathId: path.id,
      whyJoined: whyJoined || null,
    });

    await upsertMapEnrollmentForSeed(user.id, seed.map_id);

    return NextResponse.json({
      success: true,
      enrollment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to enroll in path" },
      { status: 500 }
    );
  }
}
