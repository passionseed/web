import { NextRequest, NextResponse } from "next/server";
import { batchUpdateMap, BatchMapUpdate } from "@/lib/supabase/maps";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function POST(request: NextRequest) {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const body = await request.json();
    const { mapId, updates } = body;

    if (!mapId || !updates) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["mapId", "updates"] },
        { status: 400 }
      );
    }

    const requiredKeys = ["map", "nodes", "paths", "content", "assessments", "quizQuestions"];
    const missingKeys = requiredKeys.filter((key) => !(key in updates));
    if (missingKeys.length > 0) {
      return NextResponse.json(
        { error: "Invalid updates structure", missingKeys },
        { status: 400 }
      );
    }

    const result = await batchUpdateMap(mapId, updates as BatchMapUpdate);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return safeServerError("Batch update failed", error);
  }
}
