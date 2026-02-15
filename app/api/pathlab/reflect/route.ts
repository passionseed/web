import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { submitPathReflection } from "@/lib/supabase/pathlab-reflections";

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
    const enrollmentId = body?.enrollmentId as string | undefined;
    const dayNumber = Number(body?.dayNumber);
    const energyLevel = Number(body?.energyLevel);
    const confusionLevel = Number(body?.confusionLevel);
    const interestLevel = Number(body?.interestLevel);
    const decision = body?.decision as
      | "continue_now"
      | "continue_tomorrow"
      | "pause"
      | "quit"
      | "final_reflection"
      | undefined;

    if (!enrollmentId || !dayNumber || !decision) {
      return NextResponse.json(
        { error: "enrollmentId, dayNumber, and decision are required" },
        { status: 400 }
      );
    }

    if (
      [energyLevel, confusionLevel, interestLevel].some((value) => Number.isNaN(value) || value < 1 || value > 10)
    ) {
      return NextResponse.json(
        { error: "energyLevel, confusionLevel, and interestLevel must be between 1 and 10" },
        { status: 400 }
      );
    }

    const result = await submitPathReflection({
      enrollmentId,
      dayNumber,
      energyLevel,
      confusionLevel,
      interestLevel,
      openResponse: body?.openResponse || null,
      decision,
      timeSpentMinutes: body?.timeSpentMinutes ?? null,
      extraPromptResponses: body?.extraPromptResponses || null,
      exitReflection: body?.exitReflection,
      endReflection: body?.endReflection,
    });

    return NextResponse.json({
      success: true,
      reflection: result.reflection,
      enrollment: result.enrollment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit reflection" },
      { status: 500 }
    );
  }
}
