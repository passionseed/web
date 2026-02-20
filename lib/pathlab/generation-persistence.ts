import { createClient } from "@/utils/supabase/server";
import type {
  PathLabGeneratorAssessmentDraft,
  PathLabGeneratorDraft,
  PathLabGeneratorRequest,
} from "@/types/pathlab-generator";

interface GeneratedNodeRow {
  id: string;
  map_id: string;
  title: string;
  instructions: string;
  difficulty: number;
  sprite_url: null;
  node_type: "learning";
  metadata: {
    position: {
      x: number;
      y: number;
    };
    generated_key: string;
    generated: true;
  };
}

interface PathLabBaseContext {
  seed: {
    id: string;
    title: string;
    slogan: string | null;
    description: string | null;
    map_id: string;
    seed_type: string;
    category_id: string | null;
  };
  path: {
    id: string;
    total_days: number;
    seed_id: string;
  };
}

export interface PathLabDraftSnapshot {
  seed: {
    id: string;
    title: string;
    slogan: string | null;
    description: string | null;
    category_id: string | null;
  };
  path: {
    id: string;
    total_days: number;
  };
  mapId: string;
  days: Array<{
    id: string;
    day_number: number;
    title: string | null;
    context_text: string;
    reflection_prompts: string[];
    node_ids: string[];
  }>;
  nodes: Array<{
    id: string;
    key: string;
    title: string;
    instructions: string;
    difficulty: number;
    content: Array<{
      id: string;
      content_type: string;
      content_title: string | null;
      content_url: string | null;
      content_body: string | null;
      display_order: number;
    }>;
    assessment:
      | {
          id: string;
          assessment_type: string;
          metadata: Record<string, unknown> | null;
          points_possible: number | null;
          is_graded: boolean;
          quiz_questions: Array<{
            id: string;
            question_text: string;
            options: Array<{ option: string; text: string }> | null;
            correct_option: string | null;
          }>;
        }
      | null;
  }>;
  edges: Array<{
    source_node_id: string;
    destination_node_id: string;
  }>;
}

function difficultyToNumber(value: string): number {
  if (value === "advanced") return 3;
  if (value === "intermediate") return 2;
  return 1;
}

function numberToDifficulty(value: number): "beginner" | "intermediate" | "advanced" {
  if (value >= 3) return "advanced";
  if (value >= 2) return "intermediate";
  return "beginner";
}

function normalizePromptConstraints(constraints?: string | null): string | undefined {
  const value = constraints?.trim();
  return value ? value : undefined;
}

function getNodePosition(index: number) {
  const columns = 4;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 140 + column * 280,
    y: 140 + row * 180,
  };
}

function toGeneratedNodeRows(draft: PathLabGeneratorDraft, mapId: string): {
  nodeRows: GeneratedNodeRow[];
  keyToNodeId: Map<string, string>;
} {
  const keyToNodeId = new Map<string, string>();
  const nodeRows = draft.nodes.map((node, index) => {
    const nodeId = crypto.randomUUID();
    keyToNodeId.set(node.key, nodeId);

    return {
      id: nodeId,
      map_id: mapId,
      title: node.title,
      instructions: node.instructions,
      difficulty: difficultyToNumber(node.difficulty),
      sprite_url: null,
      node_type: "learning" as const,
      metadata: {
        position: getNodePosition(index),
        generated_key: node.key,
        generated: true as const,
      },
    };
  });

  return { nodeRows, keyToNodeId };
}

function buildAssessmentRow(
  nodeId: string,
  assessment: PathLabGeneratorAssessmentDraft,
): {
  node_id: string;
  assessment_type: "quiz" | "text_answer" | "file_upload" | "checklist";
  metadata: Record<string, unknown> | null;
  points_possible: number | null;
  is_graded: boolean;
} | null {
  if (assessment.type === "none") {
    return null;
  }

  const assessmentType = assessment.type;
  if (![
    "quiz",
    "text_answer",
    "file_upload",
    "checklist",
  ].includes(assessmentType)) {
    return null;
  }

  let metadata: Record<string, unknown> | null = null;
  if (assessmentType === "checklist") {
    metadata = { items: assessment.checklist_items || [] };
  } else if (assessment.prompt) {
    metadata = { prompt: assessment.prompt };
  }

  return {
    node_id: nodeId,
    assessment_type: assessmentType as "quiz" | "text_answer" | "file_upload" | "checklist",
    metadata,
    points_possible: assessment.points_possible ?? (assessmentType === "quiz" ? 10 : null),
    is_graded: assessmentType === "quiz",
  };
}

