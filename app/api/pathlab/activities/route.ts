// =====================================================
// PATHLAB ACTIVITIES API
// CRUD operations for path_activities
// =====================================================

import { requireUser, safeServerError } from "@/lib/security/route-guards";
import { verifyActivityOwnership, verifyPageOwnership, UnauthorizedError, NotFoundError } from "@/lib/pathlab/authorization";
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
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
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
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// POST - Create new activity
// Body: CreatePathActivityInput
// =====================================================
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body: CreatePathActivityInput = await request.json();

    // Validate required fields
    if (!body.path_day_id || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: path_day_id, title" },
        { status: 400 }
      );
    }

    await verifyPageOwnership(body.path_day_id, auth.value.userId);
    const activity = await createPathActivity(body);
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// PATCH - Update activity or reorder activities
// Body:
//   - For update: { activityId, updates: UpdatePathActivityInput }
//   - For reorder: { dayId, activityIds: string[] }
// =====================================================
export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
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
      await verifyPageOwnership(body.dayId, auth.value.userId);
      for (const id of body.activityIds) {
        const owned = await verifyActivityOwnership(id, auth.value.userId);
        if (owned.pageId !== body.dayId) throw new UnauthorizedError("Activity belongs to another page");
      }
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
      await verifyActivityOwnership(body.activityId, auth.value.userId);
      if ("path_day_id" in body.updates || "id" in body.updates) throw new UnauthorizedError("Invalid update");
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
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}

// =====================================================
// DELETE - Delete activity
// Query params:
//   - activityId: ID of activity to delete
// =====================================================
export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("activityId");

    if (!activityId) {
      return NextResponse.json(
        { error: "activityId parameter required" },
        { status: 400 }
      );
    }

    await verifyActivityOwnership(activityId, auth.value.userId);
    await deletePathActivity(activityId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: error.statusCode });
    }
    return safeServerError("PathLab operation failed", error);
  }
}
