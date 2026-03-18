// =====================================================
// PATHLAB MIGRATION API
// Execute migration and rollback operations
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { MigrationResult, MigrationStatus } from "@/types/pathlab";

// =====================================================
// GET - Check migration status
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathId = searchParams.get("pathId");

    const supabase = await createClient();

    if (pathId) {
      // Get detailed migration status for specific path
      const { data, error } = await supabase.rpc(
        "get_path_migration_details",
        { p_path_id: pathId }
      );

      if (error) throw error;

      return NextResponse.json({
        path_id: pathId,
        days: data,
      });
    }

    // Get overall migration status
    const { data, error } = await supabase.rpc("get_pathlab_migration_status");

    if (error) throw error;

    const status = data[0] as MigrationStatus;
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error getting migration status:", error);
    return NextResponse.json(
      { error: "Failed to get migration status" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Execute migration
// Body:
//   - pathId (optional): Migrate specific path only
//   - dryRun (optional): Preview migration without executing
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pathId = body.pathId;
    const dryRun = body.dryRun || false;

    const supabase = await createClient();

    // Check user authorization (only path creators or admins can migrate)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (dryRun) {
      // For dry run, just return what would be migrated
      const { data: pathDays, error } = await supabase
        .from("path_days")
        .select("id, day_number, node_ids, path_id")
        .eq("migrated_from_nodes", false)
        .order("path_id")
        .order("day_number");

      if (error) throw error;

      const preview = pathDays.map((day) => ({
        path_day_id: day.id,
        day_number: day.day_number,
        node_count: day.node_ids?.length || 0,
        will_create_activities: day.node_ids?.length || 0,
      }));

      return NextResponse.json({
        dry_run: true,
        total_days: preview.length,
        preview,
      });
    }

    // Execute migration
    let results: MigrationResult[];

    if (pathId) {
      // Migrate single path
      const { data, error } = await supabase.rpc("migrate_single_path", {
        p_path_id: pathId,
      });

      if (error) throw error;
      results = data as MigrationResult[];
    } else {
      // Migrate all paths
      const { data, error } = await supabase.rpc(
        "migrate_pathlab_nodes_to_activities"
      );

      if (error) throw error;
      results = data as MigrationResult[];
    }

    const summary = {
      total_days_processed: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      total_activities_created: results.reduce(
        (sum, r) => sum + r.activities_created,
        0
      ),
      total_content_migrated: results.reduce(
        (sum, r) => sum + r.content_items_migrated,
        0
      ),
      total_assessments_migrated: results.reduce(
        (sum, r) => sum + r.assessments_migrated,
        0
      ),
    };

    return NextResponse.json({
      success: true,
      results,
      summary,
    });
  } catch (error) {
    console.error("Error executing migration:", error);
    return NextResponse.json(
      { error: "Failed to execute migration" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Rollback migration
// Body:
//   - pathId (optional): Rollback specific path only
//   - dayId (optional): Rollback specific day only
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const pathId = body.pathId;
    const dayId = body.dayId;

    const supabase = await createClient();

    // Check user authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let results;

    if (dayId) {
      // Rollback single day
      const { data, error } = await supabase.rpc("rollback_single_day", {
        p_day_id: dayId,
      });

      if (error) throw error;
      results = data;
    } else if (pathId) {
      // Rollback single path
      const { data, error } = await supabase.rpc("rollback_single_path", {
        p_path_id: pathId,
      });

      if (error) throw error;
      results = data;
    } else {
      // Rollback all paths
      const { data, error } = await supabase.rpc("rollback_pathlab_migration");

      if (error) throw error;
      results = data;
    }

    const summary = {
      total_days_processed: results.length,
      successful: results.filter((r: any) => r.status === "rolled_back").length,
      failed: results.filter((r: any) => r.status === "error").length,
      total_activities_deleted: results.reduce(
        (sum: number, r: any) => sum + r.activities_deleted,
        0
      ),
    };

    return NextResponse.json({
      success: true,
      results,
      summary,
    });
  } catch (error) {
    console.error("Error executing rollback:", error);
    return NextResponse.json(
      { error: "Failed to execute rollback" },
      { status: 500 }
    );
  }
}
