// =====================================================
// PATHLAB ASSESSMENTS API
// CRUD operations for path_assessments and quiz questions
// =====================================================

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
  try {
    const body = await request.json();

    // Handle adding quiz question to existing assessment
    if (body.assessmentId && body.question) {
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

    const assessment = await createPathAssessment(input);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error("Error creating assessment:", error);
    return NextResponse.json(
      { error: "Failed to create assessment" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Update assessment
// Body: { assessmentId, updates: UpdatePathAssessmentInput }
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.assessmentId || !body.updates) {
      return NextResponse.json(
        { error: "Missing required fields: assessmentId, updates" },
        { status: 400 }
      );
    }

    const assessment = await updatePathAssessment(
      body.assessmentId,
      body.updates as UpdatePathAssessmentInput
    );
    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("Error updating assessment:", error);
    return NextResponse.json(
      { error: "Failed to update assessment" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete assessment or quiz question
// Query params:
//   - assessmentId: Delete entire assessment
//   - questionId: Delete single quiz question
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");
    const questionId = searchParams.get("questionId");

    if (questionId) {
      await deletePathQuizQuestion(questionId);
      return NextResponse.json({ success: true });
    }

    if (assessmentId) {
      await deletePathAssessment(assessmentId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "assessmentId or questionId parameter required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting assessment:", error);
    return NextResponse.json(
      { error: "Failed to delete assessment" },
      { status: 500 }
    );
  }
}
