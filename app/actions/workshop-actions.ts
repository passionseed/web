"use server";

import { createClient } from "@/utils/supabase/server";

export async function joinWorkshop(workshopId: string, formData: FormData) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to join a workshop",
    };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "User profile not found" };
  }

  console.log(profile);

  // Check if user is already registered for this workshop
  const { data: existingRegistration, error: registrationCheckError } =
    await supabase
      .from("user_workshops")
      .select("id")
      .eq("workshop_id", workshopId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingRegistration) {
    return {
      success: false,
      error: "You are already registered for this workshop",
    };
  }

  console.log(existingRegistration);

  try {
    // Add user to workshop participants
    const { data: participant, error: participantError } = await supabase
      .from("workshop_participants")
      .insert([
        {
          workshop_id: workshopId,
          user_id: user.id,
          status: "registered",
          registration_data: Object.fromEntries(formData.entries()),
        },
      ])
      .select()
      .single();

    if (participantError) throw participantError;

    // Assign Discord role (this will be called from the client side)
    const discordResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/discord/assign-role`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          workshopId,
        }),
      }
    );

    if (!discordResponse.ok) {
      console.error(
        "Failed to assign Discord role:",
        await discordResponse.text()
      );
      // Don't fail the whole process if Discord role assignment fails
    }

    return { success: true, data: participant };
  } catch (error) {
    console.error("Error joining workshop:", error);
    return { success: false, error: "Failed to join workshop" };
  }
}