async function insertDraftStructures(params: {
  mapId: string;
  pathId: string;
  draft: PathLabGeneratorDraft;
  replaceExisting: boolean;
}) {
  const supabase = await createClient();
  const { mapId, pathId, draft, replaceExisting } = params;

  // TODO: OPTIMIZATION #3 - Database Transactions (Part 2)
  // ================================================
  // This function also needs transaction wrapping, especially for the replace scenario.
  // When replaceExisting=true, we delete old data then insert new data. If the insert
  // fails after deletion, we've lost the old data.
  //
  // IMPLEMENTATION APPROACH:
  // 1. Wrap the entire replace + insert operation in a transaction
  // 2. Use the same PostgreSQL function approach as createPathLabDraftFromGeneration
  // 3. Create a separate RPC function: `replace_pathlab_draft_structures`
  //
  // 4. Transaction flow for replace:
  //    BEGIN;
  //      DELETE FROM path_days WHERE path_id = ...;
  //      DELETE FROM map_nodes WHERE map_id = ...;
  //      INSERT INTO map_nodes (...) VALUES (...);
  //      INSERT INTO node_content (...) VALUES (...);
  //      INSERT INTO node_assessments (...) VALUES (...);
  //      INSERT INTO quiz_questions (...) VALUES (...);
  //      INSERT INTO node_paths (...) VALUES (...);
  //      INSERT INTO path_days (...) VALUES (...);
  //      UPDATE paths SET total_days = ... WHERE id = ...;
  //    COMMIT;
  //
  // 5. Benefits:
  //    - Prevent data loss during replace operations
  //    - Ensure all related data (nodes, content, assessments) are inserted together
  //    - Better error recovery
  //
  // 6. Implementation priority: High for data integrity
  // ================================================

  if (replaceExisting) {
    const { error: deleteDaysError } = await supabase
      .from("path_days")
      .delete()
      .eq("path_id", pathId);

    if (deleteDaysError) {
      throw new Error(deleteDaysError.message);
    }

    const { error: deleteNodesError } = await supabase
      .from("map_nodes")
      .delete()
      .eq("map_id", mapId);

    if (deleteNodesError) {
      throw new Error(deleteNodesError.message);
    }
  }

  const { nodeRows, keyToNodeId } = toGeneratedNodeRows(draft, mapId);

  if (nodeRows.length > 0) {
    const { error: insertNodesError } = await supabase.from("map_nodes").insert(nodeRows);
    if (insertNodesError) {
      throw new Error(insertNodesError.message);
    }
  }

  const contentRows: Array<{
    node_id: string;
    content_type: "text" | "video" | "pdf" | "image" | "resource_link";
    content_title: string | null;
    content_url: string | null;
    content_body: string | null;
    display_order: number;
  }> = [];

  const assessmentsToCreate: Array<{
    nodeKey: string;
    row: {
      node_id: string;
      assessment_type: "quiz" | "text_answer" | "file_upload" | "checklist";
      metadata: Record<string, unknown> | null;
      points_possible: number | null;
      is_graded: boolean;
    };
  }> = [];

  draft.nodes.forEach((node) => {
    const nodeId = keyToNodeId.get(node.key);
    if (!nodeId) return;

    node.content.forEach((content, contentIndex) => {
      contentRows.push({
        node_id: nodeId,
        content_type: content.type,
        content_title: content.title || null,
        content_url: content.url || null,
        content_body: content.body || null,
        display_order: contentIndex,
      });
    });

    const assessmentRow = buildAssessmentRow(nodeId, node.assessment);
    if (assessmentRow) {
      assessmentsToCreate.push({
        nodeKey: node.key,
        row: assessmentRow,
      });
    }
  });

  if (contentRows.length > 0) {
    const { error: contentError } = await supabase.from("node_content").insert(contentRows);
    if (contentError) {
      throw new Error(contentError.message);
    }
  }

  if (assessmentsToCreate.length > 0) {
    const { data: createdAssessments, error: assessmentError } = await supabase
      .from("node_assessments")
      .insert(assessmentsToCreate.map((entry) => entry.row))
      .select("id, node_id");

    if (assessmentError) {
      throw new Error(assessmentError.message);
    }

    const assessmentIdByNodeId = new Map<string, string>();
    for (const assessment of createdAssessments || []) {
      assessmentIdByNodeId.set(assessment.node_id, assessment.id);
    }

    const quizRows: Array<{
      assessment_id: string;
      question_text: string;
      options: Array<{ option: string; text: string }>;
      correct_option: string;
    }> = [];

    for (const node of draft.nodes) {
      if (node.assessment.type !== "quiz") continue;

      const nodeId = keyToNodeId.get(node.key);
      if (!nodeId) continue;
      const assessmentId = assessmentIdByNodeId.get(nodeId);
      if (!assessmentId) continue;

      for (const question of node.assessment.quiz_questions || []) {
        quizRows.push({
          assessment_id: assessmentId,
          question_text: question.question_text,
          options: question.options,
          correct_option: question.correct_option,
        });
      }
    }

    if (quizRows.length > 0) {
      const { error: quizError } = await supabase.from("quiz_questions").insert(quizRows);
      if (quizError) {
        throw new Error(quizError.message);
      }
    }
  }

  const edgeRows = draft.edges
    .map((edge) => {
      const sourceNodeId = keyToNodeId.get(edge.source_key);
      const destinationNodeId = keyToNodeId.get(edge.destination_key);
      if (!sourceNodeId || !destinationNodeId) return null;
      return {
        source_node_id: sourceNodeId,
        destination_node_id: destinationNodeId,
      };
    })
    .filter((edge): edge is { source_node_id: string; destination_node_id: string } => !!edge);

  if (edgeRows.length > 0) {
    const { error: edgeError } = await supabase.from("node_paths").insert(edgeRows);
    if (edgeError) {
      throw new Error(edgeError.message);
    }
  }

  const dayRows = draft.days.map((day) => ({
    path_id: pathId,
    day_number: day.day_number,
    title: day.title || null,
    context_text: day.context_text,
    reflection_prompts: day.reflection_prompts,
    node_ids: day.node_keys
      .map((key) => keyToNodeId.get(key))
      .filter((nodeId): nodeId is string => !!nodeId),
  }));

  if (dayRows.length > 0) {
    const { error: dayError } = await supabase.from("path_days").insert(dayRows);
    if (dayError) {
      throw new Error(dayError.message);
    }
  }

  const { error: updatePathError } = await supabase
    .from("paths")
    .update({ total_days: draft.path.total_days })
    .eq("id", pathId);

  if (updatePathError) {
    throw new Error(updatePathError.message);
  }

  return {
    nodeCount: nodeRows.length,
    dayCount: dayRows.length,
  };
}

