import { createClient } from "@/utils/supabase/client";
import { createClient as createClientServer } from "@/utils/supabase/server";
import {
  EmotionType,
  ReflectionWithMetrics,
  Tag,
  MonthlyInsight,
  ReflectionFormData,
  ReflectionTimelineNode,
  ReflectionCalendarDay,
} from "@/types/reflection";
import { Project, ProjectFormData } from "@/types/project";
import { SupabaseClient } from "@supabase/supabase-js";

export type { ReflectionTimelineNode };

const TABLE_NAMES = {
  REFLECTIONS: "reflections",
  TAGS: "tags",
  PROJECTS: "projects",
  PROJECT_TAGS: "project_tags",
  REFLECTION_METRICS: "reflection_metrics",
  MONTHLY_INSIGHTS: "monthly_insights",
} as const;

// --- PROJECT FUNCTIONS ---

export async function createProject(data: ProjectFormData): Promise<Project> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from(TABLE_NAMES.PROJECTS)
    .insert({
      user_id: user.id,
      name: data.name,
      goal: data.goal,
      description: data.description,
      image_url: data.image_url,
      link: data.link,
    })
    .select()
    .single();

  if (projectError) throw projectError;

  // 2. Link tags to the project
  if (data.tagIds?.length) {
    const { error: tagsError } = await supabase
      .from(TABLE_NAMES.PROJECT_TAGS)
      .insert(
        data.tagIds.map((tagId) => ({
          project_id: project.id,
          tag_id: tagId,
        }))
      );

    if (tagsError) throw tagsError;
  }

  // 3. Fetch the tags to return the full project object
  const { data: tags } = await supabase
    .from(TABLE_NAMES.TAGS)
    .select("*")
    .in("id", data.tagIds || []);

  return { ...project, tags: tags || [] };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(TABLE_NAMES.PROJECTS)
    .select(
      `
            *,
            tags:project_tags(tags(*))
        `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((p: any) => ({
    ...p,
    tags: p.tags.map((t: any) => t.tags),
  })) as Project[];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE_NAMES.PROJECTS)
    .select(
      `
            *,
            tags:project_tags(tags(*))
        `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    return null;
  }

  return {
    ...data,
    tags: data.tags.map((t: any) => t.tags),
  } as Project;
}

// --- REFLECTION FUNCTIONS ---

export async function createReflection(data: ReflectionFormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: reflection, error: reflectionError } = await supabase
    .from(TABLE_NAMES.REFLECTIONS)
    .insert({
      user_id: user.id,
      project_id: data.projectId,
      content: data.content,
      reason: data.reason,
      emotion: data.emotion,
    })
    .select()
    .single();

  if (reflectionError) throw reflectionError;

  // Add metrics
  const { error: metricsError } = await supabase
    .from(TABLE_NAMES.REFLECTION_METRICS)
    .insert({
      reflection_id: reflection.id,
      satisfaction: data.satisfaction,
      progress: data.progress,
      challenge: data.challenge,
    });

  if (metricsError) throw metricsError;

  return reflection.id;
}

export async function getReflections({
  limit = 50,
  offset = 0,
}: { limit?: number; offset?: number } = {}) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(TABLE_NAMES.REFLECTIONS)
    .select(
      `
      *,
      metrics:reflection_metrics(*),
      project:projects(*)
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return data.map((item) => ({
    ...item,
    metrics: item.metrics[0],
  })) as ReflectionWithMetrics[];
}

// Define the raw data type returned from Supabase
interface RawReflection {
  id: string;
  created_at: string;
  updated_at: string;
  emotion: string;
  content: string;
  user_id: string;
  project_id: string;
  reason: string;
  metrics: Array<{
    id: string;
    reflection_id: string;
    satisfaction: number;
    progress: number;
    challenge: number;
    created_at: string;
    updated_at: string;
  }>;
  project: Project;
}

export async function getUserDashboardData(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  console.log(data);
  const user = data.user;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const projectsPromise = supabase
    .from(TABLE_NAMES.PROJECTS)
    .select("*, tags:project_tags(tags(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const reflectionsPromise = supabase
    .from(TABLE_NAMES.REFLECTIONS)
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const workshopsPromise = supabase
    .from("user_workshops")
    .select("workshops(*)")
    .eq("user_id", user.id)
    .limit(3);

  const [projectsRes, reflectionsRes, workshopsRes] = await Promise.all([
    projectsPromise,
    reflectionsPromise,
    workshopsPromise,
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (reflectionsRes.error) throw reflectionsRes.error;
  if (workshopsRes.error) throw workshopsRes.error;

  // Calculate streak
  let streak = 0;
  if (reflectionsRes.data && reflectionsRes.data.length > 0) {
    const reflectionDates = reflectionsRes.data.map((r) =>
      new Date(r.created_at).toDateString()
    );
    const uniqueDates = [...new Set(reflectionDates)];

    const today = new Date();
    if (uniqueDates.includes(today.toDateString())) {
      streak = 1;
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      while (uniqueDates.includes(yesterday.toDateString())) {
        streak++;
        yesterday.setDate(yesterday.getDate() - 1);
      }
    }
  }

  return {
    projects: projectsRes.data.map((p) => ({
      ...p,
      tags: p.tags.map((t: any) => t.tags),
    })) as Project[],
    reflectionStreak: streak,
    workshops: workshopsRes.data.map((w: any) => w.workshops),
  };
}

/**
 * Fetches a single reflection by ID with full content
 * @param id The ID of the reflection to fetch
 * @returns Promise with the reflection data including full content
 */
export async function getReflectionById(
  id: string
): Promise<ReflectionWithMetrics | null> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.REFLECTIONS)
      .select(
        `
        id,
        created_at,
        updated_at,
        emotion,
        content,
        reason,
        user_id,
        project:projects(*, tags:project_tags(tags(*))),
        metrics:reflection_metrics(satisfaction, progress, challenge)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching reflection:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    const rawReflection = data as any;

    const reflectionData: ReflectionWithMetrics = {
      id: rawReflection.id,
      user_id: rawReflection.user_id,
      content: rawReflection.content,
      reason: rawReflection.reason,
      emotion: rawReflection.emotion as EmotionType,
      created_at: rawReflection.created_at,
      updated_at: rawReflection.updated_at,
      project: {
        ...rawReflection.project,
        tags: rawReflection.project.tags.map((t: any) => t.tags),
      },
      metrics: rawReflection.metrics?.[0] || {
        id: "",
        reflection_id: rawReflection.id,
        satisfaction: 0,
        progress: 0,
        challenge: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      contentPreview:
        rawReflection.content?.substring(0, 100) +
          (rawReflection.content?.length > 100 ? "..." : "") || "",
      satisfaction: rawReflection.metrics?.[0]?.satisfaction || 0,
      progress: rawReflection.metrics?.[0]?.progress || 0,
      challenge: rawReflection.metrics?.[0]?.challenge || 0,
    };

    return reflectionData;
  } catch (error) {
    console.error("Error in getReflectionById:", error);
    return null;
  }
}

