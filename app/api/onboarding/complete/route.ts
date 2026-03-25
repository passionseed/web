import { NextRequest, NextResponse } from "next/server";

import { isAnonymousUser } from "@/lib/supabase/auth";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

interface CompleteBody {
  username: string;
  date_of_birth: string;
  education_level: "high_school" | "university" | "unaffiliated";
  preferred_language: "en" | "th";
  interests: string[];
  collected_data: Record<string, unknown>;
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CompleteBody;
    const {
      username,
      date_of_birth,
      education_level,
      preferred_language,
      interests,
      collected_data,
      email,
      password,
    } = body;

    if (
      !username ||
      !date_of_birth ||
      !education_level ||
      !preferred_language
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 422 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const normalizedUsername = username.trim().toLowerCase();
    const isAnonymous = isAnonymousUser(user);

    if (isAnonymous) {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password required for account creation" },
          { status: 422 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data: existingEmail, error: emailLookupError } = await admin
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (emailLookupError) {
        console.error(
          "[onboarding/complete] email lookup error",
          emailLookupError
        );
        return NextResponse.json(
          { error: "Email lookup failed" },
          { status: 500 }
        );
      }

      if (existingEmail) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (signInError || !signInData.user) {
          return NextResponse.json(
            { error: "Wrong password" },
            { status: 401 }
          );
        }

        // Continue with the existing user's ID for profile/career-goals upsert below.
        // Re-assign user to the signed-in account so the rest of the handler uses it.
        const existingUser = signInData.user;
        const resolvedEmailExisting =
          existingUser.email || normalizedEmail;
        const resolvedNameExisting =
          typeof collected_data?.name === "string"
            ? collected_data.name.trim() || null
            : null;

        const { error: profileErrorExisting } = await admin
          .from("profiles")
          .upsert(
            {
              id: existingUser.id,
              username: normalizedUsername,
              date_of_birth,
              education_level,
              preferred_language,
              email: resolvedEmailExisting,
              full_name: resolvedNameExisting,
              is_onboarded: true,
              onboarded_at: now,
              updated_at: now,
            },
            { onConflict: "id" }
          );

        if (profileErrorExisting) {
          console.error(
            "[onboarding/complete] profile error (existing user)",
            profileErrorExisting
          );
          return NextResponse.json(
            { error: "Profile update failed" },
            { status: 500 }
          );
        }

        if (Array.isArray(interests) && interests.length > 0) {
          const goals = interests
            .map((career_name) => career_name.trim())
            .filter(Boolean)
            .map((career_name) => ({
              user_id: existingUser.id,
              career_name,
              source: "user_typed" as const,
            }));

          if (goals.length > 0) {
            const { error: careerGoalsErrorExisting } = await admin
              .from("career_goals")
              .insert(goals);

            if (careerGoalsErrorExisting) {
              console.error(
                "[onboarding/complete] career goals error (existing user)",
                careerGoalsErrorExisting
              );
              return NextResponse.json(
                { error: "Career goals update failed" },
                { status: 500 }
              );
            }
          }
        }

        return NextResponse.json({ ok: true });
      }

      const { error: upgradeError } = await supabase.auth.updateUser({
        email: normalizedEmail,
        password,
      });

      if (upgradeError) {
        console.error("[onboarding/complete] upgrade error", upgradeError);
        return NextResponse.json(
          { error: upgradeError.message },
          { status: 400 }
        );
      }
    }

    const { data: existingUsername, error: usernameLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .neq("id", user.id)
      .maybeSingle();

    if (usernameLookupError) {
      console.error(
        "[onboarding/complete] username lookup error",
        usernameLookupError
      );
      return NextResponse.json(
        { error: "Username lookup failed" },
        { status: 500 }
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const resolvedEmail = user.email || email?.trim().toLowerCase() || null;
    const resolvedName =
      typeof collected_data?.name === "string"
        ? collected_data.name.trim() || null
        : null;

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        username: normalizedUsername,
        date_of_birth,
        education_level,
        preferred_language,
        email: resolvedEmail,
        full_name: resolvedName,
        is_onboarded: true,
        onboarded_at: now,
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[onboarding/complete] profile error", profileError);
      return NextResponse.json(
        { error: "Profile update failed" },
        { status: 500 }
      );
    }

    if (Array.isArray(interests) && interests.length > 0) {
      const goals = interests
        .map((career_name) => career_name.trim())
        .filter(Boolean)
        .map((career_name) => ({
          user_id: user.id,
          career_name,
          source: "user_typed" as const,
        }));

      if (goals.length > 0) {
        const { error: careerGoalsError } = await admin
          .from("career_goals")
          .insert(goals);

        if (careerGoalsError) {
          console.error(
            "[onboarding/complete] career goals error",
            careerGoalsError
          );
          return NextResponse.json(
            { error: "Career goals update failed" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[onboarding/complete] unexpected error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
