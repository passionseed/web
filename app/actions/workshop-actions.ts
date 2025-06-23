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
      .select("id, status")
      .eq("workshop_id", workshopId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingRegistration) {
    if (existingRegistration.status === 'pending') {
      return {
        success: false,
        error: "Your registration is pending approval",
      };
    } else if (existingRegistration.status === 'approved') {
      return {
        success: false,
        error: "You are already registered for this workshop",
      };
    }
  }

  try {
    // Extract form data and prepare registration data
    const formDataObj = Object.fromEntries(formData.entries());
    const { questions, discord_consent, ...answers } = formDataObj;
    
    // Prepare registration data (exclude answers and system fields)
    const registrationData = {
      discord_consent: discord_consent === 'on',
      submitted_at: new Date().toISOString(),
      ...(questions && { additional_notes: questions.toString() })
    };

    console.log('Form data:', formDataObj);
    console.log('Extracted answers:', answers);
    console.log('Registration data:', registrationData);

    // Start a transaction
    console.log('Calling join_workshop_with_answers RPC...');
    const { data: participant, error: participantError } = await supabase.rpc('join_workshop_with_answers', {
      p_workshop_id: workshopId,
      p_user_id: user.id,
      p_status: 'pending',
      p_registration_data: registrationData,
      p_answer_1: answers.answer_1 || null,
      p_answer_2: answers.answer_2 || null,
      p_answer_3: answers.answer_3 || null,
      p_answer_4: answers.answer_4 || null,
      p_answer_5: answers.answer_5 || null
    });

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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to join workshop"
    };
  }
}
