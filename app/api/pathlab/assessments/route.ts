// =====================================================
// PATHLAB ASSESSMENTS API
// CRUD operations for path_assessments and quiz questions
// =====================================================

import { requireUser, safeServerError } from "@/lib/security/route-guards";
import { verifyActivityOwnership, verifyBuilderRecordOwnership, UnauthorizedError, NotFoundError } from "@/lib/pathlab/authorization";
import { NextRequest, NextResponse } from "next/server";
import {
  createPathAssessment,
  updatePathAssessment,
  deletePathAssessment,
  addPathQuizQuestion,
  deletePathQuizQuestion,
} from "@/lib/supabase/pathlab-activities";
import type {
  CreatePathAssessmentInput,
  UpdatePathAssessmentInput,
} from "@/types/pathlab";

// =====================================================
// POST - Create assessment or add quiz question
// Body:
//   - For assessment: CreatePathAssessmentInput
//   - For quiz question: { assessmentId, question: {...} }
// =====================================================
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();

    // Handle adding quiz question to existing assessment
    if (body.assessmentId && body.question) {
      await verifyBuilderRecordOwnership("assessment", body.assessmentId, auth.value.userId);
      const question = await addPathQuizQuestion(
        body.assessmentId,
        body.question
      );
      return NextResponse.json({ question }, { status: 201 });
    }

    // Handle creating new assessment
    const input: CreatePathAssessmentInput = body;

    if (!input.activity_id || !input.assessment_type) {
      return NextResponse.json(
        { error: "Missing required fields: activity_id, assessment_type" },
        { status: 400 }
      );
    }

    await verifyActivityOwnership(input.activity_id, auth.value.userId);
    const assessment = await createPathAssessment(input);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// PATCH - Update assessment
// Body: { assessmentId, updates: UpdatePathAssessmentInput }
// =====================================================
export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();

    if (!body.assessmentId || !body.updates) {
      return NextResponse.json(
        { error: "Missing required fields: assessmentId, updates" },
        { status: 400 }
      );
    }

    await verifyBuilderRecordOwnership("assessment", body.assessmentId, auth.value.userId);
    if ("activity_id" in body.updates || "id" in body.updates) throw new UnauthorizedError("Invalid update");
    const assessment = await updatePathAssessment(
      body.assessmentId,
      body.updates as UpdatePathAssessmentInput
    );
    return NextResponse.json({ assessment });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// DELETE - Delete assessment or quiz question
// Query params:
//   - assessmentId: Delete entire assessment
//   - questionId: Delete single quiz question
// =====================================================
export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");
    const questionId = searchParams.get("questionId");

    if (questionId) {
      await verifyBuilderRecordOwnership("question", questionId, auth.value.userId);
      await deletePathQuizQuestion(questionId);
      return NextResponse.json({ success: true });
    }

    if (assessmentId) {
      await verifyBuilderRecordOwnership("assessment", assessmentId, auth.value.userId);
      await deletePathAssessment(assessmentId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "assessmentId or questionId parameter required" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}