export async function createPathLabDraftFromGeneration(params: {
  userId: string;
  request: PathLabGeneratorRequest;
  draft: PathLabGeneratorDraft;
}) {
  const supabase = await createClient();
  const { userId, request, draft } = params;

  let mapId: string | null = null;

  // TODO: OPTIMIZATION #3 - Database Transactions
  // ================================================
  // Currently, this function performs multiple sequential database operations without
  // a transaction wrapper. If any step fails partway through, we're left with partial
  // data (e.g., a map and seed created, but nodes failed to insert).
  //
  // IMPLEMENTATION APPROACH:
  // 1. Wrap all operations in a Supabase transaction using RPC function:
  //    - Create a PostgreSQL function `create_pathlab_draft_transaction` in Supabase
  //    - The function should accept all necessary parameters (map, seed, path, nodes, etc.)
  //    - Use PostgreSQL's BEGIN...COMMIT with ROLLBACK on error
  //
  // 2. Alternative approach using application-level transaction pattern:
  //    - Collect all insert operations into a single batch
  //    - Use Supabase RPC to call a stored procedure that handles the transaction
  //    - Example: await supabase.rpc('create_pathlab_draft', { draft_data: ... })
  //
  // 3. Benefits of transaction wrapper:
  //    - Atomic operations - all succeed or all fail
  //    - No orphaned data in the database
  //    - Easier error handling and rollback
  //    - Better data consistency
  //
  // 4. Supabase transaction pattern example:
  //    ```sql
  //    CREATE OR REPLACE FUNCTION create_pathlab_draft_transaction(
  //      p_map_data jsonb,
  //      p_seed_data jsonb,
  //      p_path_data jsonb,
  //      p_nodes_data jsonb,
  //      p_days_data jsonb
  //    ) RETURNS jsonb AS $$
  //    DECLARE
  //      v_map_id uuid;
  //      v_seed_id uuid;
  //      v_path_id uuid;
  //    BEGIN
  //      -- Insert map
  //      INSERT INTO learning_maps (...) VALUES (...) RETURNING id INTO v_map_id;
  //      -- Insert seed
  //      INSERT INTO seeds (...) VALUES (...) RETURNING id INTO v_seed_id;
  //      -- Insert path
  //      INSERT INTO paths (...) VALUES (...) RETURNING id INTO v_path_id;
  //      -- Insert nodes (batch)
  //      INSERT INTO map_nodes (...) SELECT * FROM jsonb_to_recordset(p_nodes_data);
  //      -- Insert days (batch)
  //      INSERT INTO path_days (...) SELECT * FROM jsonb_to_recordset(p_days_data);
  //
  //      RETURN jsonb_build_object(
  //        'map_id', v_map_id,
  //        'seed_id', v_seed_id,
  //        'path_id', v_path_id
  //      );
  //    END;
  //    $$ LANGUAGE plpgsql;
  //    ```
  //
  // 5. Impact: Medium - Improves data consistency and error handling
  //    Priority: High for production stability
  // ================================================

  try {
    const { data: map, error: mapError } = await supabase
      .from("learning_maps")
      .insert({
        title: `${draft.seed.title} Map`,
        description: draft.seed.description,
        creator_id: userId,
        map_type: "private",
        visibility: "private",
      })
      .select("id")
      .single();

    if (mapError || !map) {
      throw new Error(mapError?.message || "Failed to create map");
    }

    mapId = map.id;

    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .insert({
        map_id: map.id,
        title: draft.seed.title,
        slogan: draft.seed.slogan,
        description: draft.seed.description,
        category_id: request.categoryId || null,
        seed_type: "pathlab",
        created_by: userId,
      })
      .select("id")
      .single();

    if (seedError || !seed) {
      throw new Error(seedError?.message || "Failed to create seed");
    }

    const { data: path, error: pathError } = await supabase
      .from("paths")
      .insert({
        seed_id: seed.id,
        total_days: draft.path.total_days,
        created_by: userId,
      })
      .select("id")
      .single();

    if (pathError || !path) {
      throw new Error(pathError?.message || "Failed to create path");
    }

    const structureResult = await insertDraftStructures({
      mapId: map.id,
      pathId: path.id,
      draft,
      replaceExisting: false,
    });

    const { error: updateMapError } = await supabase
      .from("learning_maps")
      .update({
        title: `${draft.seed.title} Map`,
        description: draft.seed.description,
        map_type: "seed",
        parent_seed_id: seed.id,
        visibility: "public",
      })
      .eq("id", map.id);

    if (updateMapError) {
      throw new Error(updateMapError.message);
    }

    return {
      seedId: seed.id,
      mapId: map.id,
      pathId: path.id,
      dayCount: structureResult.dayCount,
      nodeCount: structureResult.nodeCount,
    };
  } catch (error) {
    if (mapId) {
      await supabase.from("learning_maps").delete().eq("id", mapId);
    }
    throw error;
  }
}

