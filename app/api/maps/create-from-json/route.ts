import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Types for the JSON structure
interface StandardMapStructure {
  map: {
    title: string;
    description: string;
    difficulty?: number;
    estimatedHours?: number;
    visibility?: "public" | "private";
    metadata?: {
      tags?: string[];
      category?: string;
      coverImage?: string;
      [key: string]: any;
    };
  };
  nodes: {
    id: string;
    title: string;
    description?: string;
    position: { x: number; y: number };
    difficulty?: number;
    estimatedMinutes?: number;
    prerequisites?: string[];
    content?: Array<{
      content_type: "text" | "video" | "canva_slide" | "image" | "pdf" | "resource_link";
      content_url?: string;
      content_body?: any; // Can be string or object depending on content_type
    }> | {
      // Legacy format support for backward compatibility
      type?: string;
      text?: string;
      codeBlocks?: Array<{
        language: string;
        code: string;
      }>;
      resources?: Array<{
        title: string;
        url: string;
        type: string;
      }>;
      [key: string]: any;
    };
    assessments?: Array<{
      type: "quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist";
      isGraded?: boolean;
      pointsPossible?: number;
      questions?: Array<{
        question_text: string;
        options?: Array<{option: string; text: string}>;
        correct_option?: string;
      }>;
      prompt?: string;
      requirements?: string[];
      metadata?: any; // For checklist items and other assessment-specific data
    }>;
  }[];
  connections?: Array<{
    from: string;
    to: string;
    type?: string;
  }>;
}

// PathLab format structure
interface PathLabMapStructure {
  seed: {
    title: string;
    description: string;
    slogan: string;
  };
  nodes: {
    [key: string]: {
      title: string;
      instructions: string;
      node_type: "learning" | "text" | "comment" | "end";
      position: { x: number; y: number };
      content: Array<{
        content_type: "text" | "video" | "canva_slide" | "image" | "pdf" | "resource_link";
        content_url?: string;
        content_body: string;
      }>;
      assessments: Array<{
        type: "quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist";
        prompt: string;
        isGraded: boolean;
        pointsPossible: number;
      }>;
    };
  };
  edges?: Array<{
    source_key: string;
    destination_key: string;
  }>;
  path: {
    total_days: number;
    days: Array<{
      day_number: number;
      title: string;
      context_text: string;
      reflection_prompts: string[];
      node_keys: string[];
    }>;
  };
}

type MapJsonStructure = StandardMapStructure | PathLabMapStructure;

// Type guard to check if data is PathLab format
function isPathLabFormat(data: any): data is PathLabMapStructure {
  return data.seed && data.path && typeof data.nodes === "object" && !Array.isArray(data.nodes);
}

