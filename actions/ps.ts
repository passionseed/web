"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/supabase/auth-client";

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

    const supabase = await createClient();
    const { error } = await supabase.from("ps_projects").insert({
        name,
        description,
        goal,
        why,
        created_by: userId,
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