async function getPathLabBaseContext(seedId: string): Promise<PathLabBaseContext> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seeds")
    .select("id, title, slogan, description, map_id, seed_type, category_id, path:paths(id, total_days, seed_id)")
    .eq("id", seedId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Seed not found");
  }

  if (data.seed_type !== "pathlab") {
    throw new Error("Seed is not a PathLab seed");
  }

  const path = Array.isArray((data as any).path)
    ? (data as any).path[0]
    : (data as any).path;

  if (!path?.id) {
    throw new Error("PathLab path not found");
  }

  return {
    seed: {
      id: data.id,
      title: data.title,
      slogan: data.slogan,
      description: data.description,
      map_id: data.map_id,
      seed_type: data.seed_type,
      category_id: data.category_id,
    },
    path: {
      id: path.id,
      total_days: path.total_days,
      seed_id: path.seed_id,
    },
  };
}

export async function replacePathLabDraftFromGeneration(params: {
  seedId: string;
  request: PathLabGeneratorRequest;
  draft: PathLabGeneratorDraft;
}) {
  const supabase = await createClient();
  const { seedId, request, draft } = params;

  const context = await getPathLabBaseContext(seedId);

  const { error: updateSeedError } = await supabase
    .from("seeds")
    .update({
      title: draft.seed.title,
      slogan: draft.seed.slogan,
      description: draft.seed.description,
      category_id: request.categoryId || context.seed.category_id,
    })
    .eq("id", context.seed.id);

  if (updateSeedError) {
    throw new Error(updateSeedError.message);
  }

  const { error: updateMapError } = await supabase
    .from("learning_maps")
    .update({
      title: `${draft.seed.title} Map`,
      description: draft.seed.description,
    })
    .eq("id", context.seed.map_id);

  if (updateMapError) {
    throw new Error(updateMapError.message);
  }

  const structureResult = await insertDraftStructures({
    mapId: context.seed.map_id,
    pathId: context.path.id,
    draft,
    replaceExisting: true,
  });

  return {
    seedId: context.seed.id,
    mapId: context.seed.map_id,
    pathId: context.path.id,
    dayCount: structureResult.dayCount,
    nodeCount: structureResult.nodeCount,
  };
}

