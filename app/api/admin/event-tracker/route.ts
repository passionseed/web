import { NextRequest, NextResponse } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { UserEvent, UserPlannerStatusRow } from "@/types/events";

type PlannerStatus = "not_started" | "in_progress" | "completed" | "churned";

function getStatus(lastEventAt: string | null, hasPlanCreated: boolean, hasAnyEvent: boolean): PlannerStatus {
  if (!hasAnyEvent) return "not_started";
  if (hasPlanCreated) return "completed";
  if (!lastEventAt) return "in_progress";

  const lastEvent = new Date(lastEventAt);
  const churnedThreshold = new Date();
  churnedThreshold.setDate(churnedThreshold.getDate() - 7);

  return lastEvent < churnedThreshold ? "churned" : "in_progress";
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!role) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await ensureAdmin();
    if ("error" in auth) return auth.error;

    const admin = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const days = Number.parseInt(searchParams.get("days") || "7", 10);

    if (userId) {
      const { data, error } = await admin
        .from("user_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: "Failed to fetch user events" }, { status: 500 });
      }

      return NextResponse.json({ events: data ?? [] });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [{ data: profiles, error: profilesError }, { data: allEvents, error: eventsError }] =
      await Promise.all([
        admin.from("profiles").select("id, full_name"),
        admin.from("user_events").select("*").order("created_at", { ascending: false }),
      ]);

    if (profilesError || eventsError) {
      return NextResponse.json({ error: "Failed to fetch event tracker data" }, { status: 500 });
    }

    const profileNameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
    const events = allEvents ?? [];

    const usersById = new Map<string, UserPlannerStatusRow>();
    const sessionIdsByUser = new Map<string, Set<string>>();
    const eventsByUser = new Map<string, UserEvent[]>();

    for (const event of events) {
      if (!eventsByUser.has(event.user_id)) {
        eventsByUser.set(event.user_id, []);
      }
      eventsByUser.get(event.user_id)?.push(event as UserEvent);

      if (!sessionIdsByUser.has(event.user_id)) {
        sessionIdsByUser.set(event.user_id, new Set());
      }
      if (event.session_id) {
        sessionIdsByUser.get(event.user_id)?.add(event.session_id);
      }
    }

    for (const [eventUserId, existingEvents] of eventsByUser.entries()) {
      const steps = new Set<string>();
      for (const candidate of existingEvents) {
        if (
          [
            "portfolio_uploaded",
            "interest_quiz_completed",
            "tcas_program_viewed",
            "tcas_program_saved",
            "plan_created",
          ].includes(candidate.event_type)
        ) {
          steps.add(candidate.event_type);
        }
      }

      const lastEventAt = existingEvents[0]?.created_at ?? event.created_at;
      const status = getStatus(
        lastEventAt,
        existingEvents.some((candidate) => candidate.event_type === "plan_created"),
        existingEvents.length > 0
      );

      usersById.set(eventUserId, {
        user_id: eventUserId,
        email: "Hidden",
        profile_name: profileNameById.get(eventUserId) ?? null,
        status,
        last_event_at: lastEventAt,
        steps_completed: steps.size,
      });
    }

    const filteredEvents = events.filter((event) => new Date(event.created_at) >= startDate) as UserEvent[];

    const users = Array.from(usersById.values()).sort((a, b) => {
      if (!a.last_event_at) return 1;
      if (!b.last_event_at) return -1;
      return new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime();
    });

    const totalUsers = users.length;
    const completed = users.filter((user) => user.status === "completed").length;
    const activeToday = users.filter((user) => {
      if (!user.last_event_at) return false;
      return new Date(user.last_event_at).toDateString() === new Date().toDateString();
    }).length;

    const avgSessions =
      sessionIdsByUser.size > 0
        ? Array.from(sessionIdsByUser.values()).reduce((sum, sessions) => sum + sessions.size, 0) /
          sessionIdsByUser.size
        : 0;

    return NextResponse.json({
      stats: {
        totalUsers,
        activeToday,
        completed,
        avgSessions: Math.round(avgSessions * 10) / 10,
      },
      users,
      events: filteredEvents,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/event-tracker:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
