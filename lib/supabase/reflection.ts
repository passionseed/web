import { createClient } from "@/utils/supabase/client";
import {
  EmotionType,
  ReflectionWithMetrics,
  Tag,
  MonthlyInsight,
  ReflectionFormData,
  ReflectionTimelineNode,
  ReflectionCalendarDay,
} from "@/types/reflection";

export type { ReflectionTimelineNode };

const TABLE_NAMES = {
  REFLECTIONS: "reflections",
  TAGS: "tags",
  REFLECTION_TAGS: "reflection_tags",
  REFLECTION_METRICS: "reflection_metrics",
  MONTHLY_INSIGHTS: "monthly_insights",
} as const;

export async function createReflection(
  data: Omit<ReflectionFormData, "tagIds"> & { tagIds?: string[] }
) {
  const supabase = createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const { data: reflection, error: reflectionError } = await supabase
    .from(TABLE_NAMES.REFLECTIONS)
    .insert({
      user_id: userId,
      content: data.content,
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
      engagement: data.engagement,
      challenge: data.challenge,
    });

  if (metricsError) throw metricsError;

  // Add tags if any
  if (data.tagIds?.length) {
    const { error: tagsError } = await supabase
      .from(TABLE_NAMES.REFLECTION_TAGS)
      .insert(
        data.tagIds.map((tagId) => ({
          reflection_id: reflection.id,
          tag_id: tagId,
        }))
      );

    if (tagsError) throw tagsError;
  }

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
      tags:reflection_tags(tags(*))
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return data.map((item) => ({
    ...item,
    tags: item.tags.map((t: { tags: Tag }) => t.tags),
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
  metrics: Array<{
    id: string;
    reflection_id: string;
    satisfaction: number;
    engagement: number;
    challenge: number;
    created_at: string;
    updated_at: string;
  }>;
  tags: Array<{ tags: Tag }>;
}

/**
 * Fetches the reflection timeline for the current user
 * @param userId Optional user ID to fetch reflections for (server-side only)
 * @returns Promise with array of reflection timeline nodes
 */
export async function getReflectionTimeline(): Promise<
  ReflectionTimelineNode[]
> {
  try {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();

    // Get current user for client-side
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return [];
    }

    // Fetch reflections for the current user
    const { data, error } = await supabase
      .from(TABLE_NAMES.REFLECTIONS)
      .select(
        `
        id,
        created_at,
        emotion,
        content,
        user_id,
        metrics:reflection_metrics(satisfaction, engagement, challenge),
        tags:reflection_tags(tags(id, name, color))
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Type assertion for the raw data
    const rawReflections = data as unknown as RawReflection[];

    // Map the data to the expected format
    return rawReflections.map((item) => ({
      id: item.id,
      date: item.created_at,
      emotion: item.emotion,
      contentPreview:
        item.content?.substring(0, 100) +
          (item.content?.length > 100 ? "..." : "") || "",
      tags: item.tags?.map((t) => t.tags).filter(Boolean) || [],
      metrics: item.metrics?.[0],
    })) as ReflectionTimelineNode[];
  } catch (error) {
    console.error("Unexpected error in getReflectionTimeline:", error);
    return [];
  }
}

/**
 * Fetches a single reflection by ID with full content
 * @param id The ID of the reflection to fetch
 * @returns Promise with the reflection data including full content
 */
export async function getReflectionById(id: string): Promise<ReflectionWithMetrics | null> {
  try {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();

    // Get current user for client-side
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return null;
    }

    // Fetch the reflection with metrics and tags
    const { data, error } = await supabase
      .from(TABLE_NAMES.REFLECTIONS)
      .select(
        `
        id,
        created_at,
        updated_at,
        emotion,
        content,
        user_id,
        metrics:reflection_metrics(satisfaction, engagement, challenge),
        tags:reflection_tags(tags(id, name, color))
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

    // Type assertion for the raw data
    const rawReflection = data as unknown as RawReflection;

    // Map to the expected format
    const reflectionData: ReflectionWithMetrics = {
      id: rawReflection.id,
      user_id: rawReflection.user_id,
      content: rawReflection.content,
      emotion: rawReflection.emotion as EmotionType,
      created_at: rawReflection.created_at,
      updated_at: rawReflection.updated_at,
      metrics: rawReflection.metrics?.[0] || {
        id: '',
        reflection_id: rawReflection.id,
        satisfaction: 0,
        engagement: 0,
        challenge: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      tags: rawReflection.tags?.map((t) => t.tags).filter((t): t is Tag => Boolean(t)) || [],
      // For backward compatibility with ReflectionTimelineNode
      contentPreview: rawReflection.content?.substring(0, 100) + (rawReflection.content?.length > 100 ? '...' : '') || '',
      satisfaction: rawReflection.metrics?.[0]?.satisfaction || 0,
      engagement: rawReflection.metrics?.[0]?.engagement || 0,
      challenge: rawReflection.metrics?.[0]?.challenge || 0,
    };

    return reflectionData;
  } catch (error) {
    console.error("Error in getReflectionById:", error);
    return null;
  }
}

export async function getMostUsedTags(limit: number = 3): Promise<Tag[]> {
  const supabase = createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // First, get the count of each tag usage for the user
  const { data: tagCounts, error: countError } = await supabase.rpc(
    "get_user_tag_counts",
    {
      user_id: userId,
      _limit: limit,
    }
  );

  if (countError) throw countError;

  // If we have tag counts, get the full tag details
  if (tagCounts && tagCounts.length > 0) {
    const tagIds = tagCounts.map((tc: any) => tc.tag_id);
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .select("*")
      .in("id", tagIds);

    if (tagsError) throw tagsError;

    // Merge the tag details with their counts
    return tagCounts
      .map((tc: any) => {
        const tag = tags.find((t: any) => t.id === tc.tag_id);
        return tag ? { ...tag, count: tc.count } : null;
      })
      .filter(Boolean);
  }

  return [];
}

export async function getMonthlyInsights(year: number, month: number) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(TABLE_NAMES.MONTHLY_INSIGHTS)
    .select(
      `
      *,
      most_used_tag:most_used_tag_id(*)
    `
    )
    .eq("year", year)
    .eq("month", month)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    throw error;
  }

  return data as (MonthlyInsight & { most_used_tag: Tag | null }) | null;
}

export async function getReflectionCalendar(
  year: number,
  month: number
): Promise<ReflectionCalendarDay[]> {
  const supabase = createClient();

  // Get start and end of month
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0).toISOString();

  const { data, error } = await supabase
    .from(TABLE_NAMES.REFLECTIONS)
    .select(
      `
      id,
      created_at,
      emotion,
      tags:reflection_tags(tags(name))
    `
    )
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) throw error;

  // Create a map of date to reflection data
  const reflectionsByDate = new Map<
    string,
    {
      emotion: EmotionType | null;
      tags: string[];
    }
  >();

  data.forEach((reflection) => {
    const date = new Date(reflection.created_at).toISOString().split("T")[0];
    reflectionsByDate.set(date, {
      emotion: reflection.emotion,
      tags: reflection.tags.map((t: { tags: { name: string } }) => t.tags.name),
    });
  });

  // Generate all days of the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar: ReflectionCalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day).toISOString().split("T")[0];
    const reflection = reflectionsByDate.get(date);

    calendar.push({
      date,
      emotion: reflection?.emotion || null,
      hasReflection: !!reflection,
      tags: reflection?.tags || [],
    });
  }

  return calendar;
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
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from(TABLE_NAMES.TAGS)
    .insert({
      user_id: userId,
      name,
      color,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Tag;
}

// Generate monthly insights (to be called at the end of each month)
export async function generateMonthlyInsights(year: number, month: number) {
  const supabase = createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Get all reflections for the month
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0).toISOString();

  const { data: reflections } = await supabase
    .from(TABLE_NAMES.REFLECTIONS)
    .select("emotion, reflection_tags(tags(*))")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (!reflections?.length) return null;

  // Calculate top emotion
  const emotionCounts = new Map<EmotionType, number>();
  reflections.forEach((r) => {
    const count = emotionCounts.get(r.emotion) || 0;
    emotionCounts.set(r.emotion, count + 1);
  });

  const [topEmotion, topEmotionCount] = Array.from(
    emotionCounts.entries()
  ).sort((a, b) => b[1] - a[1])[0] || [null, 0];

  // Calculate most used tag
  const tagCounts = new Map<string, { count: number; tag: Tag }>();

  reflections.forEach((reflection) => {
    (reflection.reflection_tags as { tags: Tag }[]).forEach(({ tags }) => {
      const current = tagCounts.get(tags.id) || { count: 0, tag: tags };
      tagCounts.set(tags.id, { count: current.count + 1, tag: tags });
    });
  });

  const mostUsedTag =
    Array.from(tagCounts.values()).sort((a, b) => b.count - a.count)[0]?.tag ||
    null;

  // Insert or update monthly insights
  const { data: insight, error } = await supabase
    .from(TABLE_NAMES.MONTHLY_INSIGHTS)
    .upsert(
      {
        user_id: userId,
        year,
        month,
        top_emotion: topEmotion,
        top_emotion_count: topEmotionCount,
        most_used_tag_id: mostUsedTag?.id || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,year,month",
      }
    )
    .select()
    .single();

  if (error) throw error;

  return {
    ...insight,
    most_used_tag: mostUsedTag,
  } as MonthlyInsight & { most_used_tag: Tag | null };
}
