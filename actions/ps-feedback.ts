"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/supabase/auth-client";

// --- Types ---
export interface PSForm {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    team_notes: string | null;
    token: string;
    is_active: boolean;
    require_auth: boolean;
    created_at: string;
    task_id?: string | null;
}


export interface PSFormField {
    id: string;
    form_id: string;
    label: string;
    field_type: "text" | "long_text" | "rating" | "boolean" | "select";
    options: any;
    is_required: boolean;
    order_index: number;
}

export interface PSSubmission {
    id: string;
    form_id: string;
    user_id: string | null; // Authenticated user
    internal_rating: number | null;
    internal_notes: string | null;
    created_at: string;
    ps_submission_answers?: PSSubmissionAnswer[];
    ps_details?: any; // Join details
}

export interface PSSubmissionAnswer {
    id: string;
    submission_id: string;
    field_id: string;
    answer_text: string | null;
    answer_number: number | null;
    answer_boolean: boolean | null;
    field_label?: string; // For display convenience
}

// --- Auth Helper ---
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

// --- Form Management (Team) ---

export async function createForm(projectId: string, title: string, description: string, teamNotes: string, requireAuth: boolean) {
    const userId = await checkPSRole();
    const supabase = await createClient();

    const { data: form, error } = await supabase
        .from("ps_feedback_forms")
        .insert({
            project_id: projectId,
            title,
            description,
            team_notes: teamNotes,
            require_auth: requireAuth,
            created_by: userId
        })
        .select()
        .single();

    if (error) throw error;

    // Create default fields
    const fields = [
        { form_id: form.id, label: "What did you like?", field_type: "long_text", order_index: 0 },
        { form_id: form.id, label: "What can be improved?", field_type: "long_text", order_index: 1 },
        { form_id: form.id, label: "Rate your experience", field_type: "rating", order_index: 2, is_required: true },
    ];

    const { error: fieldsError } = await supabase.from("ps_form_fields").insert(fields);
    if (fieldsError) throw fieldsError;

    revalidatePath(`/ps/projects/${projectId}/feedback`);
    return form;
}

