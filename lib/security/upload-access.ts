import { createClient } from "@/utils/supabase/server";

export type UploadAccessResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string; canEditMap: boolean }
  | { ok: false; status: number; error: string };

function isTempNodeId(nodeId: string): boolean {
  return /^temp_node_[a-zA-Z0-9_-]{6,128}$/.test(nodeId);
}

export async function requireUploadAccess(
  nodeId: string
): Promise<UploadAccessResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  if (!nodeId || typeof nodeId !== "string") {
    return { ok: false, status: 400, error: "Valid nodeId is required" };
  }

  if (isTempNodeId(nodeId)) {
    // Temp nodes are only for creation, user has full access to their own temp node context
    return { ok: true, supabase, userId: user.id, canEditMap: true };
  }

  const { data: node, error: nodeError } = await supabase
    .from("map_nodes")
    .select("id, map_id")
    .eq("id", nodeId)
    .single();

  if (nodeError || !node) {
    return { ok: false, status: 403, error: "Node not found or access denied" };
  }

  const [{ data: map }, { data: adminOrInstructor }, { data: editor }, { data: enrollment }] =
    await Promise.all([
      supabase
        .from("learning_maps")
        .select("id, creator_id")
        .eq("id", node.map_id)
        .single(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "instructor"])
        .limit(1),
      supabase
        .from("map_editors")
        .select("id")
        .eq("map_id", node.map_id)
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("user_map_enrollments")
        .select("id")
        .eq("map_id", node.map_id)
        .eq("user_id", user.id)
        .limit(1),
    ]);

  const canEditMap =
    map?.creator_id === user.id ||
    (adminOrInstructor?.length ?? 0) > 0 ||
    (editor?.length ?? 0) > 0;

  const isAllowed = canEditMap || (enrollment?.length ?? 0) > 0;

  if (!isAllowed) {
    return { ok: false, status: 403, error: "Node not found or access denied" };
  }

  return { ok: true, supabase, userId: user.id, canEditMap };
}
