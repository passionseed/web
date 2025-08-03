import { createClient } from "./client";
import {
  LearningMap,
  MapNode,
  NodePath,
  NodeContent,
  NodeAssessment,
  QuizQuestion,
  StudentNodeProgress,
  AssessmentSubmission,
  SubmissionGrade,
  Grade,
  ProgressStatus,
  UserMapEnrollment,
} from "@/types/map";

// A type for a map that includes its nodes and paths
export type FullLearningMap = LearningMap & {
  map_nodes: (MapNode & {
    node_paths_source: NodePath[];
    node_paths_destination: NodePath[];
    node_content: NodeContent[];
    node_assessments: (NodeAssessment & {
      quiz_questions: QuizQuestion[];
    })[];
  })[];
};

export const getMaps = async (): Promise<LearningMap[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_maps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching maps:", error);
    throw new Error("Could not fetch learning maps.");
  }

  return data || [];
};

// Enhanced function to get maps with detailed statistics
export const getMapsWithStats = async (): Promise<
  (LearningMap & {
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
  })[]
> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_maps")
    .select(
      `
      *,
      map_nodes (
        id,
        difficulty,
        node_assessments (id)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching maps with stats:", error);
    throw new Error("Could not fetch learning maps.");
  }

  // Transform data to include calculated statistics
  const mapsWithStats = (data || [])
    .filter((map: any) => map && map.id && map.title) // Filter out null/invalid maps
    .map((map: any) => {
      const nodes = map.map_nodes || [];
      const nodeCount = nodes.length;
      const avgDifficulty =
        nodeCount > 0
          ? Math.round(
              nodes.reduce(
                (sum: number, node: any) => sum + (node.difficulty || 1),
                0
              ) / nodeCount
            )
          : 1;
      const totalAssessments = nodes.reduce(
        (sum: number, node: any) => sum + (node.node_assessments?.length || 0),
        0
      );

      return {
        id: map.id,
        title: map.title,
        description: map.description,
        creator_id: map.creator_id,
        difficulty: map.difficulty,
        category: map.category,
        total_students: map.total_students,
        finished_students: map.finished_students,
        metadata: map.metadata,
        created_at: map.created_at,
        updated_at: map.updated_at,
        node_count: nodeCount,
        avg_difficulty: avgDifficulty,
        total_assessments: totalAssessments,
      };
    });

  return mapsWithStats;
};

export const getMapWithNodes = async (
  id: string
): Promise<FullLearningMap | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_maps")
    .select(
      `
            *,
            map_nodes (
                *,
                node_paths_source:node_paths!source_node_id(*),
                node_paths_destination:node_paths!destination_node_id(*),
                node_content (*),
                node_assessments (
                    *,
                    quiz_questions (*)
                )
            )
        `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching map with nodes:", error);
    if (error.code === "PGRST116") return null;
    throw new Error("Could not fetch the learning map.");
  }

  return data as FullLearningMap;
};

export const createMap = async (
  mapData: Pick<LearningMap, "title" | "description">
): Promise<LearningMap> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_maps")
    .insert([{ ...mapData }])
    .select()
    .single();

  if (error) {
    console.error("Error creating map:", error);
    throw new Error("Could not create the new map.");
  }

  return data;
};

export const updateMap = async (
  id: string,
  mapData: Partial<LearningMap>
): Promise<LearningMap> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_maps")
    .update(mapData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating map:", error);
    throw new Error("Could not update the map.");
  }

  return data;
};

export const deleteMap = async (id: string): Promise<void> => {
  const supabase = createClient();
  // Must delete nodes first due to foreign key constraints
  const { data: nodes } = await supabase
    .from("map_nodes")
    .select("id")
    .eq("map_id", id);
  if (nodes) {
    const nodeIds = nodes.map((n) => n.id);
    await supabase.from("node_paths").delete().in("source_node_id", nodeIds);
    await supabase
      .from("node_paths")
      .delete()
      .in("destination_node_id", nodeIds);
    // Add deletion for content, assessments etc. here in the future
    await supabase.from("map_nodes").delete().in("id", nodeIds);
  }

  const { error } = await supabase.from("learning_maps").delete().eq("id", id);

  if (error) {
    console.error("Error deleting map:", error);
    throw new Error("Could not delete the map.");
  }
};

// --- Batch Save Functions ---

export interface BatchMapUpdate {
  map: Partial<LearningMap>;
  nodes: {
    create: Partial<MapNode>[];
    update: (Partial<MapNode> & { id: string })[];
    delete: string[];
  };
  paths: {
    create: { source_node_id: string; destination_node_id: string }[];
    delete: string[];
  };
  content: {
    create: Partial<NodeContent>[];
    update: (Partial<NodeContent> & { id: string })[];
    delete: string[];
  };
  assessments: {
    create: Partial<NodeAssessment>[];
    update: (Partial<NodeAssessment> & { id: string })[];
    delete: string[];
  };
  quizQuestions: {
    create: Partial<QuizQuestion>[];
    update: (Partial<QuizQuestion> & { id: string })[];
    delete: string[];
  };
}

export const batchUpdateMap = async (
  mapId: string,
  updates: BatchMapUpdate
): Promise<void> => {
  console.log("🔄 Starting batch update for map:", mapId);
  console.log("📦 Updates to apply:", JSON.stringify(updates, null, 2));

  const supabase = createClient();

  try {
    // Validate inputs
    if (!mapId) {
      throw new Error("Map ID is required");
    }

    if (!updates) {
      throw new Error("Updates object is required");
    }

    console.log("✅ Input validation passed");

    // 1. Update map metadata
    console.log("📝 Step 1: Updating map metadata...");
    if (Object.keys(updates.map).length > 0) {
      console.log("📝 Map changes to apply:", updates.map);
      const { error: mapError } = await supabase
        .from("learning_maps")
        .update(updates.map)
        .eq("id", mapId);

      if (mapError) {
        console.error("❌ Map update failed:", mapError);
        throw new Error(`Map update failed: ${mapError.message}`);
      }
      console.log("✅ Map metadata updated successfully");
    } else {
      console.log("ℹ️ No map metadata changes to apply");
    }

    // 2. Handle node deletions first (with proper cascade deletion)
    if (updates.nodes.delete.length > 0) {
      console.log("🗑️ Step 2: Handling node deletions with cascade...");

      for (const nodeId of updates.nodes.delete) {
        console.log(`🗑️ Deleting node ${nodeId} and all related data...`);

        // Get all assessments for this node first
        const { data: nodeAssessments, error: assessmentFetchError } =
          await supabase
            .from("node_assessments")
            .select("id")
            .eq("node_id", nodeId);

        if (assessmentFetchError) {
          console.error(
            "❌ Failed to fetch assessments for node:",
            assessmentFetchError
          );
          throw new Error(
            `Failed to fetch assessments for node ${nodeId}: ${assessmentFetchError.message}`
          );
        }

        const assessmentIds = nodeAssessments?.map((a) => a.id) || [];
        console.log(
          `📊 Found ${assessmentIds.length} assessments to delete for node ${nodeId}`
        );

        // Delete quiz questions for all assessments of this node
        if (assessmentIds.length > 0) {
          console.log("🗑️ Deleting quiz questions for node assessments...");
          const { error: quizDeleteError } = await supabase
            .from("quiz_questions")
            .delete()
            .in("assessment_id", assessmentIds);

          if (quizDeleteError) {
            console.error("❌ Quiz question deletion failed:", quizDeleteError);
            throw new Error(
              `Quiz question deletion failed: ${quizDeleteError.message}`
            );
          }
          console.log("✅ Quiz questions deleted");
        }

        // Get all submissions for assessments of this node
        const { data: submissions, error: submissionFetchError } =
          await supabase
            .from("assessment_submissions")
            .select("id")
            .in("assessment_id", assessmentIds);

        if (submissionFetchError) {
          console.error(
            "❌ Failed to fetch submissions:",
            submissionFetchError
          );
          // Don't throw here, continue with deletion
        }

        const submissionIds = submissions?.map((s) => s.id) || [];
        console.log(
          `📊 Found ${submissionIds.length} submissions to delete for node ${nodeId}`
        );

        // Delete submission grades
        if (submissionIds.length > 0) {
          console.log("🗑️ Deleting submission grades...");
          const { error: gradeDeleteError } = await supabase
            .from("submission_grades")
            .delete()
            .in("submission_id", submissionIds);

          if (gradeDeleteError) {
            console.error(
              "❌ Submission grade deletion failed:",
              gradeDeleteError
            );
            // Don't throw here, continue with deletion
          } else {
            console.log("✅ Submission grades deleted");
          }

          // Delete assessment submissions
          console.log("🗑️ Deleting assessment submissions...");
          const { error: submissionDeleteError } = await supabase
            .from("assessment_submissions")
            .delete()
            .in("id", submissionIds);

          if (submissionDeleteError) {
            console.error(
              "❌ Assessment submission deletion failed:",
              submissionDeleteError
            );
            // Don't throw here, continue with deletion
          } else {
            console.log("✅ Assessment submissions deleted");
          }
        }

        // Delete node assessments
        if (assessmentIds.length > 0) {
          console.log("🗑️ Deleting node assessments...");
          const { error: assessmentDeleteError } = await supabase
            .from("node_assessments")
            .delete()
            .in("id", assessmentIds);

          if (assessmentDeleteError) {
            console.error(
              "❌ Node assessment deletion failed:",
              assessmentDeleteError
            );
            throw new Error(
              `Node assessment deletion failed: ${assessmentDeleteError.message}`
            );
          }
          console.log("✅ Node assessments deleted");
        }

        // Delete node content
        console.log("🗑️ Deleting node content...");
        const { error: contentDeleteError } = await supabase
          .from("node_content")
          .delete()
          .eq("node_id", nodeId);

        if (contentDeleteError) {
          console.error("❌ Node content deletion failed:", contentDeleteError);
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Node content deleted");
        }

        // Delete student progress for this node
        console.log("🗑️ Deleting student progress...");
        const { error: progressDeleteError } = await supabase
          .from("student_node_progress")
          .delete()
          .eq("node_id", nodeId);

        if (progressDeleteError) {
          console.error(
            "❌ Student progress deletion failed:",
            progressDeleteError
          );
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Student progress deleted");
        }

        // Delete node leaderboard entries
        console.log("🗑️ Deleting leaderboard entries...");
        const { error: leaderboardDeleteError } = await supabase
          .from("node_leaderboard")
          .delete()
          .eq("node_id", nodeId);

        if (leaderboardDeleteError) {
          console.error(
            "❌ Leaderboard deletion failed:",
            leaderboardDeleteError
          );
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Leaderboard entries deleted");
        }

        // Delete paths connected to this node
        console.log("🗑️ Deleting paths connected to node...");
        const { error: pathDeleteError1 } = await supabase
          .from("node_paths")
          .delete()
          .eq("source_node_id", nodeId);

        const { error: pathDeleteError2 } = await supabase
          .from("node_paths")
          .delete()
          .eq("destination_node_id", nodeId);

        if (pathDeleteError1 || pathDeleteError2) {
          console.error(
            "❌ Path deletion failed:",
            pathDeleteError1 || pathDeleteError2
          );
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Paths deleted");
        }

        // Finally delete the node itself
        console.log("🗑️ Deleting the node itself...");
        const { error: nodeDeleteError } = await supabase
          .from("map_nodes")
          .delete()
          .eq("id", nodeId);

        if (nodeDeleteError) {
          console.error("❌ Node deletion failed:", nodeDeleteError);
          throw new Error(
            `Node deletion failed for ${nodeId}: ${nodeDeleteError.message}`
          );
        }
        console.log(`✅ Node ${nodeId} deleted successfully`);
      }
    }

    // 3. Delete operations for other entities (excluding nodes which are handled above)
    console.log("🗑️ Step 3: Performing other delete operations...");

    if (updates.quizQuestions.delete.length > 0) {
      console.log("🗑️ Deleting quiz questions:", updates.quizQuestions.delete);
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .in("id", updates.quizQuestions.delete);
      if (error) {
        console.error("❌ Quiz question deletion failed:", error);
        throw new Error(`Quiz question deletion failed: ${error.message}`);
      }
      console.log("✅ Quiz questions deleted");
    }

    if (updates.assessments.delete.length > 0) {
      console.log("🗑️ Deleting assessments:", updates.assessments.delete);

      // First delete quiz questions for these assessments
      const { error: quizError } = await supabase
        .from("quiz_questions")
        .delete()
        .in("assessment_id", updates.assessments.delete);

      if (quizError) {
        console.error(
          "❌ Quiz question deletion for assessments failed:",
          quizError
        );
        // Continue anyway
      }

      // Then delete the assessments
      const { error } = await supabase
        .from("node_assessments")
        .delete()
        .in("id", updates.assessments.delete);
      if (error) {
        console.error("❌ Assessment deletion failed:", error);
        throw new Error(`Assessment deletion failed: ${error.message}`);
      }
      console.log("✅ Assessments deleted");
    }

    if (updates.content.delete.length > 0) {
      console.log("🗑️ Deleting content:", updates.content.delete);
      const { error } = await supabase
        .from("node_content")
        .delete()
        .in("id", updates.content.delete);
      if (error) {
        console.error("❌ Content deletion failed:", error);
        throw new Error(`Content deletion failed: ${error.message}`);
      }
      console.log("✅ Content deleted");
    }

    if (updates.paths.delete.length > 0) {
      console.log("🗑️ Deleting paths:", updates.paths.delete);
      const { error } = await supabase
        .from("node_paths")
        .delete()
        .in("id", updates.paths.delete);
      if (error) {
        console.error("❌ Path deletion failed:", error);
        throw new Error(`Path deletion failed: ${error.message}`);
      }
      console.log("✅ Paths deleted");
    }

    // 4. Create operations
    console.log("➕ Step 4: Performing create operations...");
    const createdNodeMap = new Map<string, string>(); // temp_id -> real_id
    const createdAssessmentMap = new Map<string, string>(); // temp_assessment_id -> real_id

    if (updates.nodes.create.length > 0) {
      console.log("➕ Creating nodes:", updates.nodes.create);
      const { data: createdNodes, error } = await supabase
        .from("map_nodes")
        .insert(updates.nodes.create)
        .select("*");

      if (error) {
        console.error("❌ Node creation failed:", error);
        throw new Error(`Node creation failed: ${error.message}`);
      }

      if (!createdNodes || createdNodes.length === 0) {
        console.error("❌ No nodes were created");
        throw new Error("Node creation returned no data");
      }

      console.log("✅ Nodes created:", createdNodes.length);
      console.log(
        "📊 Created nodes:",
        createdNodes.map((n) => ({ id: n.id, title: n.title }))
      );

      // FIXED: Map temp IDs to real IDs by matching properties in order
      createdNodes.forEach((createdNode, index) => {
        const originalNodeToCreate = updates.nodes.create[index];
        if (originalNodeToCreate) {
          // Find the original temp node from the client state by matching properties
          // This is a more robust approach than relying on titles alone
          const potentialTempIds = [
            `temp_node_${originalNodeToCreate.title}_${index}`,
            `temp_node_${index}`,
            // Try to extract from any metadata if available
            ...(originalNodeToCreate.metadata &&
            typeof originalNodeToCreate.metadata === "object" &&
            "temp_id" in originalNodeToCreate.metadata
              ? [originalNodeToCreate.metadata.temp_id]
              : []),
          ];

          // Also check all paths to find references to temp nodes
          const allPaths = [...updates.paths.create];
          const tempIdFromPaths = allPaths.find(
            (path) =>
              path.source_node_id?.startsWith("temp_node_") ||
              path.destination_node_id?.startsWith("temp_node_")
          );

          if (tempIdFromPaths) {
            // Extract temp IDs from path references
            const tempIds = [
              tempIdFromPaths.source_node_id,
              tempIdFromPaths.destination_node_id,
            ].filter((id) => id?.startsWith("temp_node_"));

            tempIds.forEach((tempId) => {
              if (tempId && !createdNodeMap.has(tempId)) {
                // Match by index if we can determine it
                const tempIndex = parseInt(tempId.split("_")[2]) || index;
                if (tempIndex === index) {
                  createdNodeMap.set(tempId, createdNode.id);
                  console.log(
                    `🔗 Mapped temp node ${tempId} to real node ${createdNode.id} (via path reference)`
                  );
                }
              }
            });
          }

          // Fallback: create a mapping based on creation order
          const fallbackTempId =
            `temp_node_${Date.now()}_${Math.random()}`.substring(0, 50); // Ensure reasonable length

          // Check if we already have a mapping for this node
          let tempIdFound = false;
          for (const [tempId, realId] of createdNodeMap.entries()) {
            if (realId === createdNode.id) {
              tempIdFound = true;
              break;
            }
          }

          if (!tempIdFound) {
            // Use a predictable temp ID pattern that the frontend can generate
            const predictableTempId = `temp_node_${originalNodeToCreate.title?.replace(/\s+/g, "_")}_${index}`;
            createdNodeMap.set(predictableTempId, createdNode.id);
            console.log(
              `🔗 Mapped predictable temp node ${predictableTempId} to real node ${createdNode.id}`
            );

            // Also map any title-based patterns
            potentialTempIds.forEach((potentialId) => {
              if (potentialId && !createdNodeMap.has(potentialId)) {
                createdNodeMap.set(potentialId, createdNode.id);
                console.log(
                  `🔗 Alternative mapping: ${potentialId} -> ${createdNode.id}`
                );
              }
            });
          }
        }
      });

      console.log("📋 Final node mapping:", Object.fromEntries(createdNodeMap));
    }

    if (updates.paths.create.length > 0) {
      console.log("➕ Creating paths:", updates.paths.create);

      // FIXED: Better temp node ID resolution for paths
      const pathsToCreate = updates.paths.create.map((path, index) => {
        let mappedSourceId = path.source_node_id;
        let mappedTargetId = path.destination_node_id;

        // Try direct mapping first
        if (createdNodeMap.has(path.source_node_id)) {
          mappedSourceId = createdNodeMap.get(path.source_node_id)!;
        } else if (path.source_node_id.startsWith("temp_node_")) {
          // Try to find by different patterns
          for (const [tempId, realId] of createdNodeMap.entries()) {
            if (
              tempId.includes(path.source_node_id.split("_")[2]) ||
              path.source_node_id.includes(tempId.split("_")[2])
            ) {
              mappedSourceId = realId;
              console.log(
                `🔍 Found source mapping via pattern: ${path.source_node_id} -> ${realId}`
              );
              break;
            }
          }

          // If still not found, this might be an existing node ID
          if (
            mappedSourceId === path.source_node_id &&
            path.source_node_id.startsWith("temp_node_")
          ) {
            console.error(
              `❌ Could not resolve temp source node ID: ${path.source_node_id}`
            );
            console.error(
              "Available mappings:",
              Object.fromEntries(createdNodeMap)
            );
            throw new Error(
              `Could not resolve temporary source node ID: ${path.source_node_id}`
            );
          }
        }

        if (createdNodeMap.has(path.destination_node_id)) {
          mappedTargetId = createdNodeMap.get(path.destination_node_id)!;
        } else if (path.destination_node_id.startsWith("temp_node_")) {
          // Try to find by different patterns
          for (const [tempId, realId] of createdNodeMap.entries()) {
            if (
              tempId.includes(path.destination_node_id.split("_")[2]) ||
              path.destination_node_id.includes(tempId.split("_")[2])
            ) {
              mappedTargetId = realId;
              console.log(
                `🔍 Found target mapping via pattern: ${path.destination_node_id} -> ${realId}`
              );
              break;
            }
          }

          // If still not found, this might be an existing node ID
          if (
            mappedTargetId === path.destination_node_id &&
            path.destination_node_id.startsWith("temp_node_")
          ) {
            console.error(
              `❌ Could not resolve temp destination node ID: ${path.destination_node_id}`
            );
            console.error(
              "Available mappings:",
              Object.fromEntries(createdNodeMap)
            );
            throw new Error(
              `Could not resolve temporary destination node ID: ${path.destination_node_id}`
            );
          }
        }

        const mappedPath = {
          source_node_id: mappedSourceId,
          destination_node_id: mappedTargetId,
        };

        console.log(`🔗 Path ${index} mapping:`, {
          original: path,
          mapped: mappedPath,
          sourceResolved: mappedSourceId !== path.source_node_id,
          targetResolved: mappedTargetId !== path.destination_node_id,
        });

        return mappedPath;
      });

      // Validate all paths have valid UUIDs before inserting
      const invalidPaths = pathsToCreate.filter(
        (path) =>
          path.source_node_id.startsWith("temp_") ||
          path.destination_node_id.startsWith("temp_")
      );

      if (invalidPaths.length > 0) {
        console.error("❌ Found paths with unresolved temp IDs:", invalidPaths);
        throw new Error(
          `Cannot create paths with temporary IDs: ${invalidPaths.map((p) => `${p.source_node_id} -> ${p.destination_node_id}`).join(", ")}`
        );
      }

      const { error } = await supabase.from("node_paths").insert(pathsToCreate);
      if (error) {
        console.error("❌ Path creation failed:", error);
        console.error("❌ Attempted to insert paths:", pathsToCreate);
        throw new Error(`Path creation failed: ${error.message}`);
      }
      console.log("✅ Paths created successfully");
    }

    if (updates.content.create.length > 0) {
      console.log("➕ Creating content:", updates.content.create);

      // Map temp node IDs to real IDs in content
      const contentToCreate = updates.content.create.map((content) => {
        const mappedContent = {
          ...content,
          node_id: createdNodeMap.get(content.node_id!) || content.node_id,
        };
        console.log("🔗 Content mapping:", {
          original: content,
          mapped: mappedContent,
        });
        return mappedContent;
      });

      const { error } = await supabase
        .from("node_content")
        .insert(contentToCreate);
      if (error) {
        console.error("❌ Content creation failed:", error);
        throw new Error(`Content creation failed: ${error.message}`);
      }
      console.log("✅ Content created");
    }

    if (updates.assessments.create.length > 0) {
      console.log("➕ Creating assessments:", updates.assessments.create);

      // Map temp node IDs to real IDs in assessments
      const assessmentsToCreate = updates.assessments.create.map(
        (assessment) => {
          const mappedAssessment = {
            ...assessment,
            node_id:
              createdNodeMap.get(assessment.node_id!) || assessment.node_id,
          };
          console.log("🔗 Assessment node mapping:", {
            original: assessment,
            mapped: mappedAssessment,
            nodeIdResolved: mappedAssessment.node_id !== assessment.node_id,
          });
          return mappedAssessment;
        }
      );

      // Validate all assessments have valid node IDs before inserting
      const invalidAssessments = assessmentsToCreate.filter((assessment) =>
        assessment.node_id?.startsWith("temp_")
      );

      if (invalidAssessments.length > 0) {
        console.error(
          "❌ Found assessments with unresolved temp node IDs:",
          invalidAssessments
        );
        console.error(
          "Available node mappings:",
          Object.fromEntries(createdNodeMap)
        );
        throw new Error(
          `Cannot create assessments with temporary node IDs: ${invalidAssessments.map((a) => a.node_id).join(", ")}`
        );
      }

      const { data: createdAssessments, error } = await supabase
        .from("node_assessments")
        .insert(assessmentsToCreate)
        .select("*");

      if (error) {
        console.error("❌ Assessment creation failed:", error);
        throw new Error(`Assessment creation failed: ${error.message}`);
      }

      if (!createdAssessments || createdAssessments.length === 0) {
        console.error("❌ No assessments were created");
        throw new Error("Assessment creation returned no data");
      }

      console.log("✅ Assessments created:", createdAssessments.length);
      console.log(
        "📊 Created assessments:",
        createdAssessments.map((a) => ({
          id: a.id,
          node_id: a.node_id,
          type: a.assessment_type,
        }))
      );

      // Map temporary assessment IDs to real ones
      // First, collect all unique temp assessment IDs from quiz questions
      const tempAssessmentIds = [
        ...new Set(
          updates.quizQuestions.create
            .map((q) => q.assessment_id)
            .filter((id) => id?.startsWith("temp_assessment_"))
        ),
      ].filter(Boolean) as string[];

      console.log(
        "🔍 Found temp assessment IDs in quiz questions:",
        tempAssessmentIds
      );

      createdAssessments.forEach((createdAssessment, index) => {
        // Map each created assessment to its corresponding temp ID
        if (tempAssessmentIds[index]) {
          createdAssessmentMap.set(
            tempAssessmentIds[index],
            createdAssessment.id
          );
          console.log(
            `🔗 Mapped temp assessment ${tempAssessmentIds[index]} to real assessment ${createdAssessment.id}`
          );
        } else {
          // Fallback: create predictable mapping
          const originalAssessmentToCreate = updates.assessments.create[index];
          if (originalAssessmentToCreate) {
            const predictableTempId = `temp_assessment_${originalAssessmentToCreate.node_id}_${index}`;
            createdAssessmentMap.set(predictableTempId, createdAssessment.id);
            console.log(
              `🔗 Mapped predictable temp assessment ${predictableTempId} to real assessment ${createdAssessment.id}`
            );
          }
        }
      });

      console.log(
        "📋 Final assessment mapping:",
        Object.fromEntries(createdAssessmentMap)
      );
    }

    if (updates.quizQuestions.create.length > 0) {
      console.log("➕ Creating quiz questions:", updates.quizQuestions.create);

      // Map temp assessment IDs to real IDs in quiz questions
      const quizQuestionsToCreate = updates.quizQuestions.create.map(
        (question) => {
          const mappedQuestion = {
            ...question,
            assessment_id:
              createdAssessmentMap.get(question.assessment_id!) ||
              question.assessment_id,
          };
          console.log("🔗 Quiz question mapping:", {
            original: question,
            mapped: mappedQuestion,
            assessmentIdResolved:
              mappedQuestion.assessment_id !== question.assessment_id,
          });
          return mappedQuestion;
        }
      );

      // Validate all questions have valid assessment IDs before inserting
      const invalidQuestions = quizQuestionsToCreate.filter((question) =>
        question.assessment_id?.startsWith("temp_")
      );

      if (invalidQuestions.length > 0) {
        console.error(
          "❌ Found quiz questions with unresolved temp assessment IDs:",
          invalidQuestions
        );
        console.error(
          "Available assessment mappings:",
          Object.fromEntries(createdAssessmentMap)
        );
        throw new Error(
          `Cannot create quiz questions with temporary assessment IDs: ${invalidQuestions.map((q) => q.assessment_id).join(", ")}`
        );
      }

      const { error } = await supabase
        .from("quiz_questions")
        .insert(quizQuestionsToCreate);
      if (error) {
        console.error("❌ Quiz question creation failed:", error);
        console.error(
          "❌ Attempted to insert questions:",
          quizQuestionsToCreate
        );
        throw new Error(`Quiz question creation failed: ${error.message}`);
      }
      console.log("✅ Quiz questions created");
    }

    // 4. Update operations
    console.log("📝 Step 4: Performing update operations...");

    for (const node of updates.nodes.update) {
      console.log("📝 Updating node:", node.id);
      const { id, ...nodeData } = node;
      const { error } = await supabase
        .from("map_nodes")
        .update(nodeData)
        .eq("id", id);
      if (error) {
        console.error("❌ Node update failed:", error);
        throw new Error(`Node update failed for ${id}: ${error.message}`);
      }
    }
    if (updates.nodes.update.length > 0) {
      console.log("✅ Nodes updated:", updates.nodes.update.length);
    }

    for (const content of updates.content.update) {
      console.log("📝 Updating content:", content.id);
      const { id, ...contentData } = content;
      const { error } = await supabase
        .from("node_content")
        .update(contentData)
        .eq("id", id);
      if (error) {
        console.error("❌ Content update failed:", error);
        throw new Error(`Content update failed for ${id}: ${error.message}`);
      }
    }
    if (updates.content.update.length > 0) {
      console.log("✅ Content updated:", updates.content.update.length);
    }

    for (const assessment of updates.assessments.update) {
      console.log("📝 Updating assessment:", assessment.id);
      const { id, ...assessmentData } = assessment;
      const { error } = await supabase
        .from("node_assessments")
        .update(assessmentData)
        .eq("id", id);
      if (error) {
        console.error("❌ Assessment update failed:", error);
        throw new Error(`Assessment update failed for ${id}: ${error.message}`);
      }
    }
    if (updates.assessments.update.length > 0) {
      console.log("✅ Assessments updated:", updates.assessments.update.length);
    }

    for (const question of updates.quizQuestions.update) {
      console.log("📝 Updating quiz question:", question.id);
      const { id, ...questionData } = question;
      const { error } = await supabase
        .from("quiz_questions")
        .update(questionData)
        .eq("id", id);
      if (error) {
        console.error("❌ Quiz question update failed:", error);
        throw new Error(
          `Quiz question update failed for ${id}: ${error.message}`
        );
      }
    }
    if (updates.quizQuestions.update.length > 0) {
      console.log(
        "✅ Quiz questions updated:",
        updates.quizQuestions.update.length
      );
    }

    console.log("🎉 Batch update completed successfully!");
  } catch (error) {
    console.error("❌ Batch update failed:", error);
    console.error("❌ Error type:", typeof error);
    console.error("❌ Error details:", {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
    });

    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Batch update failed: ${String(error)}`);
    }
  }
};

// --- User Map Enrollment Functions moved to enrollment.ts ---

// --- Progress Calculation and Enrollment Functions moved to enrollment.ts ---
// Import from '@/lib/supabase/enrollment' for:
// - enrollUserInMap
// - isUserEnrolledInMap
// - getUserMapEnrollment
// - updateMapEnrollmentProgress
// - getUserEnrolledMapsWithProgress
// - getUserEnrolledMaps
//
//
// Import from '@/lib/supabase/progress' for:
// - loadMapProgress
// - calculateMapProgress
