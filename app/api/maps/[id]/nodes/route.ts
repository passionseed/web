import { NextRequest, NextResponse } from "next/server";
import { getMapWithNodes } from "@/lib/supabase/maps";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mapId } = await params;

    if (!mapId) {
      return NextResponse.json(
        { error: "Map ID is required" },
        { status: 400 }
      );
    }

    const mapWithNodes = await getMapWithNodes(mapId);

    if (!mapWithNodes) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // Transform nodes to the format expected by the modal
    const formattedNodes = mapWithNodes.map_nodes.map((node, index) => ({
      id: node.id,
      title: node.title,
      description: node.instructions || "",
      node_type: "learning", // Default type since it's not in the schema
      sequence_number: index + 1, // Generate sequence based on order
      has_assessment: node.node_assessments && node.node_assessments.length > 0,
    }));

    return NextResponse.json(formattedNodes);
  } catch (error) {
    console.error("Error fetching map nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch map nodes" },
      { status: 500 }
    );
  }
}
