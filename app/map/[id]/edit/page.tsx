import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EditMapPageClient from "./edit-page-client";

async function checkEditAccess(mapId: string) {
  const supabase = await createClient();

  // SECURITY: Validate mapId format to prevent injection
  if (!mapId || typeof mapId !== "string" || mapId.trim() === "") {
    console.error("Invalid map ID provided:", mapId);
    redirect("/map");
  }

  // SECURITY: Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("User not authenticated, redirecting to login");
    redirect("/login");
  }

  // SECURITY: Verify the map exists first
  const { data: existingMap, error: mapError } = await supabase
    .from("learning_maps")
    .select("id, creator_id, title, category, map_type, parent_seed_id")
    .eq("id", mapId)
    .single();

  if (mapError || !existingMap) {
    console.error("Map not found or error fetching map:", mapError);
    redirect("/map");
  }

  // Fetch seed info if this map belongs to a seed
  let seedInfo = null;
  if (existingMap.parent_seed_id) {
    const { data: seed } = await supabase
      .from("seeds")
      .select("id, seed_type")
      .eq("id", existingMap.parent_seed_id)
      .single();
    seedInfo = seed;
  }

  // SECURITY: Check if user has admin or instructor role
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "instructor"]);

  if (roleError) {
    console.error("Error checking user roles:", roleError);
  }

  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;

  // SECURITY: Restrict access to seed maps - only admins can edit seed maps directly
  if (existingMap.map_type === 'seed' && !isAdmin) {
    console.log(`User ${user.id} attempted to edit seed map ${mapId} without admin access`);
    redirect("/map");
  }

  // SECURITY: Check if user is the creator
  const isCreator = existingMap.creator_id === user.id;

  const isInstructor = roles?.some((r) => r.role === "instructor") ?? false;

  // SECURITY: Check if user is an editor of this map
  const { data: editorData, error: editorError } = await supabase
    .from("map_editors")
    .select("id")
    .eq("map_id", mapId)
    .eq("user_id", user.id)
    .single();

  if (editorError && editorError.code !== "PGRST116") {
    // PGRST116 is "not found", which is fine
    console.error("Error checking editor status:", editorError);
  }

  const isEditor = !!editorData;

  // SECURITY: Check access - user can edit if they're creator, editor, instructor (if creator), or admin
  const hasAccess = isAdmin || isCreator || isEditor || (isInstructor && isCreator);

  if (!hasAccess) {
    console.log(
      `User ${user.id} attempted to access map ${mapId} without permission`
    );
    redirect(`/map/${mapId}`);
  }

  const accessType = isAdmin ? "Admin" : isCreator ? "Creator" : isEditor ? "Editor" : "Instructor";
  console.log(
    `Access granted: ${accessType} editing map ${mapId}`
  );
  return { user, map: existingMap, isAdmin, seedInfo };
}

export default async function EditMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params for Next.js 15+
  const { id } = await params;

  // Check access before rendering
  const { map, seedInfo } = await checkEditAccess(id);

  // If we get here, user has proper access
  return <EditMapPageClient map={map} seedInfo={seedInfo} />;
}