export async function getPathLabDraftSnapshot(seedId: string): Promise<PathLabDraftSnapshot> {
  const supabase = await createClient();
  const context = await getPathLabBaseContext(seedId);

  const [{ data: days, error: daysError }, { data: nodes, error: nodesError }] = await Promise.all([
    supabase
      .from("path_days")
      .select("id, day_number, title, context_text, reflection_prompts, node_ids")
      .eq("path_id", context.path.id)
      .order("day_number", { ascending: true }),
    supabase
      .from("map_nodes")
      .select(
        "id, title, instructions, difficulty, metadata, node_content(id, content_type, content_title, content_url, content_body, display_order), node_assessments(id, assessment_type, metadata, points_possible, is_graded, quiz_questions(id, question_text, options, correct_option))",
      )
      .eq("map_id", context.seed.map_id)
      .order("created_at", { ascending: true }),
  ]);

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (nodesError) {
    throw new Error(nodesError.message);
  }

  const nodeIds = (nodes || []).map((node) => node.id);
  let edges: Array<{ source_node_id: string; destination_node_id: string }> = [];

  if (nodeIds.length > 0) {
    const { data: edgeRows, error: edgeError } = await supabase
      .from("node_paths")
      .select("source_node_id, destination_node_id")
      .in("source_node_id", nodeIds);

    if (edgeError) {
      throw new Error(edgeError.message);
    }

    edges = edgeRows || [];
  }

  return {
    seed: {
      id: context.seed.id,
      title: context.seed.title,
      slogan: context.seed.slogan,
      description: context.seed.description,
      category_id: context.seed.category_id,
    },
    path: {
      id: context.path.id,
      total_days: context.path.total_days,
    },
    mapId: context.seed.map_id,
    days: (days || []).map((day) => ({
      id: day.id,
      day_number: day.day_number,
      title: day.title,
      context_text: day.context_text,
      reflection_prompts: Array.isArray(day.reflection_prompts)
        ? (day.reflection_prompts as string[])
        : [],
      node_ids: Array.isArray(day.node_ids) ? (day.node_ids as string[]) : [],
    })),
    nodes: (nodes || []).map((node: any) => ({
      id: node.id,
      key:
        typeof node.metadata?.generated_key === "string"
          ? node.metadata.generated_key
          : node.id,
      title: node.title,
      instructions: node.instructions || "",
      difficulty: Number(node.difficulty || 1),
      content: (node.node_content || []).map((content: any) => ({
        id: content.id,
        content_type: content.content_type,
        content_title: content.content_title,
        content_url: content.content_url,
        content_body: content.content_body,
        display_order: content.display_order || 0,
      })),
      assessment: node.node_assessments?.[0]
        ? {
            id: node.node_assessments[0].id,
            assessment_type: node.node_assessments[0].assessment_type,
            metadata: node.node_assessments[0].metadata,
            points_possible: node.node_assessments[0].points_possible,
            is_graded: Boolean(node.node_assessments[0].is_graded),
            quiz_questions: (node.node_assessments[0].quiz_questions || []).map((question: any) => ({
              id: question.id,
              question_text: question.question_text,
              options: question.options,
              correct_option: question.correct_option,
            })),
          }
        : null,
    })),
    edges,
  };
}

