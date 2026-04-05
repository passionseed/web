import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type {
  MentorProfile,
  MentorAvailabilitySlot,
  MentorBooking,
  MentorTeamAssignment,
  MentorSessionType,
} from "@/types/mentor";

const SESSION_EXPIRY_DAYS = 7;
export const MENTOR_SESSION_COOKIE = "hackathon_mentor_token";

function getClient() {
  return createClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

// --- Auth helpers ---

export function hashMentorPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyMentorPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  try {
    const verifyHash = crypto.scryptSync(password, salt, 64);
    if (crypto.timingSafeEqual(hashBuffer, verifyHash)) return true;
  } catch {
    // ignore
  }
  try {
    const saltBuffer = Buffer.from(salt, "hex");
    const verifyHash2 = crypto.scryptSync(password, saltBuffer, 64);
    if (crypto.timingSafeEqual(hashBuffer, verifyHash2)) return true;
  } catch {
    // ignore
  }
  return false;
}

export function generateMentorSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// --- Mentor CRUD ---

export async function findMentorByEmail(
  email: string
): Promise<(MentorProfile & { password_hash: string }) | null> {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
  return data as (MentorProfile & { password_hash: string }) | null;
}

export async function findMentorById(id: string): Promise<MentorProfile | null> {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select(
      "id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, instagram_url, linkedin_url, website_url, max_hours_per_week, session_type, is_approved, created_at, updated_at"
    )
    .eq("id", id)
    .single();
  return data as MentorProfile | null;
}

