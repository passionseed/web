"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyUserNewRequest, notifyUserTaskAssignment, notifyUserRequestAssignment, notifyRequesterRequestAccepted } from "@/lib/discord-notify";

// Type definitions
export interface PSRequest {
    id: string;
    title: string;
    description: string | null;
    priority: "urgent" | "normal" | "low";
    category: string;
    attachment_urls: string[] | null;
    requesting_project_id: string;
    receiving_project_id: string;
    created_by: string;
    date_needed: string;
    date_modified: string | null;
    created_at: string;
    status: "pending" | "accepted" | "rejected" | "in_progress" | "completed";
    assigned_to: string | null;
    assigned_at: string | null;
    rejection_reason: string | null;
    rejected_at: string | null;
    rejected_by: string | null;
    accepted_at: string | null;
    accepted_by: string | null;
    completed_at: string | null;
    updated_at: string;
    // Joined fields
    requesting_project?: { id: string; name: string; type: string };
    receiving_project?: { id: string; name: string; type: string };
    assigned_user?: { id: string; full_name: string; email: string };
    creator?: { id: string; full_name: string; email: string };
}

/**
 * Create a new request
 */
export async function createRequest(formData: FormData) {
    const supabase = await createClient();

    const requestData = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        priority: formData.get("priority") as "urgent" | "normal" | "low",
        category: (formData.get("category") as string) || "General",
        requesting_project_id: formData.get("requesting_project_id") as string,
        receiving_project_id: formData.get("receiving_project_id") as string,
        date_needed: formData.get("date_needed") as string,
        attachment_urls: formData.get("attachment_urls")
            ? JSON.parse(formData.get("attachment_urls") as string)
            : null,
    };

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("ps_requests")
        .insert({
            ...requestData,
            created_by: user.id,
            status: "pending",
        })
        .select()
        .single();

    if (error) throw error;

    // Notify members of the receiving project about the new request
    try {
        console.log("[Discord] 🔔 New request created, preparing to notify receiving project members");
        const { data: receivingProject } = await supabase
            .from("ps_projects")
            .select("name")
            .eq("id", requestData.receiving_project_id)
            .single();

        console.log("[Discord] Receiving project:", receivingProject?.name);
        console.log("[Discord] Fetching requesting project...");
        const { data: requestingProject } = await supabase
            .from("ps_projects")
            .select("name")
            .eq("id", requestData.requesting_project_id)
            .single();

        console.log("[Discord] Requesting project:", requestingProject?.name);
        console.log("[Discord] Fetching project members for project:", requestData.receiving_project_id);

        // Fetch members
        const { data: members, error: membersError } = await supabase
            .from("ps_project_members")
            .select("user_id")
            .eq("project_id", requestData.receiving_project_id);

        if (membersError) {
            console.error("[Discord] ❌ Error fetching members:", membersError);
        }

        console.log("[Discord] Found", members?.length || 0, "members in receiving project");

        if (members && members.length > 0 && receivingProject && requestingProject) {
            // Fetch profiles for all members
            const userIds = members.map(m => m.user_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, discord_uid, full_name")
                .in("id", userIds);

            console.log("[Discord] Fetched", profiles?.length || 0, "profiles");

            // Send notifications to users with discord_uid
            for (const member of members) {
                const profile = profiles?.find(p => p.id === member.user_id);
                const discordUid = profile?.discord_uid;

                console.log("[Discord]   - User:", profile?.full_name || member.user_id, "discord_uid:", discordUid || "NOT SET");

                if (discordUid) {
                    console.log("[Discord] 📥 Sending notification to", profile?.full_name);
                    const result = await notifyUserNewRequest(discordUid, {
                        requestTitle: requestData.title,
                        requestingProject: requestingProject.name,
                        receivingProject: receivingProject.name,
                        dateNeeded: requestData.date_needed,
                        priority: requestData.priority,
                    });
                    console.log("[Discord] Result:", result);
                }
            }
        }
    } catch (notifyError) {
        console.error("Failed to send Discord notifications:", notifyError);
        // Don't fail the request creation if notifications fail
    }

    revalidatePath("/ps/projects");
    revalidatePath(`/ps/projects/${requestData.requesting_project_id}`);
    revalidatePath(`/ps/projects/${requestData.receiving_project_id}`);

    return data;
}

