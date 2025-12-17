import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("nodeId");

  if (!nodeId) {
    return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("map_nodes")
    .select("id, title, node_type, map_id")
    .eq("id", nodeId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    node_type: data.node_type || "learning (default)",
    map_id: data.map_id,
    is_end_node: data.node_type === "end",
  });
}
