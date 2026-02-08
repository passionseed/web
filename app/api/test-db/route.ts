import { NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { supabase } = debug.value;
    const { data, error } = await supabase.from("reflections").select("id").limit(1);

    if (error) {
      return NextResponse.json({ success: false, error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reflections: {
        count: data?.length || 0,
      },
    });
  } catch (error) {
    return safeServerError("An unexpected error occurred", error);
  }
}