/**
 * Get requests for a project (incoming or outgoing)
 */
export async function getProjectRequests(
    projectId: string,
    type: "incoming" | "outgoing"
) {
    const supabase = await createClient();

    const column =
        type === "incoming" ? "receiving_project_id" : "requesting_project_id";

    // First get the requests
    const { data, error } = await supabase
        .from("ps_requests")
        .select("*")
        .eq(column, projectId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching requests:", error);
        return [];
    }

    if (!data || data.length === 0) {
        return [];
    }

    // Get all project IDs
    const projectIds = Array.from(
        new Set([
            ...data.map((r) => r.requesting_project_id),
            ...data.map((r) => r.receiving_project_id),
        ])
    );

    // Fetch all projects
    const { data: projects } = await supabase
        .from("ps_projects")
        .select("id, name, type")
        .in("id", projectIds);

    // Fetch all users
    const userIds = Array.from(
        new Set([
            ...data.map((r) => r.created_by).filter(Boolean),
            ...data.map((r) => r.assigned_to).filter(Boolean),
        ])
    );

    const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

    // Combine the data
    const requests = data.map((request) => ({
        ...request,
        requesting_project: projects?.find(
            (p) => p.id === request.requesting_project_id
        ),
        receiving_project: projects?.find(
            (p) => p.id === request.receiving_project_id
        ),
        creator: users?.find((u) => u.id === request.created_by),
        assigned_user: request.assigned_to
            ? users?.find((u) => u.id === request.assigned_to)
            : undefined,
    }));

    return requests as PSRequest[];
}

/**
 * Get a single request by ID
 */
