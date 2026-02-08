import { NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { supabase } = debug.value;
    const { data, error } = await supabase.from("reflections").select("id").limit(1);

    if (error) {
      return NextResponse.json({ error: "Error checking reflections table" }, { status: 500 });
    }

    return NextResponse.json({
      exists: true,
      hasData: !!(data && data.length > 0),
      rowCount: data?.length || 0,
    });
  } catch (error) {
    return safeServerError("An unexpected error occurred", error);
  }
}
