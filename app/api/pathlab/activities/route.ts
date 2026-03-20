// =====================================================
// PATHLAB ACTIVITIES API
// CRUD operations for path_activities
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getPathDayActivities,
  getPathActivity,
  createPathActivity,
  updatePathActivity,
  deletePathActivity,
  reorderPathActivities,
} from "@/lib/supabase/pathlab-activities";
import type {
  CreatePathActivityInput,
  UpdatePathActivityInput,
} from "@/types/pathlab";

// =====================================================
// GET - Fetch activities
// Query params:
//   - dayId: Fetch all activities for a day
//   - activityId: Fetch single activity by ID
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dayId = searchParams.get("dayId");
    const activityId = searchParams.get("activityId");

    if (activityId) {
      const activity = await getPathActivity(activityId);
      if (!activity) {
        return NextResponse.json(
          { error: "Activity not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ activity });
    }

    if (dayId) {
      const activities = await getPathDayActivities(dayId);
      return NextResponse.json({ activities });
    }

    return NextResponse.json(
      { error: "dayId or activityId parameter required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create new activity
// Body: CreatePathActivityInput
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body: CreatePathActivityInput = await request.json();

    // Validate required fields
    if (!body.path_day_id || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: path_day_id, title" },
        { status: 400 }
      );
    }

    const activity = await createPathActivity(body);
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      {
        error: "Failed to create activity",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Update activity or reorder activities
// Body:
//   - For update: { activityId, updates: UpdatePathActivityInput }
//   - For reorder: { dayId, activityIds: string[] }
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /pathlab/activities PATCH] Request received:', {
      hasActivityId: !!body.activityId,
      hasDayId: !!body.dayId,
      hasActivityIds: !!body.activityIds,
      activityIdsCount: body.activityIds?.length,
    });

    // Handle reordering
    if (body.dayId && body.activityIds) {
      console.log('[API /pathlab/activities PATCH] Reordering activities:', {
        dayId: body.dayId,
        activityIds: body.activityIds,
      });
      await reorderPathActivities(body.dayId, body.activityIds);
      console.log('[API /pathlab/activities PATCH] Reorder successful');
      return NextResponse.json({ success: true });
    }

    // Handle single activity update
    if (body.activityId && body.updates) {
      console.log('[API /pathlab/activities PATCH] Updating single activity:', {
        activityId: body.activityId,
        updates: body.updates,
      });
      const activity = await updatePathActivity(
        body.activityId,
        body.updates as UpdatePathActivityInput
      );
      console.log('[API /pathlab/activities PATCH] Update successful');
      return NextResponse.json({ activity });
    }

    console.log('[API /pathlab/activities PATCH] Invalid request body');
    return NextResponse.json(
      {
        error:
          "Invalid request body. Provide either { activityId, updates } or { dayId, activityIds }",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API /pathlab/activities PATCH] Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete activity
// Query params:
//   - activityId: ID of activity to delete
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("activityId");

    if (!activityId) {
      return NextResponse.json(
        { error: "activityId parameter required" },
        { status: 400 }
      );
    }

    await deletePathActivity(activityId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
