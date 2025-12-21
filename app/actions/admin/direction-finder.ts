"use server";

import { createClient } from "@/utils/supabase/server";
import { DirectionFinderResult, Message, AssessmentAnswers } from "@/types/direction-finder";

export type DirectionFinderResultRow = {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    answers: AssessmentAnswers;
    result: DirectionFinderResult;
    chat_history: Message[];
    chat_context: string | null;
    profiles: {
        email: string;
        full_name: string | null;
        username: string | null;
    } | null;
}

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

    if (!roles || roles.length === 0) {
        throw new Error("Unauthorized: Access denied");
    }

    return supabase;
}

export async function getAllDirectionFinderResults() {
    const supabase = await checkAdmin();

    const { data, error } = await supabase
        .from("direction_finder_results")
        .select("*, profiles(email, full_name, username)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching admin direction finder results:", error);
        throw new Error("Failed to fetch results");
    }

    return data as DirectionFinderResultRow[];
}

export async function deleteDirectionFinderResult(id: string) {
    const supabase = await checkAdmin();

    const { error } = await supabase
        .from("direction_finder_results")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting direction finder result:", error);
        throw new Error("Failed to delete result");
    }

    return { success: true };
}
