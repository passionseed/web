import { NextResponse } from "next/server";
import { deleteMap } from "@/lib/supabase/maps";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;

    const { data: map, error } = await supabase
      .from("learning_maps")
      .select(
        `
        *,
        profiles!creator_id (
          username,
          full_name,
          email
        ),
        map_nodes (
          id,
          title,
          difficulty,
          node_assessments (id)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !map) {
      return NextResponse.json(
        { error: error?.code === "PGRST116" ? "Map not found" : "Failed to fetch map" },
        { status: error?.code === "PGRST116" ? 404 : 500 }
      );
    }

    const nodes = map.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty =
      nodeCount > 0
        ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
        : 1;
    const totalAssessments = nodes.reduce(
      (sum: number, node: any) => sum + (node.node_assessments?.length || 0),
      0
    );

    return NextResponse.json({
      ...map,
      creator_name: map.profiles?.full_name || map.profiles?.username || "Unknown",
      creator_email: map.profiles?.email,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
    });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;

    const { data: existingMap, error: fetchError } = await supabase
      .from("learning_maps")
      .select("id, title")
      .eq("id", id)
      .single();

    if (fetchError || !existingMap) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    await deleteMap(id, supabase);

    return NextResponse.json({
      success: true,
      message: `Map \"${existingMap.title}\" has been deleted successfully`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Could not delete the map")) {
      return NextResponse.json(
        { error: "Failed to delete map. It may have dependencies." },
        { status: 400 }
      );
    }

    return safeServerError("Internal server error during deletion", error);
  }
}
