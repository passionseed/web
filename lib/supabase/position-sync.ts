/**
 * Position Sync - Supabase RPC Wrapper
 *
 * Provides type-safe wrapper functions for batching position updates to the database.
 * These functions call the PostgreSQL RPC functions created in the migration.
 */

import { createClient } from "@/utils/supabase/client";

/**
 * Item to update with new position
 */
export interface PositionUpdateItem {
  id: string;
  x: number;
  y: number;
}

/**
 * Batch update positions for journey projects
 *
 * @param items - Array of projects with their new positions
 * @throws Error if update fails or user is not authenticated
 * @example
 * await batchUpdateProjectPositions([
 *   { id: "uuid-1", x: 100, y: 200 },
 *   { id: "uuid-2", x: 300, y: 400 }
 * ]);
 */
export async function batchUpdateProjectPositions(
  items: PositionUpdateItem[]
): Promise<void> {
  if (items.length === 0) {
    return; // No-op if no items to update
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Call the RPC function with JSONB array
  const { error } = await supabase.rpc("update_journey_projects_positions", {
    items: items as any, // Supabase will convert to JSONB
  });

  if (error) {
    console.error("Error batch updating project positions:", error);
    throw new Error(
      `Failed to update project positions: ${error.message || "Unknown error"}`
    );
  }
}

/**
 * Batch update positions for project milestones
 *
 * @param items - Array of milestones with their new positions
 * @throws Error if update fails or user is not authenticated
 * @example
 * await batchUpdateMilestonePositions([
 *   { id: "uuid-1", x: 150, y: 250 },
 *   { id: "uuid-2", x: 350, y: 450 }
 * ]);
 */
export async function batchUpdateMilestonePositions(
  items: PositionUpdateItem[]
): Promise<void> {
  if (items.length === 0) {
    return; // No-op if no items to update
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Call the RPC function with JSONB array
  const { error } = await supabase.rpc("update_project_milestones_positions", {
    items: items as any, // Supabase will convert to JSONB
  });

  if (error) {
    console.error("Error batch updating milestone positions:", error);
    throw new Error(
      `Failed to update milestone positions: ${error.message || "Unknown error"}`
    );
  }
}
