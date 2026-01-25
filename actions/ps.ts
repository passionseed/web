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
    paper_text?: string | null;
    type?: 'project' | 'hackathon';
}

export interface PSTask {
    id: string;
    project_id: string;
    goal: string;
    status: "todo" | "in_progress" | "done";
    difficulty: number;
    notes: string | null;
    user_id: string | null;
    assigned_to: string | null;
    scheduled_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface PSProjectMember {
    user_id: string;
    role: string;
    joined_at: string;
    user?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
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
    const type = (formData.get("type") as string) || "project"; // Added type field

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
    const { data: project, error } = await supabase.from("ps_projects").insert({
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
        type, // Added type field
    }).select().single();

    if (error) throw error;

    // Auto-join creator as member (admin role could be added later, default 'member' is fine for now or 'owner')
    if (project) {
        await supabase.from("ps_project_members").insert({
            project_id: project.id,
            user_id: userId,
            role: 'owner'
        });
    }

    revalidatePath("/ps/projects");
}

export async function joinProject(projectId: string) {
    const userId = await checkPSRole();
    const supabase = await createClient();

    // Check if already a member
    const { data: existing } = await supabase
        .from("ps_project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single();

    if (existing) return;

    const { error } = await supabase.from("ps_project_members").insert({
        project_id: projectId,
        user_id: userId,
        role: 'member'
    });

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}

export async function getProjectMembers(projectId: string) {
    await checkPSRole();
    const supabase = await createClient();

    const { data: members, error } = await supabase
        .from("ps_project_members")
        .select("*")
        .eq("project_id", projectId);

    if (error) throw error;

    if (!members || members.length === 0) return [];

    // Fetch profiles
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);

    // Merge profile data
    return members.map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        return {
            ...m,
            user: profile || { full_name: "Unknown", username: "Unknown", avatar_url: null }
        };
    }) as PSProjectMember[];
}

export async function getProject(id: string) {
    await checkPSRole();
    const supabase = await createClient();
    // We need to fetch tasks with their feedback links count
    const { data, error } = await supabase
        .from("ps_projects")
        .select(`
            *,
            ps_tasks (
                *,
                ps_feedback_task_links (count)
            )
        `)
        .eq("id", id)
        .single();

    if (error) throw error;

    // Sort tasks manually or update query if needed
    if (data && data.ps_tasks) {
        // Flatten count
        data.ps_tasks = data.ps_tasks.map((t: any) => ({
            ...t,
            feedback_count: t.ps_feedback_task_links?.[0]?.count || 0
        }));

        data.ps_tasks.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    return data as PSProject & { ps_tasks: (PSTask & { feedback_count?: number })[] };
}

export async function getUserTasks() {
    const userId = await checkPSRole();
    const supabase = await createClient();

    // Fetch tasks assigned to the user OR created by the user (if unassigned? usually assignments matter more)
    // "shows all task for only the user" -> likely assigned items.
    // Let's get tasks where assigned_to = userId OR (assigned_to IS NULL AND user_id = userId)
    const { data, error } = await supabase
        .from("ps_tasks")
        .select(`
            *,
            ps_projects (
                name,
                theme_color
            )
        `)
        .or(`assigned_to.eq.${userId},and(assigned_to.is.null,user_id.eq.${userId})`)
        // Maybe user wants done tasks too? "Seven days box" usually implies calendar view.
        // Calendar view usually needs ALL tasks to show history.
        // But "tasks for the user" usually implies Todo.
        // If it's a 7-day view, we surely want to see tasks scheduled for those days regardless of status?
        // Let's fetch all, client can filter.
        .order("scheduled_date", { ascending: true }); // optimize for calendar

    if (error) throw error;
    return data as (PSTask & { ps_projects: { name: string, theme_color: any } })[];
}

// Tasks
export async function createTask(formData: FormData) {
    const userId = await checkPSRole();
    const projectId = formData.get("projectId") as string;
    const goal = formData.get("goal") as string;
    const difficulty = parseInt(formData.get("difficulty") as string) || 1;
    const notes = formData.get("notes") as string;
    const submissionId = formData.get("submissionId") as string | null;

    const assignedTo = formData.get("assignedTo") as string || userId; // Default to creator if not specified

    const supabase = await createClient();
    const { data: task, error } = await supabase.from("ps_tasks").insert({
        project_id: projectId,
        goal,
        difficulty,
        notes,
        user_id: userId, // Creator
        assigned_to: assignedTo, // Assignee
        status: "todo",
    }).select().single();

    if (error) throw error;

    if (submissionId && task) {
        await supabase.from("ps_feedback_task_links").insert({
            submission_id: submissionId,
            task_id: task.id
        });
    }

    revalidatePath(`/ps/projects/${projectId}`);
    if (submissionId) {
        revalidatePath(`/ps/projects/${projectId}/feedback`);
    }
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
    const assignedTo = formData.get("assignedTo") as string;

    const updatePayload: any = { goal, difficulty, notes };
    if (assignedTo) {
        updatePayload.assigned_to = assignedTo;
    }

    const { error } = await supabase
        .from("ps_tasks")
        .update(updatePayload)
        .eq("id", taskId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}

export async function updateTaskPartial(taskId: string, projectId: string, updates: Partial<PSTask>) {
    await checkPSRole();
    const supabase = await createClient();

    // Whitelist allowed fields for safety
    const allowedFields = ['goal', 'status', 'difficulty', 'notes', 'assigned_to', 'scheduled_date'];
    const safeUpdates: any = {};

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            // @ts-ignore
            safeUpdates[key] = updates[key];
        }
    });

    if (Object.keys(safeUpdates).length === 0) return;

    const { error } = await supabase
        .from("ps_tasks")
        .update(safeUpdates)
        .eq("id", taskId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}`);
}



// ... existing code ...

export async function updateTaskDate(taskId: string, date: string | null, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase
        .from("ps_tasks")
        .update({ scheduled_date: date })
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

export async function getProjectsWithStats(type: string = 'project') {
    await checkPSRole();
    const supabase = await createClient();

    // 1. Fetch Projects
    const { data: projects, error } = await supabase
        .from("ps_projects")
        .select("*, ps_tasks(*)")
        .eq("type", type)
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

export async function updatePaperText(projectId: string, text: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("ps_projects")
        .update({ paper_text: text, updated_at: new Date().toISOString() })
        .eq("id", projectId);

    if (error) throw error;
}

import { createAdminClient } from "@/utils/supabase/admin";

export async function getWeeklyFocusStats() {
    await checkPSRole();
    const supabase = await createClient();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await supabase
        .from("ps_focus_sessions")
        .select(`
            duration_minutes,
            created_at,
            user_id
        `)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch user details - use same approach as getWeeklyLeaderboard
    const userIds = Array.from(new Set(sessions.map((s) => s.user_id).filter(Boolean))) as string[];

    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);

    // Build userMap with fallback
    const userMap = new Map();
    if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
            userMap.set(profile.id, profile.full_name || profile.username || profile.id.substring(0, 8));
        });
    }

    // Add fallback for any user IDs without profiles
    userIds.forEach(id => {
        if (!userMap.has(id)) {
            userMap.set(id, id.substring(0, 8));
        }
    });

    return { sessions: sessions || [], userMap: Object.fromEntries(userMap) };
}
