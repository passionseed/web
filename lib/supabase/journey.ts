import { createClient } from "@/utils/supabase/client";
import {
  JourneyProject,
  ProjectMilestone,
  MilestonePath,
  MilestoneJournal,
  ProjectReflection,
  DailyActivity,
  ProjectCreateData,
  MilestoneCreateData,
  JournalCreateData,
  ReflectionCreateData,
  ActivityCreateData,
  ProjectWithMilestones,
  MilestoneWithJournals,
  MilestoneWithPaths,
  DailyActivitySummary,
  WeeklyProgress,
  JourneyDashboard,
} from "@/types/journey";

// ========================================
// TABLE NAMES
// ========================================

const TABLES = {
  JOURNEY_PROJECTS: "journey_projects",
  PROJECT_MILESTONES: "project_milestones",
  MILESTONE_PATHS: "milestone_paths",
  MILESTONE_JOURNALS: "milestone_journals",
  PROJECT_REFLECTIONS: "project_reflections",
  DAILY_ACTIVITIES: "daily_activities",
} as const;

// ========================================
// PROJECT MANAGEMENT FUNCTIONS
// ========================================

/**
 * Create a new journey project
 */
export async function createJourneyProject(
  data: ProjectCreateData
): Promise<JourneyProject> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Map the project_type to database format
  // The database uses 'short_term' or 'north_star'
  // The application uses category types like 'learning', 'career', etc.
  // We'll store the category in project_type for now and can refactor later
  const projectType = data.project_type;

  // Map status to database-allowed values
  // Database allows: 'not_started', 'in_progress', 'completed', 'on_hold'
  // TypeScript types allow: 'not_started', 'planning', 'in_progress', 'on_hold', 'completed', 'archived'
  const mapStatus = (status?: string) => {
    if (!status) return "not_started";
    // Map 'planning' to 'not_started' and 'archived' to 'on_hold'
    if (status === "planning") return "not_started";
    if (status === "archived") return "on_hold";
    return status;
  };

  const { data: project, error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      project_type: projectType,
      status: mapStatus(data.status),
      color_theme: data.color || "#6366f1",
      metadata: {
        ...(data.metadata || {}),
        category: projectType, // Store the category type separately
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating journey project:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error,
    });
    throw new Error(
      `Failed to create project: ${error.message || "Unknown error"}`
    );
  }

  if (!project) {
    console.error("No project returned from insert");
    throw new Error("Failed to create project: No data returned");
  }

  return project;
}

/**
 * Get all journey projects for the authenticated user
 */
export async function getJourneyProjects(
  userId?: string
): Promise<ProjectWithMilestones[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !userId) {
    return [];
  }

  const targetUserId = userId || user?.id;

  const { data, error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .select(
      `
      *,
      milestones:project_milestones(*)
    `
    )
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching journey projects:", error);
    throw error;
  }

  return (data || []).map((project: any) => ({
    ...project,
    milestones: project.milestones || [],
    milestone_count: project.milestones?.length || 0,
    completed_milestone_count:
      project.milestones?.filter((m: any) => m.status === "completed").length ||
      0,
  }));
}

/**
 * Get a single project by ID with full details
 */
export async function getProjectById(
  projectId: string
): Promise<ProjectWithMilestones | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .select(
      `
      *,
      milestones:project_milestones(
        *,
        paths_source:milestone_paths!source_milestone_id(*),
        paths_destination:milestone_paths!destination_milestone_id(*),
        journals:milestone_journals(*)
      )
    `
    )
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    milestones: data.milestones || [],
    milestone_count: data.milestones?.length || 0,
    completed_milestone_count:
      data.milestones?.filter((m: any) => m.status === "completed").length || 0,
  };
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  data: Partial<JourneyProject>
): Promise<JourneyProject> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Remove fields that shouldn't be updated directly
  const { id, user_id, created_at, updated_at, ...updateData } = data as any;

  const { data: project, error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .update(updateData)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    throw error;
  }

  return project;
}

/**
 * Delete a project (cascading deletes handled by database)
 */
export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Mark projects as main quest
 */
