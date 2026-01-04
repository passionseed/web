"use server";

import { createClient } from "@/utils/supabase/server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/supabase/auth-client";
import { VinylColorScheme } from "@/utils/color-extraction";

// Types
export interface PSProject {
    id: string;
    name: string;
    description: string | null;
    goal: string | null;
    why: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    // Spotify Integration
    spotify_track_id?: string | null;
    spotify_track_name?: string | null;
    spotify_artist_name?: string | null;
    spotify_album_cover_url?: string | null;
    theme_color?: any | null; // using any for jsonb to avoid strict typing issues for now
    preview_url?: string | null;
}

export interface PSTask {
    id: string;
    project_id: string;
    goal: string;
    status: "todo" | "in_progress" | "done";
    difficulty: number;
    notes: string | null;
    user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface PSFocusSession {
    id: string;
    task_id: string | null;
    user_id: string | null;
    duration_minutes: number;
    notes: string | null;
    created_at: string;
}

// Helper to check role
async function checkPSRole() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Not authenticated");
    }

    const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

    const userRoles = roles?.map((r) => r.role as UserRole) || [];
    if (!userRoles.includes("passion-seed-team")) {
        throw new Error("Unauthorized");
    }
    return user.id;
}

// Projects
export async function getProjects() {
    await checkPSRole();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ps_projects")
        .select("*")
        .order("updated_at", { ascending: false });

    if (error) throw error;
    return data as PSProject[];
}

export async function createProject(formData: FormData) {
    const userId = await checkPSRole();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const goal = formData.get("goal") as string;
    const why = formData.get("why") as string;

    // Spotify fields
    const spotifyTrackId = formData.get("spotify_track_id") as string;
    const spotifyTrackName = formData.get("spotify_track_name") as string;
    const spotifyArtistName = formData.get("spotify_artist_name") as string;
    const spotifyAlbumCoverUrl = formData.get("spotify_album_cover_url") as string;
    const previewUrl = formData.get("preview_url") as string;

    let themeColor = null;
    const themeColorStr = formData.get("theme_color") as string;
    if (themeColorStr) {
        try {
            themeColor = JSON.parse(themeColorStr);
        } catch (e) {
            console.error("Failed to parse theme color", e);
        }
    }

    const supabase = await createClient();
    const { error } = await supabase.from("ps_projects").insert({
        name,
        description,
        goal,
        why,
        created_by: userId,
        spotify_track_id: spotifyTrackId || null,
        spotify_track_name: spotifyTrackName || null,
        spotify_artist_name: spotifyArtistName || null,
        spotify_album_cover_url: spotifyAlbumCoverUrl || null,
        preview_url: previewUrl || null,
        theme_color: themeColor,
    });

    if (error) throw error;
    revalidatePath("/ps/projects");
}