export async function createMentorProfile(params: {
  full_name: string;
  email: string;
  password_hash: string;
  profession?: string;
  institution?: string;
  bio?: string;
  session_type?: MentorSessionType;
}): Promise<MentorProfile> {
  // Create a Supabase auth user (or reuse existing if already created)
  let authUserId: string;
  const { data: authData, error: authError } = await getClient().auth.admin.createUser({
    email: params.email.toLowerCase(),
    // Random password — auth is handled by our own session tokens
    password: crypto.randomBytes(16).toString("hex"),
    email_confirm: true,
  });
  if (authError) {
    if (authError.code === "email_exists") {
      // Auth user was created in a prior failed attempt — look it up by email
      const { data: userData, error: userError } = await getClient()
        .auth.admin.listUsers();
      const existingUser = userData?.users?.find(
        (u) => u.email === params.email.toLowerCase()
      );
      if (userError || !existingUser) throw authError;
      authUserId = existingUser.id;
    } else {
      throw authError;
    }
  } else {
    authUserId = authData.user.id;
  }

  const { data, error } = await getClient()
    .from("mentor_profiles")
    .upsert(
      {
        user_id: authUserId,
        full_name: params.full_name,
        email: params.email.toLowerCase(),
        password_hash: params.password_hash,
        profession: params.profession ?? "",
        institution: params.institution ?? "",
        bio: params.bio ?? "",
        session_type: params.session_type ?? "healthcare",
      },
      { onConflict: "user_id" }
    )
    .select(
      "id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, instagram_url, linkedin_url, website_url, max_hours_per_week, session_type, is_approved, created_at, updated_at"
    )
    .single();
  if (error) {
    console.error("mentor_profiles upsert error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  return data as MentorProfile;
}

export async function updateMentorProfile(
  id: string,
  updates: Partial<
    Pick<MentorProfile, "full_name" | "profession" | "institution" | "bio" | "photo_url" | "session_type">
  >
): Promise<MentorProfile> {
  const { data, error } = await getClient()
    .from("mentor_profiles")
    .update(updates)
    .eq("id", id)
    .select(
      "id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, instagram_url, linkedin_url, website_url, max_hours_per_week, session_type, is_approved, created_at, updated_at"
    )
    .single();
  if (error) throw error;
  return data as MentorProfile;
}

// --- Sessions ---

export async function createMentorSession(mentorId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
  const { error } = await getClient().from("mentor_auth_sessions").insert({
    mentor_id: mentorId,
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;
}

export async function getMentorBySessionToken(token: string): Promise<MentorProfile | null> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("mentor_auth_sessions")
    .select(
      "expires_at, mentor_profiles(id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, instagram_url, linkedin_url, website_url, max_hours_per_week, session_type, is_approved, created_at, updated_at)"
    )
    .eq("token", token)
    .gt("expires_at", now)
    .single();
  if (!data) return null;
  return data.mentor_profiles as unknown as MentorProfile;
}

export async function getMentorByLineUserId(lineUserId: string): Promise<MentorProfile | null> {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select("id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, instagram_url, linkedin_url, website_url, max_hours_per_week, session_type, is_approved, created_at, updated_at")
    .eq("line_user_id", lineUserId)
    .single();
  return (data as MentorProfile) ?? null;
}

export async function setMentorLineUserId(mentorId: string, lineUserId: string): Promise<void> {
  const { error } = await getClient()
    .from("mentor_profiles")
    .update({ line_user_id: lineUserId })
    .eq("id", mentorId);
  if (error) throw error;
}

export async function storeLineConnectCode(lineUserId: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  // Delete any previous code for this Line user first
  await getClient()
    .from("mentor_line_connect_codes")
    .delete()
    .eq("line_user_id", lineUserId);
  const { error } = await getClient()
    .from("mentor_line_connect_codes")
    .insert({ code, line_user_id: lineUserId, expires_at: expiresAt });
  if (error) throw error;
}

export async function consumeLineConnectCode(code: string): Promise<string | null> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("mentor_line_connect_codes")
    .select("line_user_id")
    .eq("code", code.toUpperCase().trim())
    .gt("expires_at", now)
    .single();
  if (!data) return null;
  // Delete after use (one-time)
  // NOTE: There is a theoretical race condition where two concurrent submissions
  // of the same code could both pass the SELECT before either deletes.
  // In practice this is near-impossible (human users, 6-char code, 10min window).
  await getClient()
    .from("mentor_line_connect_codes")
    .delete()
    .eq("code", code.toUpperCase().trim());
  return data.line_user_id;
}

export async function createBooking(params: {
  mentor_id: string;
  student_id: string | null;
  slot_datetime: string;
  duration_minutes?: number;
  notes?: string;
}): Promise<MentorBooking> {
  const { data, error } = await getClient()
    .from("mentor_bookings")
    .insert({
      mentor_id: params.mentor_id,
      student_id: params.student_id ?? null,
      slot_datetime: params.slot_datetime,
      duration_minutes: params.duration_minutes ?? 30,
      status: "pending",
      notes: params.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MentorBooking;
}

export async function deleteMentorSession(token: string): Promise<void> {
  await getClient().from("mentor_auth_sessions").delete().eq("token", token);
}

// --- Availability ---

export async function getMentorAvailability(mentorId: string): Promise<MentorAvailabilitySlot[]> {
  const { data } = await getClient()
    .from("mentor_availability")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("day_of_week")
    .order("hour");
  return (data ?? []) as MentorAvailabilitySlot[];
}

export async function replaceMentorAvailability(
  mentorId: string,
  slots: Array<{ day_of_week: number; hour: number }>
): Promise<MentorAvailabilitySlot[]> {
  const { error: deleteError } = await getClient()
    .from("mentor_availability")
    .delete()
    .eq("mentor_id", mentorId);
  if (deleteError) throw deleteError;

  if (slots.length === 0) return [];

  const { data, error: insertError } = await getClient()
    .from("mentor_availability")
    .insert(slots.map((s) => ({ mentor_id: mentorId, ...s })))
    .select("*");
  if (insertError) throw insertError;
  return (data ?? []) as MentorAvailabilitySlot[];
}

// --- Bookings ---

export async function getMentorBookings(
  mentorId: string,
  filter?: "upcoming" | "past" | "all"
): Promise<MentorBooking[]> {
  let query = getClient()
    .from("mentor_bookings")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("slot_datetime", { ascending: false });

  if (filter === "upcoming") {
    query = query.gte("slot_datetime", new Date().toISOString()).neq("status", "cancelled");
  } else if (filter === "past") {
    query = query.lt("slot_datetime", new Date().toISOString());
  }

  const { data } = await query;
  return (data ?? []) as MentorBooking[];
}

// --- Team assignments ---

export async function getMentorTeamAssignments(mentorId: string): Promise<MentorTeamAssignment[]> {
  const { data } = await getClient()
    .from("mentor_team_assignments")
    .select("*")
    .eq("mentor_id", mentorId);
  return (data ?? []) as MentorTeamAssignment[];
}