export async function setMainQuest(projectIds: string[]): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    // First, unset all main quests for the user
    const { error: unsetError } = await supabase
      .from(TABLES.JOURNEY_PROJECTS)
      .update({ is_main_quest: false })
      .eq("user_id", user.id);

    if (unsetError) throw unsetError;

    // Then set the specified projects as main quests
    if (projectIds.length > 0) {
      const { error: setError } = await supabase
        .from(TABLES.JOURNEY_PROJECTS)
        .update({ is_main_quest: true })
        .in("id", projectIds)
        .eq("user_id", user.id);

      if (setError) throw setError;
    }
  } catch (error) {
    console.error("Error setting main quest:", error);
    throw error;
  }
}

/**
 * Update project position on the journey map
 */
export async function updateProjectPosition(
  projectId: string,
  x: number,
  y: number
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .update({
      position_x: x,
      position_y: y,
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating project position:", error);
    throw error;
  }
}

/**
 * Update project details (goal, why, description)
 */
export async function updateProjectDetails(
  projectId: string,
  data: {
    title?: string;
    goal?: string;
    why?: string;
    description?: string;
  }
): Promise<JourneyProject> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: project, error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .update(data)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating project details:", error);
    throw error;
  }

  return project;
}

/**
 * Link a short-term project to a North Star project
 */
export async function linkToNorthStar(
  shortTermId: string,
  northStarId: string
): Promise<JourneyProject> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Verify that the North Star project exists and is owned by the user
  const { data: northStar, error: northStarError } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .select("id, project_type")
    .eq("id", northStarId)
    .eq("user_id", user.id)
    .single();

  if (northStarError || !northStar) {
    throw new Error("North Star project not found");
  }

  if (northStar.project_type !== "north_star") {
    throw new Error("Target project must be a North Star project");
  }

  const { data: project, error } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .update({ north_star_id: northStarId })
    .eq("id", shortTermId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error linking to North Star:", error);
    throw error;
  }

  return project;
}

// ========================================
// MILESTONE MANAGEMENT FUNCTIONS
// ========================================

/**
 * Create a new milestone in a project
 */
export async function createMilestone(
  projectId: string,
  data: MilestoneCreateData
): Promise<ProjectMilestone> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  // Get the next order index
  const { data: milestones } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .select("order_index")
    .eq("project_id", projectId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrderIndex =
    data.display_order ??
    (milestones && milestones.length > 0 ? milestones[0].order_index + 1 : 0);

  const { data: milestone, error } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .insert({
      project_id: projectId,
      title: data.title,
      description: data.description,
      status: data.status || "not_started",
      order_index: nextOrderIndex,
      position_x: data.position?.x || 0,
      position_y: data.position?.y || 0,
      progress_percentage: 0,
      metadata: {
        ...(data.metadata || {}),
        // Store additional fields in metadata that don't have direct columns
        estimated_hours: data.estimated_hours,
        due_date: data.due_date,
        style: data.style,
        dependencies: data.dependencies,
        tags: data.tags,
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating milestone:", error);
    throw error;
  }

  return milestone;
}

/**
 * Get all milestones for a project with paths and journals
 */
export async function getProjectMilestones(
  projectId: string
): Promise<MilestoneWithJournals[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .select(
      `
      *,
      journals:milestone_journals(*)
    `
    )
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching project milestones:", error);
    throw error;
  }

  return (data || []).map((milestone: any) => ({
    ...milestone,
    journals: milestone.journals || [],
    journal_count: milestone.journals?.length || 0,
    total_time_spent:
      milestone.journals?.reduce(
        (sum: number, j: any) => sum + (j.time_spent_minutes || 0),
        0
      ) || 0,
  }));
}

/**
 * Get a single milestone by ID with full details
 */
export async function getMilestoneById(
  milestoneId: string
): Promise<MilestoneWithPaths | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .select(
      `
      *,
      paths_source:milestone_paths!source_milestone_id(*),
      paths_destination:milestone_paths!destination_milestone_id(*)
    `
    )
    .eq("id", milestoneId)
    .single();

  if (error) {
    console.error("Error fetching milestone:", error);
    return null;
  }

  return {
    ...data,
    paths_source: data.paths_source || [],
    paths_destination: data.paths_destination || [],
  };
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  milestoneId: string,
  data: Partial<ProjectMilestone>
): Promise<ProjectMilestone> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Remove fields that shouldn't be updated directly
  const { id, project_id, created_at, updated_at, ...updateData } = data as any;

  const { data: milestone, error } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .update(updateData)
    .eq("id", milestoneId)
    .select()
    .single();

  if (error) {
    console.error("Error updating milestone:", error);
    throw error;
  }

  return milestone;
}