export async function getRequestById(requestId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("ps_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (error) throw error;

    // Fetch related data
    const [projectsResult, usersResult] = await Promise.all([
        supabase
            .from("ps_projects")
            .select("id, name, type")
            .in("id", [data.requesting_project_id, data.receiving_project_id]),
        supabase
            .from("profiles")
            .select("id, full_name, email")
            .in(
                "id",
                [data.created_by, data.assigned_to].filter(Boolean) as string[]
            ),
    ]);

    return {
        ...data,
        requesting_project: projectsResult.data?.find(
            (p) => p.id === data.requesting_project_id
        ),
        receiving_project: projectsResult.data?.find(
            (p) => p.id === data.receiving_project_id
        ),
        creator: usersResult.data?.find((u) => u.id === data.created_by),
        assigned_user: data.assigned_to
            ? usersResult.data?.find((u) => u.id === data.assigned_to)
            : undefined,
    } as PSRequest;
}

/**
 * Accept a request and assign it to a user
 */
export async function acceptRequest(
    requestId: string,
    assignedTo: string,
    dateNeeded?: string
) {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get request to find project IDs for revalidation
    const { data: request } = await supabase
        .from("ps_requests")
        .select("requesting_project_id, receiving_project_id")
        .eq("id", requestId)
        .single();

    const updateData: any = {
        status: "accepted",
        assigned_to: assignedTo,
        assigned_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
    };

    if (dateNeeded) {
        updateData.date_needed = dateNeeded;
        updateData.date_modified = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from("ps_requests")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single();

    if (error) throw error;

    // Notify the assigned user via Discord
    if (assignedTo) {
        console.log("[Discord] 📌 Starting request assignment notification for assignedTo:", assignedTo);
        try {
            const { data: assignedUser } = await supabase
                .from("profiles")
                .select("discord_uid, full_name")
                .eq("id", assignedTo)
                .single();

            const { data: requestDetails } = await supabase
                .from("ps_requests")
                .select("title, date_needed, receiving_project_id")
                .eq("id", requestId)
                .single();

            const { data: project } = await supabase
                .from("ps_projects")
                .select("name")
                .eq("id", requestDetails?.receiving_project_id)
                .single();

            const { data: assignedByUser } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single();

            if (assignedUser?.discord_uid && requestDetails && project) {
                await notifyUserRequestAssignment(assignedUser.discord_uid, {
                    requestTitle: requestDetails.title,
                    projectName: project.name,
                    dateNeeded: requestDetails.date_needed,
                    assignedBy: assignedByUser?.full_name || "Someone",
                });
            }
        } catch (notifyError) {
            console.error("Failed to send Discord notification for request assignment:", notifyError);
            // Don't fail the request acceptance if notification fails
        }
    }

    // Notify the requester (creator) via Discord
    if (request && request.requesting_project_id) {
        try {
            console.log("[Discord] 📌 Starting request acceptance notification for creator");

            // Get the request details with creator
            const { data: requestDetails } = await supabase
                .from("ps_requests")
                .select("title, created_by, date_needed")
                .eq("id", requestId)
                .single();

            if (requestDetails && requestDetails.created_by) {
                const { data: creator } = await supabase
                    .from("profiles")
                    .select("discord_uid, full_name")
                    .eq("id", requestDetails.created_by)
                    .single();

                const { data: project } = await supabase
                    .from("ps_projects")
                    .select("name")
                    .eq("id", request.receiving_project_id) // The project accepting the request
                    .single();

                const { data: acceptedByUser } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .single();

                if (creator?.discord_uid && project) {
                    await notifyRequesterRequestAccepted(creator.discord_uid, {
                        requestTitle: requestDetails.title,
                        acceptedByProject: project.name,
                        acceptedByUser: acceptedByUser?.full_name || "Someone",
                        dateNeeded: requestDetails.date_needed
                    });
                    console.log("[Discord] ✅ Notification sent to requester:", creator.full_name);
                } else {
                    console.log("[Discord] ⚠️ Skipping requester notification - missing data or discord_uid");
                }
            } else {
                console.log("[Discord] ⚠️ Could not find request details or creator");
            }

        } catch (notifyError) {
            console.error("[Discord] ❌ Failed to send Discord notification to requester:", notifyError);
        }
    }

    if (request) {
        revalidatePath(`/ps/projects/${request.requesting_project_id}`);
        revalidatePath(`/ps/projects/${request.receiving_project_id}`);
    }

    return data;
}

/**
 * Reject a request
 */
export async function rejectRequest(requestId: string, reason: string) {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get request to find project IDs for revalidation
    const { data: request } = await supabase
        .from("ps_requests")
        .select("requesting_project_id, receiving_project_id")
        .eq("id", requestId)
        .single();

    const { data, error } = await supabase
        .from("ps_requests")
        .update({
            status: "rejected",
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            rejected_by: user.id,
        })
        .eq("id", requestId)
        .select()
        .single();

    if (error) throw error;

    if (request) {
        revalidatePath(`/ps/projects/${request.requesting_project_id}`);
        revalidatePath(`/ps/projects/${request.receiving_project_id}`);
    }

    return data;
}

/**
 * Update request status (in_progress, completed)
 */
export async function updateRequestStatus(
    requestId: string,
    status: "in_progress" | "completed"
) {
    const supabase = await createClient();

    // Get request to find project IDs for revalidation
    const { data: request } = await supabase
        .from("ps_requests")
        .select("requesting_project_id, receiving_project_id")
        .eq("id", requestId)
        .single();

    const updateData: any = {
        status,
    };

    if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from("ps_requests")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single();

    if (error) throw error;

    if (request) {
        revalidatePath(`/ps/projects/${request.requesting_project_id}`);
        revalidatePath(`/ps/projects/${request.receiving_project_id}`);
    }

    return data;
}

/**
 * Get requests for calendar view (accepted, in_progress, or completed requests within date range)
 */
export async function getCalendarRequests(
    projectId: string,
    startDate: Date,
    endDate: Date
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("ps_requests")
        .select("*")
        .or(
            `requesting_project_id.eq.${projectId},receiving_project_id.eq.${projectId}`
        )
        .in("status", ["accepted", "in_progress"])
        .gte("date_needed", startDate.toISOString())
        .lte("date_needed", endDate.toISOString())
        .order("date_needed", { ascending: true });

    if (error) {
        console.error("Error fetching calendar requests:", error);
        return [];
    }

    if (!data || data.length === 0) {
        return [];
    }

    // Fetch related projects
    const projectIds = Array.from(
        new Set([
            ...data.map((r) => r.requesting_project_id),
            ...data.map((r) => r.receiving_project_id),
        ])
    );

    const { data: projects } = await supabase
        .from("ps_projects")
        .select("id, name, type")
        .in("id", projectIds);

    // Fetch assigned users
    const userIds = data
        .map((r) => r.assigned_to)
        .filter(Boolean) as string[];

    const { data: users } =
        userIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds)
            : { data: [] };

    const requests = data.map((request) => ({
        ...request,
        requesting_project: projects?.find(
            (p) => p.id === request.requesting_project_id
        ),
        receiving_project: projects?.find(
            (p) => p.id === request.receiving_project_id
        ),
        assigned_user: request.assigned_to
            ? users?.find((u) => u.id === request.assigned_to)
            : undefined,
    }));

    return requests as PSRequest[];
}

/**
 * Cancel a request (only by requester, only if pending)
 */
export async function cancelRequest(requestId: string) {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get request to verify user is creator and status is pending
    const { data: request } = await supabase
        .from("ps_requests")
        .select("created_by, status, requesting_project_id, receiving_project_id")
        .eq("id", requestId)
        .single();

    if (!request) throw new Error("Request not found");
    if (request.created_by !== user.id)
        throw new Error("Only creator can cancel request");
    if (request.status !== "pending")
        throw new Error("Can only cancel pending requests");

    const { error } = await supabase
        .from("ps_requests")
        .delete()
        .eq("id", requestId);

    if (error) throw error;

    revalidatePath(`/ps/projects/${request.requesting_project_id}`);
    revalidatePath(`/ps/projects/${request.receiving_project_id}`);

    return { success: true };
}

/**
 * Get count of pending unassigned incoming requests for multiple projects
 * Returns a map of project ID to count
 */
export async function getPendingRequestCounts(projectIds: string[]): Promise<Record<string, number>> {
    const supabase = await createClient();

    if (!projectIds || projectIds.length === 0) {
        return {};
    }

    const { data, error } = await supabase
        .from("ps_requests")
        .select("receiving_project_id")
        .in("receiving_project_id", projectIds)
        .eq("status", "pending")
        .is("assigned_to", null);

    if (error) {
        console.error("Error fetching pending request counts:", error);
        return {};
    }

    // Count requests per project
    const counts: Record<string, number> = {};
    projectIds.forEach(id => counts[id] = 0);

    data?.forEach(req => {
        counts[req.receiving_project_id] = (counts[req.receiving_project_id] || 0) + 1;
    });

    return counts;
}

/**
 * Get requests assigned to the current user
 */
export async function getUserAssignedRequests(): Promise<PSRequest[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from("ps_requests")
        .select("*")
        .eq("assigned_to", user.id)
        .order("date_needed", { ascending: true });

    if (error) {
        console.error("Error fetching user assigned requests:", error);
        return [];
    }

    if (!data || data.length === 0) {
        return [];
    }

    // Fetch related projects
    const projectIds = Array.from(
        new Set([
            ...data.map((r) => r.requesting_project_id),
            ...data.map((r) => r.receiving_project_id),
        ])
    );

    const { data: projects } = await supabase
        .from("ps_projects")
        .select("id, name, type")
        .in("id", projectIds);

    // Fetch users
    const userIds = Array.from(
        new Set([
            ...data.map((r) => r.created_by).filter(Boolean),
            ...data.map((r) => r.assigned_to).filter(Boolean),
        ])
    );

    const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

    // Enrich requests with project and user data
    const enrichedRequests = data.map((request) => ({
        ...request,
        requesting_project: projects?.find((p) => p.id === request.requesting_project_id),
        receiving_project: projects?.find((p) => p.id === request.receiving_project_id),
        created_by_profile: users?.find((u) => u.id === request.created_by),
        assigned_to_profile: users?.find((u) => u.id === request.assigned_to),
    }));

    return enrichedRequests as PSRequest[];
}
