import { NextRequest, NextResponse } from "next/server";
import {
  buildAssessmentMetadata,
  microPathLabMapImportSchema,
} from "@/lib/maps/micro-pathlab-import";
import { requireUser, safeServerError } from "@/lib/security/route-guards";

export async function POST(request: NextRequest) {
  const userCheck = await requireUser();
  if (!userCheck.ok) return userCheck.response;

  const { supabase, userId } = userCheck.value;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: "A registered account is required" }, { status: 403 });
  }
  let createdMapId: string | null = null;

  try {
    const body = await request.json();
    const parsed = microPathLabMapImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid Micro PathLab map payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const { data: map, error: mapError } = await supabase
      .from("learning_maps")
      .insert({
        title: payload.map.title,
        description: payload.map.description,
        creator_id: userId,
        difficulty: payload.map.difficulty,
        category: "custom",
        visibility: payload.map.visibility,
        map_type: payload.map.visibility === "private" ? "private" : "public",
        metadata: {
          ...payload.map.metadata,
          is_micro_pathlab: true,
          estimated_minutes: payload.map.estimatedMinutes,
        },
      })
      .select("id")
      .single();

    if (mapError || !map) {
      throw new Error(mapError?.message || "Failed to create learning map");
    }

    createdMapId = map.id;
    const nodeIdByKey = new Map<string, string>();
    const nodeRows = payload.nodes.map((node) => {
      const id = crypto.randomUUID();
      nodeIdByKey.set(node.key, id);
      return {
        id,
        map_id: map.id,
        title: node.title,
        instructions: node.instructions,
        difficulty: node.difficulty,
        sprite_url: null,
        node_type: node.node_type,
        metadata: {
          position: node.position,
          generated_key: node.key,
          is_micro_pathlab: true,
        },
      };
    });

    const { error: nodesError } = await supabase
      .from("map_nodes")
      .insert(nodeRows);
    if (nodesError) throw new Error(nodesError.message);

    const contentRows = payload.nodes.flatMap((node) => {
      const nodeId = nodeIdByKey.get(node.key);
      if (!nodeId) return [];

      return node.content.map((content, displayOrder) => ({
        node_id: nodeId,
        content_type: content.content_type,
        content_title: content.content_title || null,
        content_body: content.content_body || null,
        content_url: content.content_url || null,
        display_order: displayOrder,
      }));
    });

    const { error: contentError } = await supabase
      .from("node_content")
      .insert(contentRows);
    if (contentError) throw new Error(contentError.message);

    let assessmentsCreated = 0;
    for (const node of payload.nodes) {
      if (!node.assessment) continue;
      const nodeId = nodeIdByKey.get(node.key);
      if (!nodeId) throw new Error(`Missing persisted node for ${node.key}`);

      const assessment = node.assessment;
      const { data: createdAssessment, error: assessmentError } = await supabase
        .from("node_assessments")
        .insert({
          node_id: nodeId,
          assessment_type: assessment.type,
          metadata: buildAssessmentMetadata(assessment),
          points_possible: assessment.pointsPossible,
          is_graded: assessment.isGraded,
        })
        .select("id")
        .single();

      if (assessmentError || !createdAssessment) {
        throw new Error(assessmentError?.message || `Failed to create assessment for ${node.key}`);
      }
      assessmentsCreated += 1;

      if (assessment.type === "quiz") {
        const quizRows = assessment.quiz_questions.map((question) => ({
          assessment_id: createdAssessment.id,
          question_text: question.question_text,
          options: question.options,
          correct_option: question.correct_option,
        }));
        const { error: quizError } = await supabase
          .from("quiz_questions")
          .insert(quizRows);
        if (quizError) throw new Error(quizError.message);
      }
    }

    const pathRows = payload.connections.map((connection) => ({
      source_node_id: nodeIdByKey.get(connection.from)!,
      destination_node_id: nodeIdByKey.get(connection.to)!,
    }));
    const { error: pathsError } = await supabase
      .from("node_paths")
      .insert(pathRows);
    if (pathsError) throw new Error(pathsError.message);

    const { data: verification, error: verificationError } = await supabase
      .from("learning_maps")
      .select("id, map_type, visibility, map_nodes(id)")
      .eq("id", map.id)
      .single();

    if (verificationError || !verification) {
      throw new Error(verificationError?.message || "Failed to verify the created map");
    }

    if (verification.map_type === "seed") {
      throw new Error("Created map unexpectedly used the seed map type");
    }

    const verifiedNodeCount = verification.map_nodes?.length || 0;
    if (verifiedNodeCount !== payload.nodes.length) {
      throw new Error(
        `Map verification expected ${payload.nodes.length} nodes but found ${verifiedNodeCount}`,
      );
    }

    return NextResponse.json({
      success: true,
      mapId: map.id,
      mapPath: `/map/${map.id}`,
      nodesCreated: verifiedNodeCount,
      assessmentsCreated,
      connectionsCreated: pathRows.length,
    });
  } catch (error) {
    if (createdMapId) {
      const { error: cleanupError } = await supabase
        .from("learning_maps")
        .delete()
        .eq("id", createdMapId);
      if (cleanupError) {
        console.error("Failed to clean up partial Micro PathLab map", cleanupError);
      }
    }

    return safeServerError("Failed to create Micro PathLab map", error);
  }
}
