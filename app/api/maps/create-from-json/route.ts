import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Types for the JSON structure
interface MapJsonStructure {
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
      type: "quiz" | "text_answer" | "image_upload" | "file_upload" | "checklist";
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
    const jsonData: MapJsonStructure = await request.json();
    
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
          content_url?: string;
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
            assessment_type: assessment.type as "quiz" | "text_answer" | "image_upload" | "file_upload" | "checklist",
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
              .insert(questionsToInsert);

            if (!questionsError && createdQuestions) {
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
          .insert(connectionsToInsert);

        if (!connectionsError && createdConnections) {
          totalConnections = createdConnections.length;
        }
      }
    }

    console.log(`✅ Created ${totalConnections} connections`);

    const timeElapsed = Date.now() - startTime;
    
    console.log(`🎉 Map creation completed in ${timeElapsed}ms`);

    return NextResponse.json({
      success: true,
      mapId: createdMap.id,
      nodesCreated: createdNodes.length,
      contentItemsCreated: totalContentItems,
      assessmentsCreated: totalAssessments,
      questionsCreated: totalQuestions,
      connectionsCreated: totalConnections,
      timeElapsed,
      message: `Successfully created map "${createdMap.title}" with ${createdNodes.length} nodes, ${totalContentItems} content items, and ${totalAssessments} assessments`
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