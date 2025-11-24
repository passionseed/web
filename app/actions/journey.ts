"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Reset the journey map for the current user.
 * This deletes all North Stars and Journey Projects.
 * ONLY AVAILABLE IN DEVELOPMENT ENVIRONMENT.
 */
export async function resetJourneyMap() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Reset is only available in development environment");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    // Delete all North Stars (this should cascade to projects if set up that way,
    // but we'll delete projects explicitly to be safe/thorough if not cascaded)
    
    // First delete all projects
    const { error: projectsError } = await supabase
      .from("journey_projects")
      .delete()
      .eq("user_id", user.id);

    if (projectsError) {
      console.error("Error deleting projects:", projectsError);
      throw new Error(`Failed to delete projects: ${projectsError.message}`);
    }

    // Then delete all North Stars
    const { error: northStarsError } = await supabase
      .from("north_stars")
      .delete()
      .eq("user_id", user.id);

    if (northStarsError) {
      console.error("Error deleting North Stars:", northStarsError);
      throw new Error(`Failed to delete North Stars: ${northStarsError.message}`);
    }

    revalidatePath("/me/journey");
    return { success: true };
  } catch (error) {
    console.error("Error resetting journey map:", error);
    return { success: false, error: "Failed to reset journey map" };
  }
}
