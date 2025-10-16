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

  // SECURITY: Check if user has admin or instructor role
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "instructor"]);

  if (roleError) {
    console.error("Error checking user roles:", roleError);
    redirect(`/map/${mapId}`);
  }

  if (!roles || roles.length === 0) {
    console.log(
      "User does not have admin or instructor role, redirecting to map viewer"
    );
    redirect(`/map/${mapId}`);
  }

  // SECURITY: Verify the map exists
  const { data: existingMap, error: mapError } = await supabase
    .from("learning_maps")
    .select("id, creator_id, title, category")
    .eq("id", mapId)
    .single();

  if (mapError || !existingMap) {
    console.error("Map not found or error fetching map:", mapError);
    redirect("/map");
  }

  // SECURITY: Check map ownership
  // Admins can edit any map, instructors can only edit maps they created
  const isAdmin = roles.some((r) => r.role === "admin");
  const isCreator = existingMap.creator_id === user.id;

  if (!isAdmin && !isCreator) {
    console.log(
      `User ${user.id} attempted to access map ${mapId} created by ${existingMap.creator_id} without permission`
    );
    redirect(`/map/${mapId}`);
  }

  console.log(
    `Access granted: ${isAdmin ? "Admin" : "Creator"} editing map ${mapId}`
  );
  return { user, map: existingMap, isAdmin };
}

export default async function EditMapPage({
  params,
}: {
  params: { id: string };
}) {
  // Check access before rendering
  await checkEditAccess(params.id);

  // If we get here, user has proper access
  return <EditMapPageClient />;
}
