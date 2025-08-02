import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { batchUpdateMap, BatchMapUpdate } from "@/lib/supabase/maps";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mapId, updates } = body;

    console.log("🔧 Debug batch update request:", {
      mapId,
      updatesKeys: Object.keys(updates || {}),
      user: { id: user.id, email: user.email },
    });

    if (!mapId || !updates) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["mapId", "updates"],
        },
        { status: 400 }
      );
    }

    // Validate updates structure
    const requiredKeys = [
      "map",
      "nodes",
      "paths",
      "content",
      "assessments",
      "quizQuestions",
    ];
    const missingKeys = requiredKeys.filter((key) => !(key in updates));

    if (missingKeys.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid updates structure",
          missingKeys,
          received: Object.keys(updates),
        },
        { status: 400 }
      );
    }

    console.log("✅ Validation passed, calling batchUpdateMap...");

    const result = await batchUpdateMap(mapId, updates as BatchMapUpdate);

    console.log("✅ Batch update completed successfully");

    return NextResponse.json({
      success: true,
      message: "Batch update completed successfully",
      result,
    });
  } catch (error) {
    console.error("❌ Debug batch update failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