export function snapshotToDraft(snapshot: PathLabDraftSnapshot): PathLabGeneratorDraft {
  const keyByNodeId = new Map(snapshot.nodes.map((node) => [node.id, node.key]));
  const normalizeContentType = (value: string) => {
    if (value === "video" || value === "pdf" || value === "image" || value === "resource_link") {
      return value;
    }
    return "text";
  };

  const normalizeAssessmentType = (value: string) => {
    if (value === "quiz" || value === "text_answer" || value === "file_upload" || value === "checklist") {
      return value;
    }
    if (value === "image_upload") {
      return "file_upload";
    }
    return "none";
  };

  return {
    seed: {
      title: snapshot.seed.title,
      slogan: snapshot.seed.slogan || "",
      description: snapshot.seed.description || "",
      category_name: "PathLab",
    },
    path: {
      total_days: snapshot.path.total_days,
    },
    days: snapshot.days.map((day) => ({
      day_number: day.day_number,
      title: day.title,
      context_text: day.context_text,
      reflection_prompts: day.reflection_prompts || [],
      node_keys: day.node_ids.map((nodeId) => keyByNodeId.get(nodeId) || nodeId),
    })),
    nodes: snapshot.nodes.map((node) => ({
      key: node.key,
      title: node.title,
      instructions: node.instructions,
      difficulty: numberToDifficulty(node.difficulty),
      content: node.content
        .sort((a, b) => a.display_order - b.display_order)
        .map((content) => ({
          type: normalizeContentType(content.content_type) as
            | "text"
            | "video"
            | "pdf"
            | "image"
            | "resource_link",
          title: content.content_title,
          body: content.content_body,
          url: content.content_url,
        })),
      assessment: node.assessment
        ? {
            type: normalizeAssessmentType(node.assessment.assessment_type) as
              | "none"
              | "text_answer"
              | "quiz"
              | "file_upload"
              | "checklist",
            prompt:
              typeof node.assessment.metadata?.prompt === "string"
                ? String(node.assessment.metadata.prompt)
                : typeof node.assessment.metadata?.question === "string"
                  ? String(node.assessment.metadata.question)
                  : null,
            checklist_items: Array.isArray(node.assessment.metadata?.items)
              ? (node.assessment.metadata?.items as string[])
              : undefined,
            quiz_questions:
              node.assessment.assessment_type === "quiz"
                ? node.assessment.quiz_questions.map((question) => ({
                    question_text: question.question_text,
                    options: question.options || [],
                    correct_option: question.correct_option || "A",
                  }))
                : undefined,
            points_possible: node.assessment.points_possible,
          }
        : {
            type: "none",
          },
    })),
    edges: snapshot.edges.map((edge) => ({
      source_key: keyByNodeId.get(edge.source_node_id) || edge.source_node_id,
      destination_key: keyByNodeId.get(edge.destination_node_id) || edge.destination_node_id,
    })),
  };
}

export function snapshotToGeneratorRequest(snapshot: PathLabDraftSnapshot): PathLabGeneratorRequest {
  return {
    topic: snapshot.seed.title,
    audience: "General learners",
    difficulty: "intermediate",
    totalDays: snapshot.path.total_days,
    tone: "encouraging",
    constraints: normalizePromptConstraints(snapshot.seed.description),
    categoryId: snapshot.seed.category_id,
  };
}

