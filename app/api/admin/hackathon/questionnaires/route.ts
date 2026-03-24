import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Use service client for hackathon data (no RLS on these tables)
    const serviceClient = getServiceClient();

    // Fetch all participants with their questionnaire data
    const { data: participants, error } = await serviceClient
      .from("hackathon_participants")
      .select(`
        id,
        name,
        email,
        university,
        created_at,
        hackathon_pre_questionnaires!hackathon_pre_questionnaires_participant_id_fkey(
          loves,
          good_at,
          school_level,
          problem_preferences,
          confidence_level,
          family_support_level,
          team_role_preference,
          ai_proficiency,
          dream_faculty,
          why_hackathon
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching participants with questionnaires:", error);
      return NextResponse.json(
        { error: "Failed to fetch participants" },
        { status: 500 }
      );
    }

    // Transform data and calculate stats
    const transformedParticipants = participants.map((p: any) => {
      const questionnaire = p.hackathon_pre_questionnaires;
      const hasQuestionnaire = !!questionnaire;

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        university: p.university,
        created_at: p.created_at,
        loves: questionnaire?.loves || null,
        good_at: questionnaire?.good_at || null,
        school_level: questionnaire?.school_level || null,
        problem_preferences: questionnaire?.problem_preferences || null,
        confidence_level: questionnaire?.confidence_level || null,
        family_support_level: questionnaire?.family_support_level || null,
        team_role_preference: questionnaire?.team_role_preference || null,
        ai_proficiency: questionnaire?.ai_proficiency || null,
        dream_faculty: questionnaire?.dream_faculty || null,
        why_hackathon: questionnaire?.why_hackathon || null,
        has_questionnaire: hasQuestionnaire,
      };
    });

    // Calculate statistics
    const totalParticipants = transformedParticipants.length;
    const completedQuestionnaire = transformedParticipants.filter(
      (p) => p.has_questionnaire
    ).length;
    const completionRate =
      totalParticipants > 0
        ? Math.round((completedQuestionnaire / totalParticipants) * 100)
        : 0;

    // Calculate problem counts
    const problemCounts: Record<string, number> = {};
    let totalProblemsSaved = 0;

    transformedParticipants.forEach((p) => {
      if (p.problem_preferences && Array.isArray(p.problem_preferences)) {
        totalProblemsSaved += p.problem_preferences.length;
        p.problem_preferences.forEach((problem: string) => {
          problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        });
      }
    });

    const avgProblemsSaved =
      completedQuestionnaire > 0
        ? Math.round((totalProblemsSaved / completedQuestionnaire) * 10) / 10
        : 0;

    // School level breakdown
    const schoolLevelBreakdown = { university: 0, high_school: 0 };
    transformedParticipants.forEach((p) => {
      if (p.school_level === "university") {
        schoolLevelBreakdown.university++;
      } else if (p.school_level === "high_school") {
        schoolLevelBreakdown.high_school++;
      }
    });

    // Role distribution
    const roleDistribution: Record<string, number> = {};
    transformedParticipants.forEach((p) => {
      if (p.team_role_preference) {
        roleDistribution[p.team_role_preference] =
          (roleDistribution[p.team_role_preference] || 0) + 1;
      }
    });

    // Helper function to count array items
    function countArrayItems(
      participants: typeof transformedParticipants,
      field: "loves" | "good_at"
    ): Array<{ item: string; count: number }> {
      const counts: Record<string, number> = {};

      participants.forEach((p) => {
        const items = p[field];
        if (items && Array.isArray(items)) {
          items.forEach((item: string) => {
            counts[item] = (counts[item] || 0) + 1;
          });
        }
      });

      return Object.entries(counts)
        .map(([item, count]) => ({ item, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    const topLoves = countArrayItems(transformedParticipants, "loves");
    const topGoodAt = countArrayItems(transformedParticipants, "good_at");

    const stats = {
      total_participants: totalParticipants,
      completed_questionnaire: completedQuestionnaire,
      completion_rate: completionRate,
      avg_problems_saved: avgProblemsSaved,
      problem_counts: problemCounts,
      school_level_breakdown: schoolLevelBreakdown,
      role_distribution: roleDistribution,
      top_loves: topLoves,
      top_good_at: topGoodAt,
    };

    return NextResponse.json({
      participants: transformedParticipants,
      stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in hackathon questionnaires API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