/**
 * Update milestone progress with a journal entry
 */
export async function updateMilestoneProgress(
  milestoneId: string,
  progress: number,
  journal: string
): Promise<{ milestone: ProjectMilestone; journalEntry: MilestoneJournal }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    // Update milestone progress
    const { data: milestone, error: milestoneError } = await supabase
      .from(TABLES.PROJECT_MILESTONES)
      .update({
        progress_percentage: progress,
        status: progress === 100 ? "completed" : "in_progress",
        completed_at: progress === 100 ? new Date().toISOString() : null,
      })
      .eq("id", milestoneId)
      .select()
      .single();

    if (milestoneError) throw milestoneError;

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from(TABLES.MILESTONE_JOURNALS)
      .insert({
        milestone_id: milestoneId,
        user_id: user.id,
        content: journal,
        progress_percentage: progress,
      })
      .select()
      .single();

    if (journalError) throw journalError;

    return { milestone, journalEntry };
  } catch (error) {
    console.error("Error updating milestone progress:", error);
    throw error;
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(milestoneId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .delete()
    .eq("id", milestoneId);

  if (error) {
    console.error("Error deleting milestone:", error);
    throw error;
  }
}

/**
 * Create a path between two milestones
 */
export async function createMilestonePath(
  sourceId: string,
  destId: string,
  pathType: "linear" | "conditional" | "parallel" = "linear"
): Promise<MilestonePath> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: path, error } = await supabase
    .from(TABLES.MILESTONE_PATHS)
    .insert({
      source_milestone_id: sourceId,
      destination_milestone_id: destId,
      path_type: pathType,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating milestone path:", error);
    throw error;
  }

  return path;
}

/**
 * Delete a milestone path connection
 */
export async function deleteMilestonePath(pathId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from(TABLES.MILESTONE_PATHS)
    .delete()
    .eq("id", pathId);

  if (error) {
    console.error("Error deleting milestone path:", error);
    throw error;
  }
}

/**
 * Get all milestone paths for a project
 */
export async function getProjectMilestonePaths(
  projectId: string
): Promise<MilestonePath[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get all milestone IDs for this project first
  const { data: milestones } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .select("id")
    .eq("project_id", projectId);

  if (!milestones || milestones.length === 0) {
    return [];
  }

  const milestoneIds = milestones.map((m) => m.id);

  // Get all paths where either source or destination is in this project
  const { data, error } = await supabase
    .from(TABLES.MILESTONE_PATHS)
    .select("*")
    .or(
      `source_milestone_id.in.(${milestoneIds.join(",")}),destination_milestone_id.in.(${milestoneIds.join(",")})`
    );

  if (error) {
    console.error("Error fetching milestone paths:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update a milestone path's type
 */
export async function updateMilestonePathType(
  pathId: string,
  pathType: "linear" | "conditional" | "parallel"
): Promise<MilestonePath> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from(TABLES.MILESTONE_PATHS)
    .update({ path_type: pathType })
    .eq("id", pathId)
    .select()
    .single();

  if (error) {
    console.error("Error updating milestone path:", error);
    throw error;
  }

  return data;
}

// ========================================
// JOURNAL & REFLECTION FUNCTIONS
// ========================================

/**
 * Add a journal entry to a milestone
 */
export async function addMilestoneJournal(
  milestoneId: string,
  content: string,
  progress: number
): Promise<MilestoneJournal> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: journal, error } = await supabase
    .from(TABLES.MILESTONE_JOURNALS)
    .insert({
      milestone_id: milestoneId,
      user_id: user.id,
      content,
      progress_percentage: progress,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding milestone journal:", error);
    throw error;
  }

  return journal;
}

/**
 * Get all journal entries for a project, grouped by milestone
 */
export async function getProjectJournals(
  projectId: string
): Promise<Record<string, MilestoneJournal[]>> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {};
  }

  const { data, error } = await supabase
    .from(TABLES.MILESTONE_JOURNALS)
    .select(
      `
      *,
      milestone:project_milestones!inner(id, project_id, title)
    `
    )
    .eq("user_id", user.id)
    .eq("milestone.project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching project journals:", error);
    throw error;
  }

  // Group by milestone
  const grouped: Record<string, MilestoneJournal[]> = {};
  (data || []).forEach((journal: any) => {
    const milestoneId = journal.milestone.id;
    if (!grouped[milestoneId]) {
      grouped[milestoneId] = [];
    }
    grouped[milestoneId].push(journal);
  });

  return grouped;
}

