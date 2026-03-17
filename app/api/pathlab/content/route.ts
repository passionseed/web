// =====================================================
// PATHLAB CONTENT API
// CRUD operations for path_content
// =====================================================

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
  try {
    const body: CreatePathContentInput = await request.json();

    // Validate required fields
    if (!body.activity_id || !body.content_type) {
      return NextResponse.json(
        { error: "Missing required fields: activity_id, content_type" },
        { status: 400 }
      );
    }

    const content = await createPathContent(body);
    return NextResponse.json({ content }, { status: 201 });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Update content or reorder content items
// Body:
//   - For update: { contentId, updates: UpdatePathContentInput }
//   - For reorder: { activityId, contentIds: string[] }
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle reordering
    if (body.activityId && body.contentIds) {
      await reorderPathContent(body.activityId, body.contentIds);
      return NextResponse.json({ success: true });
    }

    // Handle single content update
    if (body.contentId && body.updates) {
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
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete content item
// Query params:
//   - contentId: ID of content to delete
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId parameter required" },
        { status: 400 }
      );
    }

    await deletePathContent(contentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
