import { NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { supabase, userId } = debug.value;

    const { data: tables, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["reflections", "tags", "reflection_tags", "reflection_metrics"]);

    if (error) {
      return NextResponse.json({ error: "Error checking tables" }, { status: 500 });
    }

    const testReflection = {
      user_id: userId,
      content: "Test reflection",
      emotion: "neutral",
    };

    const { data: insertData, error: insertError } = await supabase
      .from("reflections")
      .insert(testReflection)
      .select("id")
      .single();

    if (insertData?.id) {
      await supabase.from("reflections").delete().eq("id", insertData.id);
    }

    return NextResponse.json({
      tables: tables?.map((t) => t.table_name) || [],
      canInsertReflection: !insertError,
    });
  } catch (error) {
    return safeServerError("An unexpected error occurred", error);
  }
}