export async function patchPathLabDay(params: {
  seedId: string;
  dayNumber: number;
  patch: {
    title?: string | null;
    context_text: string;
    reflection_prompts: string[];
  };
}) {
  const supabase = await createClient();
  const context = await getPathLabBaseContext(params.seedId);

  const { data: existingDay, error: existingDayError } = await supabase
    .from("path_days")
    .select("id, node_ids")
    .eq("path_id", context.path.id)
    .eq("day_number", params.dayNumber)
    .maybeSingle();

  if (existingDayError) {
    throw new Error(existingDayError.message);
  }

  const payload = {
    path_id: context.path.id,
    day_number: params.dayNumber,
    title: params.patch.title || null,
    context_text: params.patch.context_text,
    reflection_prompts: params.patch.reflection_prompts,
    node_ids: existingDay?.node_ids || [],
  };

  const { error: upsertError } = await supabase
    .from("path_days")
    .upsert(payload, { onConflict: "path_id,day_number" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return {
    seedId: context.seed.id,
    mapId: context.seed.map_id,
    pathId: context.path.id,
  };
}

export async function patchPathLabNode(params: {
  seedId: string;
  nodeId: string;
  patch: {
    title: string;
    instructions: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    content: Array<{
      type: "text" | "video" | "pdf" | "image" | "resource_link";
      title?: string | null;
      body?: string | null;
      url?: string | null;
    }>;
    assessment: PathLabGeneratorAssessmentDraft;
  };
}) {
  const supabase = await createClient();
  const context = await getPathLabBaseContext(params.seedId);

  const { data: node, error: nodeError } = await supabase
    .from("map_nodes")
    .select("id, map_id")
    .eq("id", params.nodeId)
    .maybeSingle();

  if (nodeError) {
    throw new Error(nodeError.message);
  }

  if (!node || node.map_id !== context.seed.map_id) {
    throw new Error("Node does not belong to the provided seed");
  }

  const { error: updateNodeError } = await supabase
    .from("map_nodes")
    .update({
      title: params.patch.title,
      instructions: params.patch.instructions,
      difficulty: difficultyToNumber(params.patch.difficulty),
    })
    .eq("id", params.nodeId);

  if (updateNodeError) {
    throw new Error(updateNodeError.message);
  }

  const { data: existingAssessments, error: existingAssessmentsError } = await supabase
    .from("node_assessments")
    .select("id")
    .eq("node_id", params.nodeId);

  if (existingAssessmentsError) {
    throw new Error(existingAssessmentsError.message);
  }

  const assessmentIds = (existingAssessments || []).map((assessment) => assessment.id);

  if (assessmentIds.length > 0) {
    const { error: deleteQuestionsError } = await supabase
      .from("quiz_questions")
      .delete()
      .in("assessment_id", assessmentIds);

    if (deleteQuestionsError) {
      throw new Error(deleteQuestionsError.message);
    }
  }

  const { error: deleteAssessmentsError } = await supabase
    .from("node_assessments")
    .delete()
    .eq("node_id", params.nodeId);

  if (deleteAssessmentsError) {
    throw new Error(deleteAssessmentsError.message);
  }

  const { error: deleteContentError } = await supabase
    .from("node_content")
    .delete()
    .eq("node_id", params.nodeId);

  if (deleteContentError) {
    throw new Error(deleteContentError.message);
  }

  if (params.patch.content.length > 0) {
    const { error: insertContentError } = await supabase.from("node_content").insert(
      params.patch.content.map((content, index) => ({
        node_id: params.nodeId,
        content_type: content.type,
        content_title: content.title || null,
        content_url: content.url || null,
        content_body: content.body || null,
        display_order: index,
      })),
    );

    if (insertContentError) {
      throw new Error(insertContentError.message);
    }
  }

  const assessmentRow = buildAssessmentRow(params.nodeId, params.patch.assessment);
  if (assessmentRow) {
    const { data: insertedAssessment, error: insertAssessmentError } = await supabase
      .from("node_assessments")
      .insert(assessmentRow)
      .select("id")
      .single();

    if (insertAssessmentError || !insertedAssessment) {
      throw new Error(insertAssessmentError?.message || "Failed to save node assessment");
    }

    if (params.patch.assessment.type === "quiz") {
      const quizQuestions = params.patch.assessment.quiz_questions || [];
      if (quizQuestions.length > 0) {
        const { error: insertQuestionsError } = await supabase.from("quiz_questions").insert(
          quizQuestions.map((question) => ({
            assessment_id: insertedAssessment.id,
            question_text: question.question_text,
            options: question.options,
            correct_option: question.correct_option,
          })),
        );

        if (insertQuestionsError) {
          throw new Error(insertQuestionsError.message);
        }
      }
    }
  }

  return {
    seedId: context.seed.id,
    mapId: context.seed.map_id,
    pathId: context.path.id,
  };
}
