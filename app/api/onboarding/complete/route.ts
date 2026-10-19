import { NextRequest, NextResponse } from "next/server";

import { isAnonymousUser } from "@/lib/supabase/auth";
import {
  dateOfBirthProblem,
  normalizeDateOfBirth,
  requiresGuardianConsent,
} from "@/lib/profile-completion";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

interface CompleteBody {
  username: string;
  date_of_birth: string;
  education_level: "high_school" | "university" | "unaffiliated";
  preferred_language: "en" | "th";
  interests: string[];
  collected_data: Record<string, unknown>;
  full_name?: string;
  email?: string;
  password?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  guardian_approved?: boolean;
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function upsertGuardianConsent(
  admin: AdminClient,
  userId: string,
  body: CompleteBody,
  now: string
): Promise<{ error: string } | null> {
  if (!requiresGuardianConsent(body.date_of_birth)) {
    return null;
  }

  const phone = body.guardian_phone?.trim() ?? "";
  const relationship = body.guardian_relationship?.trim() ?? "";
  if (!phone || !relationship || !body.guardian_approved) {
    return { error: "Parent or guardian approval is required" };
  }

  const { error } = await admin.from("profile_guardian_consents").upsert(
    {
      user_id: userId,
      guardian_phone: phone,
      guardian_relationship: relationship,
      consent_confirmed_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[onboarding/complete] guardian error", error);
    return { error: "Guardian consent save failed" };
  }

  return null;
}

function resolveFullName(body: CompleteBody): string | null {
  if (typeof body.full_name === "string" && body.full_name.trim()) {
    return body.full_name.trim();
  }
  if (typeof body.collected_data?.name === "string") {
    return body.collected_data.name.trim() || null;
  }
  return null;
}

async function insertCareerGoals(
  admin: AdminClient,
  userId: string,
  interests: string[] | undefined
): Promise<{ error: string } | null> {
  if (!Array.isArray(interests) || interests.length === 0) {
    return null;
  }

  const goals = interests
    .map((career_name) => career_name.trim())
    .filter(Boolean)
    .map((career_name) => ({
      user_id: userId,
      career_name,
      source: "user_typed" as const,
    }));

  if (goals.length === 0) return null;

  const { error } = await admin.from("career_goals").insert(goals);
  if (error) {
    console.error("[onboarding/complete] career goals error", error);
    return { error: "Career goals update failed" };
  }
  return null;
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
    if (typeof body.date_of_birth === "string") {
      body.date_of_birth = normalizeDateOfBirth(body.date_of_birth);
    }
    const {
      username,
      date_of_birth,
      education_level,
      preferred_language,
      interests,
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

    if (dateOfBirthProblem(date_of_birth)) {
      return NextResponse.json(
        { error: "Invalid date of birth" },
        { status: 422 }
      );
    }

    if (
      requiresGuardianConsent(date_of_birth) &&
      (!body.guardian_phone?.trim() ||
        !body.guardian_relationship?.trim() ||
        !body.guardian_approved)
    ) {
      return NextResponse.json(
        { error: "Parent or guardian approval is required" },
        { status: 422 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const normalizedUsername = username.trim().toLowerCase();
    const isAnonymous = isAnonymousUser(user);
    const resolvedName = resolveFullName(body);

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

        const existingUser = signInData.user;
        const resolvedEmailExisting = existingUser.email || normalizedEmail;

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
              full_name: resolvedName,
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

        const guardianErrorExisting = await upsertGuardianConsent(
          admin,
          existingUser.id,
          body,
          now
        );
        if (guardianErrorExisting) {
          return NextResponse.json(guardianErrorExisting, { status: 500 });
        }

        const careerErrorExisting = await insertCareerGoals(
          admin,
          existingUser.id,
          interests
        );
        if (careerErrorExisting) {
          return NextResponse.json(careerErrorExisting, { status: 500 });
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

    const guardianError = await upsertGuardianConsent(admin, user.id, body, now);
    if (guardianError) {
      return NextResponse.json(guardianError, { status: 500 });
    }

    const careerError = await insertCareerGoals(admin, user.id, interests);
    if (careerError) {
      return NextResponse.json(careerError, { status: 500 });
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
