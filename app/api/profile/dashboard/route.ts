import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  buildLearningJourney,
  calculateReflectionStreak,
  getProfileViewModel,
  type DashboardEnrollment,
  type DashboardProgress,
} from "@/components/profile/profile-dashboard-utils";

async function safeQuery<T>(
  label: string,
  run: () => PromiseLike<{ data: T | null; error: { message?: string } | null }>,
  fallback: T
) {
  try {
    const { data, error } = await run();

    if (error) {
      console.warn(`[profile dashboard] ${label} unavailable:`, error.message);
      return fallback;
    }

    return (data ?? fallback) as T;
  } catch (error) {
    console.warn(`[profile dashboard] ${label} failed:`, error);
    return fallback;
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    rolesData,
    classroomMemberships,
    teamMemberships,
    projectRows,
    projectCount,
    workshopRows,
    workshopCount,
    detailedMindmapReflections,
    mindmapReflectionDates,
    reflectionDates,
    enrollmentRows,
    mentorAvailabilityRows,
  ] = await Promise.all([
    safeQuery(
      "roles",
      () => supabase.from("user_roles").select("role").eq("user_id", user.id),
      [] as Array<{ role: string }>
    ),
    safeQuery(
      "classrooms",
      () =>
        supabase
          .from("classroom_memberships")
          .select(
            `
            classroom_id,
            role,
            classrooms!inner (
              id,
              name,
              description
            )
          `
          )
          .eq("user_id", user.id),
      [] as any[]
    ),
    safeQuery(
      "teams",
      () =>
        supabase
          .from("team_memberships")
          .select(
            `
            team_id,
            is_leader,
            left_at,
            classroom_teams!inner (
              id,
              name,
              classroom_id
            )
          `
          )
          .eq("user_id", user.id)
          .is("left_at", null),
      [] as any[]
    ),
    safeQuery(
      "projects recent",
      () =>
        supabase
          .from("projects")
          .select("id, name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      [] as Array<{ id: string; name: string; created_at: string }>
    ),
    safeQuery(
      "project count",
      async () => {
        const { count, error } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        return { data: count ?? 0, error };
      },
      0
    ),
    safeQuery(
      "workshops recent",
      () =>
        supabase
          .from("user_workshops")
          .select(
            `
            workshops (
              id,
              title,
              slug
            )
          `
          )
          .eq("user_id", user.id)
          .limit(3),
      [] as any[]
    ),
    safeQuery(
      "workshop count",
      async () => {
        const { count, error } = await supabase
          .from("user_workshops")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", user.id);

        return { data: count ?? 0, error };
      },
      0
    ),
    safeQuery(
      "recent mindmap reflections",
      () =>
        supabase
          .from("mindmap_reflections")
          .select(
            `
            id,
            created_at,
            overall_reflection,
            satisfaction_rating,
            progress_rating,
            challenge_rating,
            mindmap_topics (
              id,
              text,
              notes,
              satisfaction_rating,
              progress_rating,
              challenge_rating,
              reflection_why
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      [] as Array<{
        id: string;
        created_at: string;
        overall_reflection: string | null;
        satisfaction_rating: number | null;
        progress_rating: number | null;
        challenge_rating: number | null;
        mindmap_topics: Array<{
          id: string;
          text: string;
          notes: string | null;
          satisfaction_rating: number | null;
          progress_rating: number | null;
          challenge_rating: number | null;
          reflection_why: string | null;
        }>;
      }>
    ),
    safeQuery(
      "mindmap reflection dates",
      () =>
        supabase
          .from("mindmap_reflections")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
      [] as Array<{ created_at: string }>
    ),
    safeQuery(
      "reflection dates",
      () =>
        supabase
          .from("reflections")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
      [] as Array<{ created_at: string }>
    ),
    safeQuery(
      "enrollments",
      () =>
        supabase
          .from("user_map_enrollments")
          .select(
            `
            enrolled_at,
            completed_at,
            progress_percentage,
            learning_maps!inner (
              id,
              title,
              category,
              map_nodes (
                id,
                title,
                difficulty,
                node_type,
                metadata,
                node_paths_source:node_paths!node_paths_source_node_id_fkey (
                  destination_node_id
                ),
                node_assessments (id)
              )
            )
          `
          )
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
      [] as any[]
    ),
    safeQuery(
      "mentor availability",
      () =>
        supabase
          .from("mentor_availability")
          .select("day_of_week, start_time, end_time")
          .eq("mentor_id", user.id),
      [] as Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
      }>
    ),
  ]);

  const normalizedEnrollments: DashboardEnrollment[] = enrollmentRows.map(
    (enrollment: any) => ({
      ...enrollment,
      learning_maps: Array.isArray(enrollment.learning_maps)
        ? enrollment.learning_maps[0] ?? null
        : enrollment.learning_maps ?? null,
    })
  )

  const nodeIds = normalizedEnrollments.flatMap(
    (enrollment) =>
      enrollment.learning_maps?.map_nodes
        ?.map((node) => node.id)
        .filter(Boolean) ?? []
  );

  const progressRows =
    nodeIds.length === 0
      ? ([] as DashboardProgress[])
      : await safeQuery(
          "node progress",
          () =>
            supabase
              .from("student_node_progress")
              .select("node_id, status")
              .eq("user_id", user.id)
              .in("node_id", nodeIds),
          [] as DashboardProgress[]
        );

  const roles = rolesData.map((entry) => entry.role);
  const view = getProfileViewModel(roles);
  const learningJourney = buildLearningJourney(normalizedEnrollments, progressRows);
  const reflectionStreak = calculateReflectionStreak([
    ...mindmapReflectionDates.map((entry) => entry.created_at),
    ...reflectionDates.map((entry) => entry.created_at),
  ]);

  return NextResponse.json({
    roles,
    view,
    classrooms: classroomMemberships.map((membership: any) => {
      const classroom = Array.isArray(membership.classrooms)
        ? membership.classrooms[0]
        : membership.classrooms

      return {
      classroomId: membership.classroom_id,
      role: membership.role,
      name: classroom?.name ?? "Untitled classroom",
      description: classroom?.description ?? null,
      }
    }),
    teams: teamMemberships.map((membership: any) => {
      const team = Array.isArray(membership.classroom_teams)
        ? membership.classroom_teams[0]
        : membership.classroom_teams

      return {
      teamId: membership.team_id,
      classroomId: team?.classroom_id ?? null,
      name: team?.name ?? "Untitled team",
      isLeader: Boolean(membership.is_leader),
      }
    }),
    projects: {
      count: projectCount,
      recent: projectRows,
    },
    workshops: {
      count: workshopCount,
      recent: workshopRows
        .map((entry: any) =>
          Array.isArray(entry.workshops) ? entry.workshops[0] : entry.workshops
        )
        .filter(Boolean),
    },
    reflections: {
      streak: reflectionStreak,
      recent: detailedMindmapReflections.map((reflection) => ({
        id: reflection.id,
        createdAt: reflection.created_at,
        overallReflection: reflection.overall_reflection,
        satisfactionRating: reflection.satisfaction_rating,
        progressRating: reflection.progress_rating,
        challengeRating: reflection.challenge_rating,
        topics: (reflection.mindmap_topics ?? []).slice(0, 3),
      })),
    },
    learningJourney,
    mentorAvailabilityDays: new Set(
      mentorAvailabilityRows.map((slot) => slot.day_of_week)
    ).size,
  });
}
