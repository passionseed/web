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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      "id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at"
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
  // Create a Supabase auth user
  const { data: authData, error: authError } = await getClient().auth.admin.createUser({
    email: params.email.toLowerCase(),
    // Random password — auth is handled by our own session tokens
    password: crypto.randomBytes(16).toString("hex"),
    email_confirm: true,
  });
  if (authError) throw authError;

  const { data, error } = await getClient()
    .from("mentor_profiles")
    .insert({
      user_id: authData.user.id,
      full_name: params.full_name,
      email: params.email.toLowerCase(),
      password_hash: params.password_hash,
      profession: params.profession ?? "",
      institution: params.institution ?? "",
      bio: params.bio ?? "",
      session_type: params.session_type ?? "healthcare",
    })
    .select(
      "id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at"
    )
    .single();
  if (error) throw error;
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
      "id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at"
    )
    .single();
  if (error) throw error;
  return data as MentorProfile;
}

// --- Sessions ---

export async function createMentorSession(mentorId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
  const { error } = await getClient().from("mentor_sessions").insert({
    mentor_id: mentorId,
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;
}

export async function getMentorBySessionToken(token: string): Promise<MentorProfile | null> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("mentor_sessions")
    .select(
      "expires_at, mentor_profiles(id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at)"
    )
    .eq("token", token)
    .gt("expires_at", now)
    .single();
  if (!data) return null;
  return data.mentor_profiles as unknown as MentorProfile;
}

export async function deleteMentorSession(token: string): Promise<void> {
  await getClient().from("mentor_sessions").delete().eq("token", token);
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