export async function getUserTags() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE_NAMES.TAGS)
    .select("*")
    .order("name");

  if (error) throw error;
  return data as Tag[];
}

export async function createTag(name: string, color: string = "#6b7280") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from(TABLE_NAMES.TAGS)
    .insert({
      user_id: user.id,
      name,
      color,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Tag;
}

export async function getGraphData(): Promise<{
  projects: Project[];
  reflections: ReflectionWithMetrics[];
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { projects: [], reflections: [] };
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(
      `
      *,
      tags:project_tags(tags(*)),
      reflections:reflections(*, metrics:reflection_metrics(*))
    `
    )
    .eq("user_id", user.id);

  if (projectsError) {
    console.error("Error fetching graph data:", projectsError);
    throw projectsError;
  }

  const allReflections: ReflectionWithMetrics[] = [];
  const processedProjects = projects.map((p: any) => {
    const reflections =
      p.reflections?.map((r: any) => {
        const reflectionWithMetrics = {
          ...r,
          metrics: r.metrics?.[0],
          project: { id: p.id, name: p.name }, // Avoid circular dependency
        };
        allReflections.push(reflectionWithMetrics);
        return reflectionWithMetrics;
      }) || [];

    return {
      ...p,
      tags: p.tags.map((t: any) => t.tags),
      reflections,
    };
  });

  return { projects: processedProjects, reflections: allReflections };
}

export async function getReflectionCalendar(
  year: number,
  month?: number
): Promise<{ created_at: string; emotion: string }[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Correctly calculate date range for the query
  const startDate = month
    ? new Date(year, month - 1, 1)
    : new Date(year, 0, 1);
  const endDate = month
    ? new Date(year, month, 1)
    : new Date(year + 1, 0, 1);

  const { data, error } = await supabase
    .from("reflections")
    .select("created_at, emotion")
    .eq("user_id", user.id)
    .gte("created_at", startDate.toISOString())
    .lt("created_at", endDate.toISOString());

  if (error) {
    console.error("Error fetching reflection calendar data:", error);
    return [];
  }

  // Return raw data and let the client handle timezone-specific grouping
  return data;
}

export async function getMonthlyInsights(
  year: number,
  month: number
): Promise<MonthlyInsight | null> {
  // This is a placeholder. In a real app, you would fetch this from your backend.
  console.log(`Fetching insights for ${year}-${month}`);
  return {
    currentStreak: 5,
    lastReflectionDate: new Date().toISOString(),
    bestDay: {
      date: new Date().toISOString(),
      averageScore: 8.5,
      emotion: "happy",
    },
    mostCommonEmotion: {
      emotion: "creative",
      count: 12,
    },
    topTopics: [
      {
        tagId: "1",
        name: "3D Modeling",
        count: 8,
        averageScore: 7.8,
      },
      {
        tagId: "2",
        name: "Game Development",
        count: 6,
        averageScore: 8.2,
      },
    ],
    insights: [
      {
        title: "Creative Surge in 3D Modeling",
        description: "You seem to be most creative and engaged when working on 3D modeling projects, especially in the evenings.",
        suggestion: "Consider dedicating more evening time to 3D modeling to maximize your creative flow."
      }
    ]
  };
}
