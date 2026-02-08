import { NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET(request: Request) {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("nodeId");

  if (!nodeId) {
    return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });
  }

  try {
    const { supabase } = debug.value;
    const { data, error } = await supabase
      .from("map_nodes")
      .select("id, title, node_type, map_id")
      .eq("id", nodeId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      node_type: data.node_type || "learning",
      map_id: data.map_id,
      is_end_node: data.node_type === "end",
    });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
