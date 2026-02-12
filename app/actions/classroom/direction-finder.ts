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

async function checkClassroomAccess(classroomId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    // Check if user is an admin
    const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
    const isAdmin = roles && roles.length > 0;

    if (isAdmin) {
        return { supabase, user };
    }

    // Check if user is instructor or ta in the classroom
    const { data: membership } = await supabase
        .from("classroom_memberships")
        .select("role")
        .eq("classroom_id", classroomId)
        .eq("user_id", user.id)
        .single();

    if (!membership || (membership.role !== "instructor" && membership.role !== "ta")) {
        throw new Error("Unauthorized: Access denied");
    }

    return { supabase, user };
}

export async function getClassroomDirectionFinderResults(classroomId: string) {
    const { supabase } = await checkClassroomAccess(classroomId);

    // 1. Get all students in the classroom
    const { data: students, error: studentsError } = await supabase
        .from("classroom_memberships")
        .select("user_id")
        .eq("classroom_id", classroomId)
        .eq("role", "student");

    if (studentsError) {
        console.error("Error fetching classroom students:", studentsError);
        throw new Error("Failed to fetch students");
    }

    if (!students || students.length === 0) {
        return [] as DirectionFinderResultRow[];
    }

    const studentIds = students.map(s => s.user_id);

    // 2. Fetch direction finder results for these students
    const { data, error } = await supabase
        .from("direction_finder_results")
        .select("*, profiles(email, full_name, username)")
        .in("user_id", studentIds)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching classroom direction finder results:", error);
        throw new Error("Failed to fetch results");
    }

    // 3. Deduplicate: keep only the latest result per student
    const seenUsers = new Set<string>();
    const uniqueResults = (data || []).filter(result => {
        if (seenUsers.has(result.user_id)) {
            return false;
        }
        seenUsers.add(result.user_id);
        return true;
    });

    return uniqueResults as DirectionFinderResultRow[];
}
