import { NextRequest, NextResponse } from "next/server";
import { batchUpdateMap } from "@/lib/supabase/maps";
import type { FullLearningMap } from "@/lib/supabase/maps";

export async function PUT(
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

    const updatedMap: FullLearningMap = await request.json();

    // Validate that the map ID matches
    if (updatedMap.id !== mapId) {
      return NextResponse.json(
        { error: "Map ID mismatch" },
        { status: 400 }
      );
    }

    // For auto-save, we'll do a simplified update that focuses on:
    // 1. Node positions and basic properties
    // 2. Node paths/connections
    // 3. Map metadata
    
    const updates = {
      map: {
        title: updatedMap.title,
        description: updatedMap.description,
        updated_at: new Date().toISOString(),
      },
      nodes: {
        create: [] as any[],
        update: [] as any[],
        delete: [] as string[],
      },
      paths: {
        create: [] as any[],
        update: [] as any[],
        delete: [] as string[],
      },
      content: {
        create: [] as any[],
        update: [] as any[],
        delete: [] as string[],
      },
      assessments: {
        create: [] as any[],
        update: [] as any[],
        delete: [] as string[],
      },
      quizQuestions: {
        create: [] as any[],
        update: [] as any[],
        delete: [] as string[],
      },
    };

    // Process nodes for updates
    updatedMap.map_nodes.forEach((node) => {
      // For auto-save, we'll primarily update existing nodes
      // New nodes (with temp IDs) would need special handling
      if (node.id.startsWith('temp_')) {
        // This is a new node that needs to be created
        updates.nodes.create.push({
          map_id: mapId,
          title: node.title,
          instructions: node.instructions,
          difficulty: node.difficulty,
          sprite_url: node.sprite_url,
          metadata: node.metadata,
          node_type: (node as any).node_type || 'learning',
        });
      } else {
        // Update existing node
        updates.nodes.update.push({
          id: node.id,
          title: node.title,
          instructions: node.instructions,
          difficulty: node.difficulty,
          sprite_url: node.sprite_url,
          metadata: node.metadata,
        });
      }

      // Handle paths from this node
      if (node.node_paths_source) {
        node.node_paths_source.forEach((path) => {
          if (path.id.startsWith('temp_')) {
            updates.paths.create.push({
              source_node_id: path.source_node_id,
              destination_node_id: path.destination_node_id,
            });
          }
        });
      }
    });

    // Use the batch update function
    await batchUpdateMap(mapId, updates);

    // Return the updated map (simplified for auto-save)
    return NextResponse.json({ 
      id: mapId,
      title: updatedMap.title,
      description: updatedMap.description,
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error updating map:", error);
    return NextResponse.json(
      { error: "Failed to update map" },
      { status: 500 }
    );
  }
}