// Convert PathLab format to Standard format
function convertPathLabToStandard(pathlab: PathLabMapStructure): StandardMapStructure {
  // Convert nodes object to array
  const nodesArray = Object.entries(pathlab.nodes).map(([key, node]) => ({
    id: key,
    title: node.title,
    description: node.instructions,
    position: node.position,
    difficulty: 1,
    estimatedMinutes: 30,
    content: node.content,
    assessments: node.assessments,
  }));

  // Convert edges to connections
  const connections = pathlab.edges?.map(edge => ({
    from: edge.source_key,
    to: edge.destination_key,
  })) || [];

  return {
    map: {
      title: pathlab.seed.title,
      description: pathlab.seed.description,
      visibility: "public",
      metadata: {
        slogan: pathlab.seed.slogan,
        pathlab: true,
        path: pathlab.path,
      },
    },
    nodes: nodesArray,
    connections,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate JSON
    let rawData = await request.json();

    // Detect format and convert if needed
    let jsonData: StandardMapStructure;
    if (isPathLabFormat(rawData)) {
      console.log("🔄 Detected PathLab format, converting to standard format...");
      jsonData = convertPathLabToStandard(rawData);
    } else {
      jsonData = rawData as StandardMapStructure;
    }

    // Validate required fields
    if (!jsonData.map?.title) {
      return NextResponse.json(
        { success: false, error: "Map title is required" },
        { status: 400 }
      );
    }

    if (!jsonData.nodes || jsonData.nodes.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one node is required" },
        { status: 400 }
      );
    }

    // Validate node structure
    const nodeValidationErrors: string[] = [];
    jsonData.nodes.forEach((node, i) => {
      if (!node.id) nodeValidationErrors.push(`Node ${i + 1}: Missing ID`);
      if (!node.title) nodeValidationErrors.push(`Node ${i + 1}: Missing title`);
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        nodeValidationErrors.push(`Node ${i + 1}: Invalid position`);
      }
    });

    if (nodeValidationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation errors", details: nodeValidationErrors },
        { status: 400 }
      );
    }

    console.log("🚀 Starting JSON map creation for user:", user.id);

    // 1. Create the learning map - Use only fields that exist in schema
    const mapData = {
      title: jsonData.map.title,
      description: jsonData.map.description || "",
      creator_id: user.id,
      metadata: {
        ...(jsonData.map.metadata || {}),
        // Store additional fields in metadata
        visibility: jsonData.map.visibility || "public",
        difficulty: jsonData.map.difficulty || 1,
        estimatedHours: jsonData.map.estimatedHours || null,
      }
    };

    const { data: createdMap, error: mapError } = await supabase
      .from("learning_maps")
      .insert([mapData])
      .select()
      .single();

    if (mapError || !createdMap) {
      console.error("Error creating map:", mapError);
      return NextResponse.json(
        { success: false, error: "Failed to create map", details: mapError?.message },
        { status: 500 }
      );
    }

    console.log("✅ Map created:", createdMap.id);

    // 2. Create a mapping of temp node IDs to real UUIDs
    const nodeIdMapping: { [tempId: string]: string } = {};
    
    // 3. Batch create all nodes
    const nodesToInsert = jsonData.nodes.map((node) => {
      const nodeId = crypto.randomUUID();
      nodeIdMapping[node.id] = nodeId;
      
      return {
        id: nodeId,
        map_id: createdMap.id,
        title: node.title,
        instructions: node.description || "",
        difficulty: node.difficulty || 1,
        node_type: "learning" as const,
        sprite_url: null,
        metadata: {
          // Store position and other data in metadata
          position: node.position,
          estimatedMinutes: node.estimatedMinutes || 30,
          ...(node.prerequisites ? { prerequisites: node.prerequisites } : {})
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    const { data: createdNodes, error: nodesError } = await supabase
      .from("map_nodes")
      .insert(nodesToInsert)
      .select();

    if (nodesError || !createdNodes) {
      console.error("Error creating nodes:", nodesError);
      // Cleanup: delete the created map
      await supabase.from("learning_maps").delete().eq("id", createdMap.id);
      return NextResponse.json(
        { success: false, error: "Failed to create nodes", details: nodesError?.message },
        { status: 500 }
      );
    }

    console.log(`✅ Created ${createdNodes.length} nodes`);

    // 4. Create node content if it exists
    let totalContentItems = 0;

    for (const node of jsonData.nodes) {
      if (node.content) {
        const realNodeId = nodeIdMapping[node.id];
        
        // Handle both new array format and legacy format
        let contentItemsToCreate: Array<{
          content_type: string;
          content_url?: string | null;
          content_body: string;
        }> = [];

        if (Array.isArray(node.content)) {
          // New format: array of content items
          contentItemsToCreate = node.content.map(item => ({
            content_type: item.content_type,
            content_url: item.content_url || null,
            content_body: typeof item.content_body === 'string' 
              ? item.content_body 
              : JSON.stringify(item.content_body)
          }));
        } else {
          // Legacy format: single content object
          contentItemsToCreate = [{
            content_type: "text" as const,
            content_url: null,
            content_body: JSON.stringify({
              type: node.content.type || "lesson",
              text: node.content.text || "",
              codeBlocks: node.content.codeBlocks || [],
              resources: node.content.resources || [],
              completionCriteria: node.content.completionCriteria || "",
              ...node.content
            })
          }];
        }

        // Create all content items for this node
        for (const contentItem of contentItemsToCreate) {
          const contentData = {
            node_id: realNodeId,
            ...contentItem
          };

          const { data: createdContent, error: contentError } = await supabase
            .from("node_content")
            .insert([contentData])
            .select()
            .single();

          if (contentError) {
            console.error("Error creating content for node:", node.id, contentError);
            continue;
          }

          totalContentItems++;
        }
        
        console.log(`✅ Created ${contentItemsToCreate.length} content item(s) for node: ${node.id}`);
      }
    }

    console.log(`✅ Created ${totalContentItems} total content items`);

    // 5. Create assessments if they exist
    let totalAssessments = 0;
    let totalQuestions = 0;

    for (const node of jsonData.nodes) {
      if (node.assessments && node.assessments.length > 0) {
        const realNodeId = nodeIdMapping[node.id];
        
        for (const assessment of node.assessments) {
          // Create the assessment with proper fields
          const assessmentData = {
            node_id: realNodeId,
            assessment_type: assessment.type as "quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist",
            points_possible: assessment.pointsPossible || null,
            is_graded: assessment.isGraded !== undefined ? assessment.isGraded : true,
            metadata: assessment.metadata || (assessment.type === "checklist" ? { items: assessment.requirements || [] } : null)
          };

          const { data: createdAssessment, error: assessmentError } = await supabase
            .from("node_assessments")
            .insert([assessmentData])
            .select()
            .single();

          if (assessmentError || !createdAssessment) {
            console.error("Error creating assessment:", assessmentError);
            continue;
          }

          totalAssessments++;

          // Create quiz questions if they exist
          if (assessment.type === "quiz" && assessment.questions) {
            const questionsToInsert = assessment.questions.map((question) => ({
              assessment_id: createdAssessment.id,
              question_text: question.question_text,
              options: question.options || null,
              correct_option: question.correct_option || "A",
            }));

            const { data: createdQuestions, error: questionsError } = await supabase
              .from("quiz_questions")
              .insert(questionsToInsert)
              .select();

            if (!questionsError && createdQuestions && Array.isArray(createdQuestions)) {
              totalQuestions += createdQuestions.length;
            }
          }
        }
      }
    }

    console.log(`✅ Created ${totalAssessments} assessments and ${totalQuestions} questions`);

    // 6. Create connections if they exist
    let totalConnections = 0;
    if (jsonData.connections && jsonData.connections.length > 0) {
      const connectionsToInsert = jsonData.connections.map((connection) => ({
        source_node_id: nodeIdMapping[connection.from],
        destination_node_id: nodeIdMapping[connection.to],
        // NodePath doesn't have type or created_at fields based on the interface
      })).filter((conn) => conn.source_node_id && conn.destination_node_id); // Only valid connections

      if (connectionsToInsert.length > 0) {
        const { data: createdConnections, error: connectionsError } = await supabase
          .from("node_paths")
          .insert(connectionsToInsert)
          .select();

        if (!connectionsError && createdConnections && Array.isArray(createdConnections)) {
          totalConnections = createdConnections.length;
        }
      }
    }

    console.log(`✅ Created ${totalConnections} connections`);

    // 7. If PathLab format, create seed, path, and path_days
    let seedId: string | null = null;
    let pathId: string | null = null;
    let pathDaysCreated = 0;

    if (isPathLabFormat(rawData)) {
      console.log("🌱 Creating PathLab structure (seed + path + days)...");

      try {
        // Create seed
        const seedData = {
          map_id: createdMap.id,
          title: rawData.seed.title,
          description: rawData.seed.description,
          slogan: rawData.seed.slogan,
          seed_type: "pathlab" as const,
          created_by: user.id,
        };

        console.log("📦 Seed data:", JSON.stringify(seedData, null, 2));

        const { data: createdSeed, error: seedError } = await supabase
          .from("seeds")
          .insert([seedData])
          .select()
          .single();

        if (seedError) {
          console.error("❌ Seed creation failed:", seedError);
          throw new Error(`Seed creation failed: ${seedError.message}`);
        }

        if (!createdSeed) {
          throw new Error("Seed was not created (no data returned)");
        }

        seedId = createdSeed.id;
        console.log("✅ Created seed:", seedId);

        // Update the learning map to link it to the seed
        const { error: updateMapError } = await supabase
          .from("learning_maps")
          .update({
            parent_seed_id: seedId,
            map_type: "seed",
          })
          .eq("id", createdMap.id);

        if (updateMapError) {
          console.error("❌ Failed to link map to seed:", updateMapError);
          throw new Error(`Failed to link map to seed: ${updateMapError.message}`);
        }

        console.log("✅ Linked map to seed (parent_seed_id set)");

        // Create path
        const pathData = {
          seed_id: seedId,
          total_days: rawData.path.total_days,
          created_by: user.id,
        };

        console.log("📦 Path data:", JSON.stringify(pathData, null, 2));

        const { data: createdPath, error: pathError } = await supabase
          .from("paths")
          .insert([pathData])
          .select()
          .single();

        if (pathError) {
          console.error("❌ Path creation failed:", pathError);
          throw new Error(`Path creation failed: ${pathError.message}`);
        }

        if (!createdPath) {
          throw new Error("Path was not created (no data returned)");
        }

        pathId = createdPath.id;
        console.log("✅ Created path:", pathId);

        // Create path_days
        const pathDaysToInsert = rawData.path.days.map((day) => {
          // Map node_keys to actual node UUIDs
          const nodeUuids = day.node_keys
            .map((key) => nodeIdMapping[key])
            .filter((uuid): uuid is string => Boolean(uuid)); // Type guard to remove undefined

          // Ensure reflection_prompts is an array
          const reflectionPrompts = Array.isArray(day.reflection_prompts)
            ? day.reflection_prompts
            : [];

          console.log(`📅 Day ${day.day_number}:`, {
            node_keys: day.node_keys,
            mapped_uuids: nodeUuids,
            reflection_prompts: reflectionPrompts,
          });

          return {
            path_id: pathId!,
            day_number: day.day_number,
            title: day.title,
            context_text: day.context_text,
            reflection_prompts: reflectionPrompts, // JSONB array
            node_ids: nodeUuids, // PostgreSQL UUID[] array
          };
        });

        console.log("📦 Path days to insert:", JSON.stringify(pathDaysToInsert, null, 2));

        const { data: createdPathDays, error: pathDaysError } = await supabase
          .from("path_days")
          .insert(pathDaysToInsert)
          .select();

        if (pathDaysError) {
          console.error("❌ Path days creation failed:", pathDaysError);
          throw new Error(`Path days creation failed: ${pathDaysError.message}`);
        }

        if (!createdPathDays) {
          throw new Error("Path days were not created (no data returned)");
        }

        pathDaysCreated = createdPathDays.length;
        console.log(`✅ Created ${pathDaysCreated} path days`);
        console.log("📦 Created path days:", JSON.stringify(createdPathDays, null, 2));
      } catch (error) {
        console.error("❌ PathLab structure creation failed:", error);
        // Continue anyway - at least we have the map
      }
    }

    const timeElapsed = Date.now() - startTime;

    console.log(`🎉 Map creation completed in ${timeElapsed}ms`);

    return NextResponse.json({
      success: true,
      mapId: createdMap.id,
      seedId,
      pathId,
      nodesCreated: createdNodes.length,
      contentItemsCreated: totalContentItems,
      assessmentsCreated: totalAssessments,
      questionsCreated: totalQuestions,
      connectionsCreated: totalConnections,
      pathDaysCreated,
      timeElapsed,
      message: seedId
        ? `Successfully created PathLab map "${createdMap.title}" with ${createdNodes.length} nodes and ${pathDaysCreated} days`
        : `Successfully created map "${createdMap.title}" with ${createdNodes.length} nodes, ${totalContentItems} content items, and ${totalAssessments} assessments`
    });

  } catch (error) {
    console.error("Error in JSON map creation:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error",
        timeElapsed: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}