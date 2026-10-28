// =====================================================
// PATHLAB CONTENT API
// CRUD operations for path_content
// =====================================================

import { requireUser, safeServerError } from "@/lib/security/route-guards";
import { verifyActivityOwnership, verifyBuilderRecordOwnership, UnauthorizedError, NotFoundError } from "@/lib/pathlab/authorization";
import { NextRequest, NextResponse } from "next/server";
import {
  createPathContent,
  updatePathContent,
  deletePathContent,
  reorderPathContent,
} from "@/lib/supabase/pathlab-activities";
import type {
  CreatePathContentInput,
  UpdatePathContentInput,
} from "@/types/pathlab";

// =====================================================
// POST - Create new content item
// Body: CreatePathContentInput
// =====================================================
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body: CreatePathContentInput = await request.json();

    // Validate required fields
    if (!body.activity_id || !body.content_type) {
      return NextResponse.json(
        { error: "Missing required fields: activity_id, content_type" },
        { status: 400 }
      );
    }

    await verifyActivityOwnership(body.activity_id, auth.value.userId);
    const content = await createPathContent(body);
    return NextResponse.json({ content }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// PATCH - Update content or reorder content items
// Body:
//   - For update: { contentId, updates: UpdatePathContentInput }
//   - For reorder: { activityId, contentIds: string[] }
// =====================================================
export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();

    // Handle reordering
    if (body.activityId && body.contentIds) {
      await verifyActivityOwnership(body.activityId, auth.value.userId);
      await reorderPathContent(body.activityId, body.contentIds);
      return NextResponse.json({ success: true });
    }

    // Handle single content update
    if (body.contentId && body.updates) {
      await verifyBuilderRecordOwnership("content", body.contentId, auth.value.userId);
      if ("activity_id" in body.updates || "id" in body.updates) throw new UnauthorizedError("Invalid update");
      const content = await updatePathContent(
        body.contentId,
        body.updates as UpdatePathContentInput
      );
      return NextResponse.json({ content });
    }

    return NextResponse.json(
      {
        error:
          "Invalid request body. Provide either { contentId, updates } or { activityId, contentIds }",
      },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// DELETE - Delete content item
// Query params:
//   - contentId: ID of content to delete
// =====================================================
export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId parameter required" },
        { status: 400 }
      );
    }

    await verifyBuilderRecordOwnership("content", contentId, auth.value.userId);
    await deletePathContent(contentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}