export async function getProjectForms(projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ps_feedback_forms")
        .select("*, ps_form_fields(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as (PSForm & { ps_form_fields: PSFormField[] })[];
}

export async function getFormWithFields(formId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ps_feedback_forms")
        .select("*, ps_form_fields(*)")
        .eq("id", formId)
        .single();

    if (error) throw error;
    // Sort fields
    if (data.ps_form_fields) {
        data.ps_form_fields.sort((a: any, b: any) => a.order_index - b.order_index);
    }
    return data as PSForm & { ps_form_fields: PSFormField[] };
}

export async function deleteForm(formId: string, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase.from("ps_feedback_forms").delete().eq("id", formId);
    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function updateForm(formId: string, projectId: string, updates: Partial<PSForm>) {
    await checkPSRole();
    const supabase = await createClient();

    const safeUpdates: any = {};
    if (updates.title !== undefined) safeUpdates.title = updates.title;
    if (updates.description !== undefined) safeUpdates.description = updates.description;
    if (updates.require_auth !== undefined) safeUpdates.require_auth = updates.require_auth;
    if (updates.task_id !== undefined) safeUpdates.task_id = updates.task_id;

    const { error } = await supabase
        .from("ps_feedback_forms")
        .update(safeUpdates)
        .eq("id", formId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function getProjectTasks(projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ps_tasks")
        .select("id, goal, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

// --- Public Access ---

export async function getPublicForm(token: string) {
    const supabase = await createClient();
    // Only fetch active forms
    const { data, error } = await supabase
        .from("ps_feedback_forms")
        .select("*, ps_form_fields(*)")
        .eq("token", token)
        .eq("is_active", true)
        .single();

    if (error) throw new Error("Form not found or inactive");

    // Sort fields
    if (data.ps_form_fields) {
        data.ps_form_fields.sort((a: any, b: any) => a.order_index - b.order_index);
    }
    return data as PSForm & { ps_form_fields: PSFormField[] };
}

export async function submitFeedback(token: string, answers: Record<string, any>) {
    const supabase = await createClient();

    // Check form
    const { data: form, error: formError } = await supabase
        .from("ps_feedback_forms")
        .select("id, require_auth")
        .eq("token", token)
        .single();

    if (formError || !form) throw new Error("Invalid form");

    let userId = null;
    if (form.require_auth) {
        // Verify user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");
        userId = user.id;
    } else {
        // Ensure user is anon or try to get user if logged in anyway?
        // Let's attach user if logged in, but not enforce
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
    }

    // Create Submission
    const { data: sub, error: subError } = await supabase
        .from("ps_submissions")
        .insert({
            form_id: form.id,
            user_id: userId,
        })
        .select()
        .single();

    if (subError) throw subError;

    // Create Answers
    // keys in 'answers' are field_ids
    const answerRows = Object.entries(answers).map(([fieldId, value]) => {
        const row: any = { submission_id: sub.id, field_id: fieldId };
        if (typeof value === 'boolean') row.answer_boolean = value;
        else if (typeof value === 'number') row.answer_number = value;
        else row.answer_text = String(value);
        return row;
    });

    if (answerRows.length > 0) {
        const { error: ansError } = await supabase.from("ps_submission_answers").insert(answerRows);
        if (ansError) throw ansError;
    }

    return { success: true };
}

// --- Feedback Management (Team) ---

export async function getProjectSubmissions(projectId: string) {
    await checkPSRole();
    const supabase = await createClient();

    // We need to join forms -> submissions
    // Can't do deep join easily with order, so let's fetch forms then submissions
    const { data: forms } = await supabase.from("ps_feedback_forms").select("id").eq("project_id", projectId);
    const formIds = forms?.map(f => f.id) || [];

    if (formIds.length === 0) return [];

    const { data, error } = await supabase
        .from("ps_submissions")
        .select(`
            *,
            ps_feedback_forms (title),
            ps_submission_answers (
                id, field_id, answer_text, answer_number, answer_boolean,
                ps_form_fields (label)
            ),
            ps_feedback_task_links (
                task_id, 
                ps_tasks (goal, status)
            )
        `)
        .in("form_id", formIds)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function updateSubmissionInternal(submissionId: string, rating: number | null, notes: string | null, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase
        .from("ps_submissions")
        .update({ internal_rating: rating, internal_notes: notes })
        .eq("id", submissionId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function linkSubmissionToTask(submissionId: string, taskId: string, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase
        .from("ps_feedback_task_links")
        .insert({ submission_id: submissionId, task_id: taskId });

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function addField(formId: string, projectId: string, fieldType: string, label: string) {
    await checkPSRole();
    const supabase = await createClient();

    // Get current max order
    const { data: maxOrderData } = await supabase
        .from("ps_form_fields")
        .select("order_index")
        .eq("form_id", formId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const newOrder = (maxOrderData?.order_index ?? -1) + 1;

    const { error } = await supabase.from("ps_form_fields").insert({
        form_id: formId,
        label,
        field_type: fieldType,
        order_index: newOrder,
        is_required: false
    });

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function updateField(fieldId: string, projectId: string, updates: Partial<PSFormField>) {
    await checkPSRole();
    const supabase = await createClient();

    // safe update whitelist
    const safeUpdates: any = {};
    if (updates.label !== undefined) safeUpdates.label = updates.label;
    if (updates.is_required !== undefined) safeUpdates.is_required = updates.is_required;
    if (updates.options !== undefined) safeUpdates.options = updates.options;
    // order_index handled separately usually, but can be here if careful

    const { error } = await supabase
        .from("ps_form_fields")
        .update(safeUpdates)
        .eq("id", fieldId);

    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function deleteField(fieldId: string, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();
    const { error } = await supabase.from("ps_form_fields").delete().eq("id", fieldId);
    if (error) throw error;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function duplicateField(fieldId: string, projectId: string) {
    await checkPSRole();
    const supabase = await createClient();

    // 1. Get original field
    const { data: original, error: fetchError } = await supabase
        .from("ps_form_fields")
        .select("*")
        .eq("id", fieldId)
        .single();

    if (fetchError || !original) throw new Error("Field not found");

    // 2. Shift orders down for subsequent fields in the form
    // We want to insert AFTER the original.
    const targetOrder = original.order_index + 1;

    // Inefficient shift but works for small forms:
    // Update all fields with order >= targetOrder to order + 1
    // Need to do this carefully. 
    // Ideally we leave gaps or use floats, but here we used int.
    // Let's just shift everything > original.order_index by 1?
    // Wait, original is at N. New will be at N+1. Old N+1 becomes N+2.

    // Supabase doesn't support complex update-with-self-reference easily in one go without stored procedured for extensive reordering?
    // Let's just do a simple shift.

    const { error: shiftError } = await supabase.rpc('increment_field_orders', {
        p_form_id: original.form_id,
        p_start_index: targetOrder
    });

    // If we don't have RPC, we can do it via raw query or fetching.
    // Let's assume no RPC for now and use a raw SQL call via rpc or just fetch-update (slow).
    // Actually, let's just insert at end and let user move it? No, duplicate usually places next to it.

    // Simple approach: Get all fields, insert in array, re-write orders?
    // Better: Just fetch fields with order > N, loop and update? 
    // Yes, for < 50 items it's fine.

    const { data: fieldsToShift } = await supabase
        .from("ps_form_fields")
        .select("id, order_index")
        .eq("form_id", original.form_id)
        .gte("order_index", targetOrder)
        .order("order_index", { ascending: false }); // Work backwards to avoid unique constraint?

    if (fieldsToShift) {
        for (const f of fieldsToShift) {
            await supabase.from("ps_form_fields").update({ order_index: f.order_index + 1 }).eq("id", f.id);
        }
    }

    // 3. Insert Copy
    const { error: insertError } = await supabase.from("ps_form_fields").insert({
        form_id: original.form_id,
        label: `${original.label} (Copy)`,
        field_type: original.field_type,
        is_required: original.is_required,
        options: original.options,
        order_index: targetOrder
    });

    if (insertError) throw insertError;
    revalidatePath(`/ps/projects/${projectId}/feedback`);
}

export async function moveField(fieldId: string, projectId: string, direction: "up" | "down") {
    await checkPSRole();
    const supabase = await createClient();

    // Fetch all fields for this form to determine order
    // First get the form_id of the field
    const { data: targetField } = await supabase
        .from("ps_form_fields")
        .select("form_id, order_index")
        .eq("id", fieldId)
        .single();

    if (!targetField) throw new Error("Field not found");

    const { data: fields } = await supabase
        .from("ps_form_fields")
        .select("id, order_index")
        .eq("form_id", targetField.form_id)
        .order("order_index", { ascending: true });

    if (!fields) return;

    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= fields.length) return; // Cannot move

    const neighbor = fields[swapIndex];

    // Swap order_index
    // We update both. To avoid unique constraint issues if any (unlikely on order_index alone but good practice),
    // we can update one to temporary or just direct update if no constraint.
    // Standard swap:

    const updates = [
        { id: fieldId, order_index: neighbor.order_index },
        { id: neighbor.id, order_index: targetField.order_index }
    ];

    for (const update of updates) {
        await supabase.from("ps_form_fields").update({ order_index: update.order_index }).eq("id", update.id);
    }

    revalidatePath(`/ps/projects/${projectId}/feedback`);
}