/**
 * Get journal entries for a specific milestone
 */
export async function getMilestoneJournals(
  milestoneId: string
): Promise<MilestoneJournal[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.MILESTONE_JOURNALS)
    .select("*")
    .eq("milestone_id", milestoneId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching milestone journals:", error);
    throw error;
  }

  return data || [];
}

/**
 * Add a reflection to a project
 */
export async function addProjectReflection(
  projectId: string,
  content: string,
  type: "milestone_complete" | "project_complete" | "general" = "general"
): Promise<ProjectReflection> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: reflection, error } = await supabase
    .from(TABLES.PROJECT_REFLECTIONS)
    .insert({
      project_id: projectId,
      user_id: user.id,
      content,
      reflection_type: type,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding project reflection:", error);
    throw error;
  }

  return reflection;
}

/**
 * Get all reflections for a project
 */
export async function getProjectReflections(
  projectId: string
): Promise<ProjectReflection[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.PROJECT_REFLECTIONS)
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching project reflections:", error);
    throw error;
  }

  return data || [];
}

// ========================================
// ACTIVITY & ANALYTICS FUNCTIONS
// ========================================

/**
 * Get today's activity across all projects
 */
export async function getDailyActivity(
  date?: Date
): Promise<DailyActivitySummary> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get journal entries for the day
  const { data: journals, error: journalsError } = await supabase
    .from(TABLES.MILESTONE_JOURNALS)
    .select(
      `
      *,
      milestone:project_milestones(id, title, project_id)
    `
    )
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (journalsError) {
    console.error("Error fetching daily journals:", journalsError);
  }

  // Get reflections for the day
  const { data: reflections, error: reflectionsError } = await supabase
    .from(TABLES.PROJECT_REFLECTIONS)
    .select(
      `
      *,
      project:journey_projects(id, title)
    `
    )
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (reflectionsError) {
    console.error("Error fetching daily reflections:", reflectionsError);
  }

  const projectsWorkedOn = new Set<string>();
  const milestonesWorkedOn = new Set<string>();

  (journals || []).forEach((journal: any) => {
    if (journal.milestone?.project_id) {
      projectsWorkedOn.add(journal.milestone.project_id);
    }
    if (journal.milestone_id) {
      milestonesWorkedOn.add(journal.milestone_id);
    }
  });

  (reflections || []).forEach((reflection: any) => {
    if (reflection.project_id) {
      projectsWorkedOn.add(reflection.project_id);
    }
  });

  return {
    date: targetDate.toISOString(),
    activities: [], // For future expansion with dedicated activity tracking
    total_duration_minutes: 0,
    activity_count: (journals?.length || 0) + (reflections?.length || 0),
    mood_average: null,
    energy_average: null,
    focus_average: null,
    productivity_average: null,
    projects_worked_on: Array.from(projectsWorkedOn),
    milestones_worked_on: Array.from(milestonesWorkedOn),
  };
}

/**
 * Get week's activity summary
 */
export async function getWeeklyActivity(): Promise<WeeklyProgress> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Get projects worked on this week
  const { data: activeProjects } = await supabase
    .from(TABLES.JOURNEY_PROJECTS)
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  // Get milestones completed this week
  const { data: completedMilestones } = await supabase
    .from(TABLES.PROJECT_MILESTONES)
    .select(
      `
      *,
      project:journey_projects!inner(user_id)
    `
    )
    .eq("project.user_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", weekStart.toISOString())
    .lt("completed_at", weekEnd.toISOString());

  const dailySummaries: DailyActivitySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const summary = await getDailyActivity(date);
    dailySummaries.push(summary);
  }

  return {
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
    projects_active: activeProjects?.length || 0,
    milestones_completed: completedMilestones?.length || 0,
    total_hours: 0, // For future expansion
    daily_summaries: dailySummaries,
    mood_trend: null,
    energy_trend: null,
    top_activities: [],
  };
}

/**
 * Get activity for a specific project
 */
export async function getActivityByProject(
  projectId: string,
  days: number = 30
): Promise<{ journals: MilestoneJournal[]; reflections: ProjectReflection[] }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { journals: [], reflections: [] };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get journals for project milestones
  const { data: journals } = await supabase
    .from(TABLES.MILESTONE_JOURNALS)
    .select(
      `
      *,
      milestone:project_milestones!inner(id, project_id)
    `
    )
    .eq("milestone.project_id", projectId)
    .eq("user_id", user.id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });

  // Get reflections for the project
  const { data: reflections } = await supabase
    .from(TABLES.PROJECT_REFLECTIONS)
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });

  return {
    journals: journals || [],
    reflections: reflections || [],
  };
}