export async function getProject(id: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ps_projects")
        .select("*, ps_tasks(*)")
        .eq("id", id)
        .single();

    if (error) throw error;
    // Sort tasks manually or update query if needed
    if (data && data.ps_tasks) {
        data.ps_tasks.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    return data as PSProject & { ps_tasks: PSTask[] };
}

// Tasks
export async function createTask(formData: FormData) {
    const userId = await checkPSRole();
    const projectId = formData.get("projectId") as string;
    const goal = formData.get("goal") as string;
    const difficulty = parseInt(formData.get("difficulty") as string) || 1;
    const notes = formData.get("notes") as string;

    const supabase = await createClient();
    const { error } = await supabase.from("ps_tasks").insert({
        project_id: projectId,
        goal,
        difficulty,
        notes,
        user_id: userId,
        status: "todo",
    });

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase
        .from("ps_tasks")
        .update({ status })
        .eq("id", taskId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}

export async function updateTask(formData: FormData) {
    await checkPSRole();
    const taskId = formData.get("taskId") as string;
    const projectId = formData.get("projectId") as string;
    const goal = formData.get("goal") as string;
    const difficulty = parseInt(formData.get("difficulty") as string) || 1;
    const notes = formData.get("notes") as string;

    const supabase = await createClient();
    const { error } = await supabase
        .from("ps_tasks")
        .update({ goal, difficulty, notes })
        .eq("id", taskId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}

export async function deleteTask(taskId: string, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase.from("ps_tasks").delete().eq("id", taskId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}

// Focus Sessions
export async function createFocusSession(
    taskId: string,
    durationMinutes: number,
    notes: string
) {
    const userId = await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase.from("ps_focus_sessions").insert({
        task_id: taskId,
        user_id: userId,
        duration_minutes: durationMinutes,
        notes,
    });

    if (error) throw error;
    // May not need revalidate path immediately unless we show session history on the same page
}

export async function updateProject(formData: FormData) {
    const userId = await checkPSRole();
    const projectId = formData.get("projectId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const goal = formData.get("goal") as string;
    const why = formData.get("why") as string;

    // Spotify fields
    const spotifyTrackId = formData.get("spotify_track_id") as string;
    const spotifyTrackName = formData.get("spotify_track_name") as string;
    const spotifyArtistName = formData.get("spotify_artist_name") as string;
    const spotifyAlbumCoverUrl = formData.get("spotify_album_cover_url") as string;
    const previewUrl = formData.get("preview_url") as string;

    const supabase = await createClient();

    const updateData: any = {
        name,
        description,
        goal,
        why,
        updated_at: new Date().toISOString(),
        spotify_track_id: spotifyTrackId || null,
        spotify_track_name: spotifyTrackName || null,
        spotify_artist_name: spotifyArtistName || null,
        spotify_album_cover_url: spotifyAlbumCoverUrl || null,
        preview_url: previewUrl || null,
    };

    const themeColorStr = formData.get("theme_color") as string;
    if (themeColorStr) {
        try {
            updateData.theme_color = JSON.parse(themeColorStr);
        } catch (e) {
            console.error("Failed to parse theme color", e);
        }
    }


    const { error } = await supabase
        .from("ps_projects")
        .update(updateData)
        .eq("id", projectId); // Ensure RLS or checkPSRole is sufficient, usually checkPSRole is enough for this app context

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
    revalidatePath("/ps/projects");
}
// Leaderboard
export async function getWeeklyLeaderboard() {
    await checkPSRole();
    const supabase = await createClient();

    // Get start of the week (Monday)
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await supabase
        .from("ps_focus_sessions")
        .select("user_id, duration_minutes")
        .gte("created_at", startOfWeek.toISOString());

    if (error) throw error;

    // Aggregate by user
    const userMap = new Map<string, number>();
    sessions?.forEach((session) => {
        const uid = session.user_id;
        if (uid) {
            userMap.set(uid, (userMap.get(uid) || 0) + session.duration_minutes);
        }
    });

    if (userMap.size === 0) return [];

    // Fetch profiles
    const userIds = Array.from(userMap.keys());
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);

    if (profilesError) throw profilesError;

    // Combine data
    const leaderboard = profiles?.map(profile => ({
        userId: profile.id,
        name: profile.full_name || profile.username || "Unknown",
        avatarUrl: profile.avatar_url,
        totalMinutes: userMap.get(profile.id) || 0
    })).sort((a, b) => b.totalMinutes - a.totalMinutes); // Sort descending

    return leaderboard || [];
}

// Stats
export async function getProjectStats(projectId: string) {
    await checkPSRole();
    const supabase = await createClient();

    // 1. Feedback Count
    const { data: forms } = await supabase
        .from("ps_feedback_forms")
        .select("id")
        .eq("project_id", projectId);

    let feedbackCount = 0;
    if (forms && forms.length > 0) {
        const formIds = forms.map((f) => f.id);
        const { count, error } = await supabase
            .from("ps_submissions")
            .select("*", { count: "exact", head: true })
            .in("form_id", formIds);

        if (!error) feedbackCount = count || 0;
    }

    // 2. Focus Time
    const { data: tasks } = await supabase
        .from("ps_tasks")
        .select("id")
        .eq("project_id", projectId);

    let totalFocusMinutes = 0;
    if (tasks && tasks.length > 0) {
        const taskIds = tasks.map((t) => t.id);
        const { data: sessions, error } = await supabase
            .from("ps_focus_sessions")
            .select("duration_minutes")
            .in("task_id", taskIds);

        if (!error && sessions) {
            totalFocusMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
        }
    }


    return {
        feedbackCount,
        totalFocusMinutes
    };
}

export async function getProjectsWithStats() {
    await checkPSRole();
    const supabase = await createClient();

    // 1. Fetch Projects
    const { data: projects, error } = await supabase
        .from("ps_projects")
        .select("*, ps_tasks(*)")
        .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!projects) return [];

    // 2. Fetch Stats for all projects
    // Optimization: Depending on scale, we might want to do one big query or aggregation.
    // For now, let's map parallel since n is small.
    // Ideally user DB view or dedicated stats table.

    const projectsWithStats = await Promise.all(projects.map(async (p) => {
        const stats = await getProjectStats(p.id);

        // Calculate progress locally since we have tasks
        const totalTasks = p.ps_tasks.length;
        const completedTasks = p.ps_tasks.filter((t: any) => t.status === "done").length;
        const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        return {
            ...p,
            stats: {
                ...stats,
                progressPercent
            }
        };
    }));

    return projectsWithStats;
}
