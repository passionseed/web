import { NextRequest, NextResponse } from "next/server";
import { batchUpdateMap, getMapWithNodes } from "@/lib/supabase/maps";
import type { FullLearningMap } from "@/lib/supabase/maps";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Map ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const map = await getMapWithNodes(id, supabase);
    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    return NextResponse.json({ data: map });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mapId } = await params;
    const supabase = await createClient();

    if (!mapId) {
      return NextResponse.json(
        { error: "Map ID is required" },
        { status: 400 }
      );
    }

    // SECURITY: Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // SECURITY: Check if user has admin or instructor role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "instructor"]);

    if (roleError || !roles || roles.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions. Only admins and instructors can edit maps." },
        { status: 403 }
      );
    }

    // SECURITY: Verify the map exists and optionally check ownership
    const { data: existingMap, error: mapFetchError } = await supabase
      .from("learning_maps")
      .select("id, creator_id, title")
      .eq("id", mapId)
      .single();

    if (mapFetchError || !existingMap) {
      return NextResponse.json(
        { error: "Map not found" },
        { status: 404 }
      );
    }

    // Optional: Check if user is the creator or has admin role
    // Admins can edit any map, instructors can only edit their own maps
    const isAdmin = roles.some((r) => r.role === "admin");
    const isCreator = existingMap.creator_id === user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        {
          error: "Forbidden - You can only edit maps you created. Admins can edit all maps.",
        },
        { status: 403 }
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

      // Note: Content is saved directly via ContentEditor and doesn't need processing here
    });

    // Handle assessments for copied nodes - Process ALL nodes for temp assessments
    updatedMap.map_nodes.forEach((node) => {
      if (node.node_assessments) {
        console.log(`🔍 Processing node ${node.id} with ${node.node_assessments.length} assessments`);
        node.node_assessments.forEach((assessment) => {
          console.log(`🔍 Assessment ${assessment.id} - starts with temp: ${assessment.id.startsWith('temp_')}`);
          if (assessment.id.startsWith('temp_')) {
            // This is a copied assessment that needs to be created
            const assessmentToCreate = {
              temp_id: assessment.id, // Preserve the temp ID for mapping
              node_id: assessment.node_id,
              assessment_type: assessment.assessment_type,
              points_possible: assessment.points_possible,
              is_graded: assessment.is_graded,
              is_group_assessment: assessment.is_group_assessment,
              group_formation_method: assessment.group_formation_method,
              group_submission_mode: assessment.group_submission_mode,
              target_group_size: assessment.target_group_size,
              allow_uneven_groups: assessment.allow_uneven_groups,
              metadata: assessment.metadata,
            };
            console.log(`➕ Adding assessment to create:`, assessmentToCreate);
            updates.assessments.create.push(assessmentToCreate);

            // Handle quiz questions for copied assessments
            if (assessment.quiz_questions) {
              console.log(`🔍 Assessment ${assessment.id} has ${assessment.quiz_questions.length} quiz questions`);
              assessment.quiz_questions.forEach((question) => {
                console.log(`🔍 Question ${question.id} - starts with temp: ${question.id.startsWith('temp_')}`);
                if (question.id.startsWith('temp_')) {
                  const questionToCreate = {
                    assessment_id: assessment.id, // This will be mapped to the real assessment ID
                    question_text: question.question_text,
                    options: question.options,
                    correct_option: question.correct_option,
                  };
                  console.log(`➕ Adding quiz question to create:`, questionToCreate);
                  updates.quizQuestions.create.push(questionToCreate);
                }
              });
            }
          }
        });
      }
    });

    // Get current nodes from database to detect deletions
    const { data: currentNodes, error: fetchError } = await supabase
      .from("map_nodes")
      .select("id")
      .eq("map_id", mapId);

    if (fetchError) {
      console.error("Error fetching current nodes for comparison:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch current map nodes" },
        { status: 500 }
      );
    }

    // Detect deleted nodes by comparing current nodes with updated nodes
    const currentNodeIds = (currentNodes || []).map((node: any) => node.id);
    const updatedNodeIds = updatedMap.map_nodes.map((node) => node.id);
    const deletedNodeIds = currentNodeIds.filter((id: string) => !updatedNodeIds.includes(id));

    if (deletedNodeIds.length > 0) {
      console.log("🗑️ Detected deleted nodes:", deletedNodeIds);
      updates.nodes.delete = deletedNodeIds;
    }

    // For paths, we'll let the batch update function handle path deletions
    // since it's complex to query them efficiently here

    // Log the updates being sent
    console.log("📦 Updates to be applied:", {
      nodes: {
        create: updates.nodes.create.length,
        update: updates.nodes.update.length,
        delete: updates.nodes.delete.length,
      },
      paths: {
        create: updates.paths.create.length,
      },
      assessments: {
        create: updates.assessments.create.length,
      },
      quizQuestions: {
        create: updates.quizQuestions.create.length,
      }
    });

    // Use the batch update function with server client
    console.log("🔄 Calling batchUpdateMap with server client...");
    await batchUpdateMap(mapId, updates, supabase);
    console.log("✅ batchUpdateMap completed successfully");

    // Return the updated map (simplified for auto-save)
    return NextResponse.json({
      id: mapId,
      title: updatedMap.title,
      description: updatedMap.description,
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Error updating map:", error);
    return NextResponse.json(
      {
        error: "Failed to update map",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// sendBeacon always uses POST, so alias POST to the same handler
export const POST = PUT;