/**
 * Get complete journey overview for dashboard
 */
export async function getJourneyOverview(
  userId?: string
): Promise<JourneyDashboard> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !userId) {
    throw new Error("User not authenticated");
  }

  const targetUserId = userId || user?.id;

  try {
    // Get active projects with milestones
    const { data: activeProjects } = await supabase
      .from(TABLES.JOURNEY_PROJECTS)
      .select(
        `
        *,
        milestones:project_milestones(*)
      `
      )
      .eq("user_id", targetUserId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false });

    // Get upcoming milestones (due within next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: upcomingMilestones } = await supabase
      .from(TABLES.PROJECT_MILESTONES)
      .select(
        `
        *,
        project:journey_projects!inner(user_id)
      `
      )
      .eq("project.user_id", targetUserId)
      .neq("status", "completed")
      .lte("due_date", nextWeek.toISOString())
      .order("due_date", { ascending: true });

    // Get overdue milestones
    const today = new Date();
    const { data: overdueMilestones } = await supabase
      .from(TABLES.PROJECT_MILESTONES)
      .select(
        `
        *,
        project:journey_projects!inner(user_id)
      `
      )
      .eq("project.user_id", targetUserId)
      .neq("status", "completed")
      .lt("due_date", today.toISOString())
      .order("due_date", { ascending: true });

    // Get recent reflections (last 5)
    const { data: recentReflections } = await supabase
      .from(TABLES.PROJECT_REFLECTIONS)
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent activities (last 10 journal entries)
    const { data: recentActivities } = await supabase
      .from(TABLES.MILESTONE_JOURNALS)
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get total milestones completed
    const { count: totalMilestonesCompleted } = await supabase
      .from(TABLES.PROJECT_MILESTONES)
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .in(
        "project_id",
        (activeProjects || []).map((p: any) => p.id)
      );

    // Calculate streak
    let currentStreak = 0;
    const { data: allJournals } = await supabase
      .from(TABLES.MILESTONE_JOURNALS)
      .select("created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (allJournals && allJournals.length > 0) {
      const journalDates = allJournals.map((j) =>
        new Date(j.created_at).toDateString()
      );
      const uniqueDates = Array.from(new Set(journalDates));

      const todayStr = today.toDateString();
      if (uniqueDates.includes(todayStr)) {
        currentStreak = 1;
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        let checkDate = yesterday;

        while (uniqueDates.includes(checkDate.toDateString())) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    const weeklyActivity = await getWeeklyActivity();

    return {
      user_id: targetUserId!,
      active_projects:
        (activeProjects || []).map((p: any) => ({
          ...p,
          milestones: p.milestones || [],
          milestone_count: p.milestones?.length || 0,
          completed_milestone_count:
            p.milestones?.filter((m: any) => m.status === "completed").length ||
            0,
        })) || [],
      recent_activities: (recentActivities as any) || [],
      upcoming_milestones: (upcomingMilestones as any) || [],
      overdue_milestones: (overdueMilestones as any) || [],
      recent_reflections: (recentReflections as any) || [],
      weekly_summary: weeklyActivity,
      productivity_metrics: {
        period: "week",
        period_start: weeklyActivity.week_start,
        period_end: weeklyActivity.week_end,
        total_activities: weeklyActivity.daily_summaries.reduce(
          (sum, day) => sum + day.activity_count,
          0
        ),
        total_hours: 0,
        average_daily_hours: 0,
        most_productive_activity_type: null,
        mood_distribution: {} as any,
        energy_distribution: {} as any,
        focus_distribution: {} as any,
        productivity_score: 0,
        consistency_score: 0,
        active_days: weeklyActivity.daily_summaries.filter(
          (d) => d.activity_count > 0
        ).length,
        total_days: 7,
      },
      current_streak_days: currentStreak,
      longest_streak_days: currentStreak, // TODO: Track this separately
      total_hours_tracked: 0,
      total_milestones_completed: totalMilestonesCompleted || 0,
    };
  } catch (error) {
    console.error("Error fetching journey overview:", error);
    throw error;
  }
}
