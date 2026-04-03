# Mentor Booking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mentor-facing web portal at `/hackathon/mentor/` routes where mentors register, manage their profile + availability, and view bookings — plus the supporting database schema and API.

**Architecture:** Custom session-based auth (same pattern as hackathon participants — scrypt password hash + `hackathon_sessions`-style token cookie). Mentor portal lives under `/app/hackathon/mentor/`. All mentor DB operations go through a dedicated `lib/hackathon/mentor-db.ts` service that uses the Supabase service-role client (same pattern as `lib/hackathon/db.ts`).

**Tech Stack:** Next.js 15 App Router, TailwindCSS, Supabase PostgreSQL + Storage, gsap for enter animations, React hooks (no Zustand needed for this scope).

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260403100000_mentor_booking_system.sql` | All 4 tables + RLS + indexes + updated_at triggers |
| `types/mentor.ts` | TypeScript types for MentorProfile, MentorAvailability, MentorBooking, MentorTeamAssignment |
| `lib/hackathon/mentor-db.ts` | All DB operations: create/get/update mentor, availability CRUD, bookings, team assignments |
| `app/api/hackathon/mentor/register/route.ts` | POST: create mentor account |
| `app/api/hackathon/mentor/login/route.ts` | POST: authenticate mentor, set cookie |
| `app/api/hackathon/mentor/logout/route.ts` | POST: delete session cookie |
| `app/api/hackathon/mentor/me/route.ts` | GET: current mentor profile; PATCH: update profile fields |
| `app/api/hackathon/mentor/availability/route.ts` | GET: mentor's slots; PUT: replace all slots |
| `app/api/hackathon/mentor/bookings/route.ts` | GET: mentor's bookings (with filters) |
| `app/api/hackathon/mentor/photo/route.ts` | POST: upload profile photo to Supabase Storage |
| `app/hackathon/mentor/login/page.tsx` | Login page (bioluminescent glass card) |
| `app/hackathon/mentor/register/page.tsx` | Registration page |
| `app/hackathon/mentor/dashboard/page.tsx` | Dashboard: stats + bookings (healthcare) or tabs (group) |
| `app/hackathon/mentor/profile/page.tsx` | Profile editor: photo + fields + session type + availability grid |
| `components/hackathon/mentor/MentorAvailabilityGrid.tsx` | 8×24 interactive grid (day × hour), toggle slots |
| `components/hackathon/mentor/MentorBookingCard.tsx` | Single booking row: student avatar, datetime, status badge |
| `components/hackathon/mentor/MentorStatsRow.tsx` | 3-card stats (total bookings, this week, hours given) |
| `components/hackathon/mentor/SessionTypeSelector.tsx` | 2-card selector: Healthcare vs Group |

### Constants
- Mentor session cookie: `hackathon_mentor_token`
- Storage bucket: `mentor-photos` (public read, authenticated write)

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260403100000_mentor_booking_system.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260403100000_mentor_booking_system.sql

-- Enum for session type
CREATE TYPE mentor_session_type AS ENUM ('healthcare', 'group');

-- Enum for booking status
CREATE TYPE mentor_booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- mentor_profiles
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profession TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  session_type mentor_session_type NOT NULL DEFAULT 'healthcare',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mentor_profiles_user_id_key UNIQUE (user_id)
);

-- mentor_availability (weekly recurring slots)
CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  CONSTRAINT mentor_availability_unique_slot UNIQUE (mentor_id, day_of_week, hour)
);

-- mentor_bookings
CREATE TABLE IF NOT EXISTS public.mentor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slot_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status mentor_booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- mentor_team_assignments
CREATE TABLE IF NOT EXISTS public.mentor_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  hackathon_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- mentor_sessions (session tokens — same pattern as hackathon_sessions)
CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS mentor_profiles_email_idx ON public.mentor_profiles(email);
CREATE INDEX IF NOT EXISTS mentor_availability_mentor_idx ON public.mentor_availability(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_bookings_mentor_idx ON public.mentor_bookings(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_bookings_student_idx ON public.mentor_bookings(student_id);
CREATE INDEX IF NOT EXISTS mentor_bookings_status_idx ON public.mentor_bookings(status);
CREATE INDEX IF NOT EXISTS mentor_team_assignments_mentor_idx ON public.mentor_team_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_token_idx ON public.mentor_sessions(token);
CREATE INDEX IF NOT EXISTS mentor_sessions_mentor_idx ON public.mentor_sessions(mentor_id);

-- updated_at trigger for mentor_profiles
CREATE OR REPLACE FUNCTION update_mentor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mentor_profiles_timestamp ON public.mentor_profiles;
CREATE TRIGGER update_mentor_profiles_timestamp
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_mentor_profiles_updated_at();

-- RLS
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

-- mentor_profiles: public read for approved profiles, mentor edits own
CREATE POLICY "Approved mentor profiles are public" ON public.mentor_profiles
  FOR SELECT USING (is_approved = TRUE);

CREATE POLICY "Mentors can view own profile" ON public.mentor_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Mentors can update own profile" ON public.mentor_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- mentor_availability: public read, mentor edits own
CREATE POLICY "Mentor availability is public" ON public.mentor_availability
  FOR SELECT USING (TRUE);

CREATE POLICY "Mentors manage own availability" ON public.mentor_availability
  FOR ALL USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );

-- mentor_bookings: mentor sees own, student sees own
CREATE POLICY "Mentors see own bookings" ON public.mentor_bookings
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Students see own bookings" ON public.mentor_bookings
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create bookings" ON public.mentor_bookings
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- mentor_team_assignments: mentor sees own
CREATE POLICY "Mentors see own assignments" ON public.mentor_team_assignments
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );

-- mentor_sessions: only service role (all ops use service-role client)
-- No public RLS policies needed — only accessed via service role key
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push --local
```

Expected: migration applied with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403100000_mentor_booking_system.sql
git commit -m "feat: add mentor booking system database schema"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/mentor.ts`

- [ ] **Step 1: Write the types**

```typescript
// types/mentor.ts

export type MentorSessionType = 'healthcare' | 'group';
export type MentorBookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type MentorProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profession: string;
  institution: string;
  bio: string;
  photo_url: string | null;
  session_type: MentorSessionType;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type MentorAvailabilitySlot = {
  id: string;
  mentor_id: string;
  day_of_week: number; // 0=Mon … 6=Sun
  hour: number;        // 0–23
};

export type MentorBooking = {
  id: string;
  mentor_id: string;
  student_id: string | null;
  slot_datetime: string;
  duration_minutes: number;
  status: MentorBookingStatus;
  notes: string | null;
  created_at: string;
};

export type MentorTeamAssignment = {
  id: string;
  mentor_id: string;
  team_id: string;
  hackathon_id: string;
  assigned_at: string;
  assigned_by: string | null;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/mentor.ts
git commit -m "feat: add mentor TypeScript types"
```

---

## Task 3: mentor-db.ts Service

**Files:**
- Create: `lib/hackathon/mentor-db.ts`

This service uses the Supabase **service-role** client (same as `lib/hackathon/db.ts`) so all operations bypass RLS and work correctly from API routes.

- [ ] **Step 1: Write the service**

```typescript
// lib/hackathon/mentor-db.ts
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { MentorProfile, MentorAvailabilitySlot, MentorBooking, MentorTeamAssignment, MentorSessionType } from "@/types/mentor";

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

export async function findMentorByEmail(email: string) {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
  return data as (MentorProfile & { password_hash: string }) | null;
}

export async function findMentorById(id: string) {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select("id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at")
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
  // Create a Supabase auth user first
  const { data: authData, error: authError } = await getClient().auth.admin.createUser({
    email: params.email.toLowerCase(),
    password: crypto.randomBytes(16).toString("hex"), // random unused password — auth is handled by our own tokens
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
      profession: params.profession ?? '',
      institution: params.institution ?? '',
      bio: params.bio ?? '',
      session_type: params.session_type ?? 'healthcare',
    })
    .select("id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as MentorProfile;
}

export async function updateMentorProfile(id: string, updates: Partial<Pick<MentorProfile, 'full_name' | 'profession' | 'institution' | 'bio' | 'photo_url' | 'session_type'>>): Promise<MentorProfile> {
  const { data, error } = await getClient()
    .from("mentor_profiles")
    .update(updates)
    .eq("id", id)
    .select("id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at")
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
    .select("expires_at, mentor_profiles(id, user_id, full_name, email, profession, institution, bio, photo_url, session_type, is_approved, created_at, updated_at)")
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
  // Delete existing slots then insert new ones
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
  filter?: 'upcoming' | 'past' | 'all'
): Promise<MentorBooking[]> {
  let query = getClient()
    .from("mentor_bookings")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("slot_datetime", { ascending: false });

  if (filter === 'upcoming') {
    query = query.gte("slot_datetime", new Date().toISOString()).neq("status", "cancelled");
  } else if (filter === 'past') {
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/hackathon/mentor-db.ts
git commit -m "feat: add mentor-db service"
```

---

## Task 4: API Routes

**Files:**
- Create: `app/api/hackathon/mentor/register/route.ts`
- Create: `app/api/hackathon/mentor/login/route.ts`
- Create: `app/api/hackathon/mentor/logout/route.ts`
- Create: `app/api/hackathon/mentor/me/route.ts`
- Create: `app/api/hackathon/mentor/availability/route.ts`
- Create: `app/api/hackathon/mentor/bookings/route.ts`
- Create: `app/api/hackathon/mentor/photo/route.ts`

### 4a: Register

- [ ] **Step 1: Write register route**

```typescript
// app/api/hackathon/mentor/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  hashMentorPassword,
  generateMentorSessionToken,
  createMentorProfile,
  createMentorSession,
  findMentorByEmail,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

const SESSION_EXPIRY_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, profession, institution, bio, session_type } = await req.json();

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: "full_name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await findMentorByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const password_hash = hashMentorPassword(password);
    const mentor = await createMentorProfile({ full_name, email, password_hash, profession, institution, bio, session_type });

    const token = generateMentorSessionToken();
    await createMentorSession(mentor.id, token);

    const res = NextResponse.json({ mentor });
    res.cookies.set(MENTOR_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Mentor register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
```

### 4b: Login

- [ ] **Step 2: Write login route**

```typescript
// app/api/hackathon/mentor/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  verifyMentorPassword,
  generateMentorSessionToken,
  findMentorByEmail,
  createMentorSession,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

const SESSION_EXPIRY_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const mentor = await findMentorByEmail(email);
    if (!mentor || !verifyMentorPassword(password, mentor.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = generateMentorSessionToken();
    await createMentorSession(mentor.id, token);

    const { password_hash: _, ...safe } = mentor;
    const res = NextResponse.json({ mentor: safe });
    res.cookies.set(MENTOR_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Mentor login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
```

### 4c: Logout

- [ ] **Step 3: Write logout route**

```typescript
// app/api/hackathon/mentor/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteMentorSession, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (token) await deleteMentorSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(MENTOR_SESSION_COOKIE);
  return res;
}
```

### 4d: Me (GET + PATCH)

- [ ] **Step 4: Write me route**

```typescript
// app/api/hackathon/mentor/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  updateMentorProfile,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

async function getAuthenticatedMentor(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getMentorBySessionToken(token);
}

export async function GET(req: NextRequest) {
  const mentor = await getAuthenticatedMentor(req);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ mentor });
}

export async function PATCH(req: NextRequest) {
  const mentor = await getAuthenticatedMentor(req);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const allowed = ['full_name', 'profession', 'institution', 'bio', 'photo_url', 'session_type'] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const updated = await updateMentorProfile(mentor.id, updates);
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    console.error("Mentor profile update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
```

### 4e: Availability (GET + PUT)

- [ ] **Step 5: Write availability route**

```typescript
// app/api/hackathon/mentor/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  getMentorAvailability,
  replaceMentorAvailability,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

async function getAuthenticatedMentor(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getMentorBySessionToken(token);
}

export async function GET(req: NextRequest) {
  const mentor = await getAuthenticatedMentor(req);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slots = await getMentorAvailability(mentor.id);
  return NextResponse.json({ slots });
}

export async function PUT(req: NextRequest) {
  const mentor = await getAuthenticatedMentor(req);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { slots } = await req.json();
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "slots must be an array" }, { status: 400 });
    }
    // Validate each slot
    for (const s of slots) {
      if (typeof s.day_of_week !== 'number' || s.day_of_week < 0 || s.day_of_week > 6) {
        return NextResponse.json({ error: "Invalid day_of_week" }, { status: 400 });
      }
      if (typeof s.hour !== 'number' || s.hour < 0 || s.hour > 23) {
        return NextResponse.json({ error: "Invalid hour" }, { status: 400 });
      }
    }

    const updated = await replaceMentorAvailability(mentor.id, slots);
    return NextResponse.json({ slots: updated });
  } catch (err) {
    console.error("Availability update error:", err);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
```

### 4f: Bookings (GET)

- [ ] **Step 6: Write bookings route**

```typescript
// app/api/hackathon/mentor/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  getMentorBookings,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filterParam = req.nextUrl.searchParams.get("filter");
  const filter = (filterParam === 'upcoming' || filterParam === 'past') ? filterParam : 'all';

  const bookings = await getMentorBookings(mentor.id, filter);
  return NextResponse.json({ bookings });
}
```

### 4g: Photo Upload (POST)

- [ ] **Step 7: Write photo upload route**

```typescript
// app/api/hackathon/mentor/photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  updateMentorProfile,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `mentors/${mentor.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("mentor-photos")
      .upload(path, buffer, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("mentor-photos").getPublicUrl(path);
    const updated = await updateMentorProfile(mentor.id, { photo_url: publicUrl });
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

- [ ] **Step 8: Commit all API routes**

```bash
git add app/api/hackathon/mentor/
git commit -m "feat: add mentor portal API routes (register, login, logout, me, availability, bookings, photo)"
```

---

## Task 5: Shared UI Components

**Files:**
- Create: `components/hackathon/mentor/MentorAvailabilityGrid.tsx`
- Create: `components/hackathon/mentor/MentorBookingCard.tsx`
- Create: `components/hackathon/mentor/MentorStatsRow.tsx`
- Create: `components/hackathon/mentor/SessionTypeSelector.tsx`

### 5a: MentorAvailabilityGrid

- [ ] **Step 1: Write MentorAvailabilityGrid**

```tsx
// components/hackathon/mentor/MentorAvailabilityGrid.tsx
"use client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Slot = { day_of_week: number; hour: number };

type Props = {
  slots: Slot[];
  onChange: (slots: Slot[]) => void;
};

function isActive(slots: Slot[], day: number, hour: number): boolean {
  return slots.some((s) => s.day_of_week === day && s.hour === hour);
}

function toggle(slots: Slot[], day: number, hour: number): Slot[] {
  if (isActive(slots, day, hour)) {
    return slots.filter((s) => !(s.day_of_week === day && s.hour === hour));
  }
  return [...slots, { day_of_week: day, hour }];
}

export default function MentorAvailabilityGrid({ slots, onChange }: Props) {
  const setWeekdays9to17 = () => {
    const newSlots: Slot[] = [];
    for (let day = 0; day <= 4; day++) { // Mon–Fri
      for (let hour = 9; hour <= 17; hour++) {
        newSlots.push({ day_of_week: day, hour });
      }
    }
    onChange(newSlots);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
          Tap slots to toggle availability
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs px-3 py-1 rounded-lg transition-colors font-[family-name:var(--font-mitr)]"
            style={{ background: "rgba(74,107,130,0.2)", color: "#5a7a94", border: "1px solid rgba(74,107,130,0.3)" }}
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={setWeekdays9to17}
            className="text-xs px-3 py-1 rounded-lg transition-colors font-[family-name:var(--font-mitr)]"
            style={{ background: "rgba(145,196,227,0.12)", color: "#91C4E3", border: "1px solid rgba(145,196,227,0.25)" }}
          >
            Weekdays 9–17
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
        {/* Header row */}
        <div className="grid gap-px mb-1" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          <div />
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-[family-name:var(--font-mitr)] pb-1" style={{ color: "#5a7a94" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Hour rows */}
        <div className="space-y-px">
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="grid gap-px" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
              <div
                className="text-right pr-2 text-[10px] flex items-center justify-end font-[family-name:var(--font-space-mono)]"
                style={{ color: "#3a5a74" }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
              {DAYS.map((_, day) => {
                const active = isActive(slots, day, hour);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onChange(toggle(slots, day, hour))}
                    className="h-6 rounded-sm transition-all duration-100"
                    style={{
                      background: active ? "rgba(145,196,227,0.22)" : "rgba(13,18,25,0.8)",
                      border: active ? "1px solid rgba(145,196,227,0.45)" : "1px solid rgba(74,107,130,0.15)",
                      boxShadow: active ? "0 0 8px rgba(145,196,227,0.2)" : "none",
                    }}
                    aria-label={`${DAYS[day]} ${hour}:00 ${active ? "remove" : "add"}`}
                  >
                    {active && (
                      <div
                        className="w-1.5 h-1.5 rounded-full mx-auto"
                        style={{ background: "#91C4E3" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5b: MentorBookingCard

- [ ] **Step 2: Write MentorBookingCard**

```tsx
// components/hackathon/mentor/MentorBookingCard.tsx
import type { MentorBooking } from "@/types/mentor";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  confirmed: { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

type Props = {
  booking: MentorBooking;
};

export default function MentorBookingCard({ booking }: Props) {
  const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
  const dt = new Date(booking.slot_datetime);

  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-2xl"
      style={{
        background: "linear-gradient(to right, #0d1219/90, #121c29/80)",
        border: "1px solid rgba(74,107,130,0.25)",
      }}
    >
      <div className="space-y-0.5">
        <p className="text-sm text-white font-medium font-[family-name:var(--font-bai-jamjuree)]">
          {booking.student_id ? `Student ${booking.student_id.slice(0, 6)}` : "No student yet"}
        </p>
        <p
          className="text-xs font-[family-name:var(--font-space-mono)]"
          style={{ color: "#91C4E3" }}
        >
          {dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
          {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          {" · "}{booking.duration_minutes} min
        </p>
        {booking.notes && (
          <p className="text-xs mt-1 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
            {booking.notes}
          </p>
        )}
      </div>
      <span
        className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
        style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}40` }}
      >
        {style.label}
      </span>
    </div>
  );
}
```

### 5c: MentorStatsRow

- [ ] **Step 3: Write MentorStatsRow**

```tsx
// components/hackathon/mentor/MentorStatsRow.tsx
import type { MentorBooking, MentorSessionType, MentorTeamAssignment } from "@/types/mentor";

type Props = {
  bookings: MentorBooking[];
  sessionType: MentorSessionType;
  assignments?: MentorTeamAssignment[];
};

export default function MentorStatsRow({ bookings, sessionType, assignments = [] }: Props) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thisWeek = bookings.filter((b) => {
    const d = new Date(b.slot_datetime);
    return d >= weekStart && d < weekEnd && b.status !== "cancelled";
  }).length;

  const totalHours = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.duration_minutes, 0) / 60;

  const stats =
    sessionType === "group"
      ? [
          { label: "Teams Assigned", value: String(assignments.length) },
          { label: "This Week", value: String(thisWeek) },
          { label: "Total Bookings", value: String(bookings.filter((b) => b.status !== "cancelled").length) },
        ]
      : [
          { label: "Total Bookings", value: String(bookings.filter((b) => b.status !== "cancelled").length) },
          { label: "This Week", value: String(thisWeek) },
          { label: "Hours Given", value: totalHours.toFixed(1) },
        ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl px-5 py-4 text-center"
          style={{
            background: "linear-gradient(135deg, #0d1219/90, #121c29/80)",
            border: "1px solid rgba(74,107,130,0.3)",
          }}
        >
          <p
            className="text-2xl font-bold font-[family-name:var(--font-space-mono)]"
            style={{ color: "#91C4E3" }}
          >
            {s.value}
          </p>
          <p className="text-xs mt-1 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### 5d: SessionTypeSelector

- [ ] **Step 4: Write SessionTypeSelector**

```tsx
// components/hackathon/mentor/SessionTypeSelector.tsx
import type { MentorSessionType } from "@/types/mentor";

type Props = {
  value: MentorSessionType;
  onChange: (v: MentorSessionType) => void;
};

const OPTIONS: Array<{
  value: MentorSessionType;
  label: string;
  description: string;
  color: string;
  borderColor: string;
  glowColor: string;
}> = [
  {
    value: "healthcare",
    label: "Healthcare Mentor",
    description: "Students book individual 1-on-1 sessions with you",
    color: "#65ABFC",
    borderColor: "rgba(101,171,252,0.5)",
    glowColor: "rgba(101,171,252,0.15)",
  },
  {
    value: "group",
    label: "Group Mentor",
    description: "Admin assigns you to hackathon teams",
    color: "#A594BA",
    borderColor: "rgba(165,148,186,0.5)",
    glowColor: "rgba(165,148,186,0.15)",
  },
];

export default function SessionTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-2xl p-5 text-left transition-all duration-200"
            style={{
              background: active ? opt.glowColor : "rgba(13,18,25,0.8)",
              border: `2px solid ${active ? opt.borderColor : "rgba(74,107,130,0.25)"}`,
              boxShadow: active ? `0 0 20px ${opt.glowColor}` : "none",
            }}
          >
            <p
              className="font-semibold text-sm font-[family-name:var(--font-bai-jamjuree)]"
              style={{ color: active ? opt.color : "#7a9ab4" }}
            >
              {opt.label}
            </p>
            <p className="text-xs mt-1 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Commit components**

```bash
git add components/hackathon/mentor/
git commit -m "feat: add mentor portal shared components (availability grid, booking card, stats row, session type selector)"
```

---

## Task 6: Login Page

**Files:**
- Create: `app/hackathon/mentor/login/page.tsx`

- [ ] **Step 1: Write login page**

```tsx
// app/hackathon/mentor/login/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

export default function MentorLoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hackathon/mentor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      router.push("/hackathon/mentor/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div ref={formRef} className="relative z-10 w-full max-w-md px-6 py-12 opacity-0">
        <button
          onClick={() => router.push("/hackathon")}
          className="flex items-center gap-2 text-[#91C4E3] hover:text-white text-sm mb-8 transition-colors font-[family-name:var(--font-mitr)]"
        >
          ← Back
        </button>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(13,18,25,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(145,196,227,0.2)",
            boxShadow: "0 0 40px rgba(145,196,227,0.08)",
          }}
        >
          <h1
            className="text-3xl font-medium mb-1 bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-bai-jamjuree)]"
          >
            Mentor Login
          </h1>
          <p className="text-gray-400 text-sm mb-2 font-[family-name:var(--font-mitr)]">The Next Decade Hackathon 2026</p>
          <p className="text-gray-500 text-xs mb-8 font-[family-name:var(--font-mitr)]">
            New mentor?{" "}
            <button
              onClick={() => router.push("/hackathon/mentor/register")}
              className="text-[#91C4E3] hover:underline"
            >
              Register here
            </button>
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{ background: "rgba(255,70,70,0.08)", border: "1px solid rgba(255,70,70,0.25)", color: "#ff8888" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {(["email", "password"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-1 font-[family-name:var(--font-mitr)] capitalize">{field}</label>
                <input
                  name={field}
                  type={field}
                  value={form[field]}
                  onChange={handleChange}
                  required
                  placeholder={field === "email" ? "you@example.com" : "Your password"}
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors font-[family-name:var(--font-mitr)]"
                  style={{ background: "#0a0e1a", border: "1px solid rgba(145,196,227,0.2)" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(145,196,227,0.6)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(145,196,227,0.2)")}
                />
              </div>
            ))}

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-full text-lg transition-all duration-300 mt-2 disabled:opacity-50 font-[family-name:var(--font-mitr)]"
              style={{
                background: "#9D81AC",
                boxShadow: "0 0 30px rgba(157,129,172,0.4)",
              }}
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/hackathon/mentor/login/page.tsx
git commit -m "feat: add mentor login page"
```

---

## Task 7: Register Page

**Files:**
- Create: `app/hackathon/mentor/register/page.tsx`

- [ ] **Step 1: Write register page**

```tsx
// app/hackathon/mentor/register/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

export default function MentorRegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    profession: "",
    institution: "",
    bio: "",
  });

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    borderRadius: "0.75rem",
    padding: "0.65rem 0.875rem",
    outline: "none",
    background: focused === name ? "#0d1219" : "#0a0f16",
    border: `1px solid ${focused === name ? "rgba(145,196,227,0.5)" : "rgba(74,107,130,0.3)"}`,
    boxShadow: focused === name ? "0 0 18px rgba(145,196,227,0.06)" : "none",
    color: "#C0D8F0",
    caretColor: "#91C4E3",
    fontSize: "0.875rem",
    transition: "all 0.2s",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hackathon/mentor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      router.push("/hackathon/mentor/profile");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const FIELDS: Array<{ name: keyof typeof form; label: string; type?: string; multiline?: boolean; placeholder: string }> = [
    { name: "full_name", label: "Full Name", placeholder: "Dr. Somchai Kaewkla" },
    { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
    { name: "password", label: "Password (min 8 chars)", type: "password", placeholder: "••••••••" },
    { name: "profession", label: "Profession / Title", placeholder: "Cardiologist, UX Designer…" },
    { name: "institution", label: "Institution / University", placeholder: "Chulalongkorn University" },
    { name: "bio", label: "Short Bio", multiline: true, placeholder: "Tell students about your background…" },
  ];

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center py-16"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}
    >
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div ref={formRef} className="relative z-10 w-full max-w-md px-6 opacity-0">
        <button
          onClick={() => router.push("/hackathon/mentor/login")}
          className="flex items-center gap-2 text-[#91C4E3] hover:text-white text-sm mb-8 transition-colors font-[family-name:var(--font-mitr)]"
        >
          ← Back to Login
        </button>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(13,18,25,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(145,196,227,0.2)",
            boxShadow: "0 0 40px rgba(145,196,227,0.08)",
          }}
        >
          <h1 className="text-3xl font-medium mb-1 bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-bai-jamjuree)]">
            Become a Mentor
          </h1>
          <p className="text-gray-400 text-sm mb-8 font-[family-name:var(--font-mitr)]">The Next Decade Hackathon 2026</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{ background: "rgba(255,70,70,0.08)", border: "1px solid rgba(255,70,70,0.25)", color: "#ff8888" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
                  {f.label}
                </label>
                {f.multiline ? (
                  <textarea
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    onFocus={() => setFocused(f.name)}
                    onBlur={() => setFocused(null)}
                    placeholder={f.placeholder}
                    rows={3}
                    style={{ ...inputStyle(f.name), resize: "none" }}
                    className="font-[family-name:var(--font-mitr)]"
                  />
                ) : (
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    value={form[f.name]}
                    onChange={handleChange}
                    onFocus={() => setFocused(f.name)}
                    onBlur={() => setFocused(null)}
                    placeholder={f.placeholder}
                    required={["full_name", "email", "password"].includes(f.name)}
                    style={inputStyle(f.name)}
                    className="font-[family-name:var(--font-mitr)]"
                  />
                )}
              </div>
            ))}

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-full text-lg transition-all duration-300 mt-2 disabled:opacity-50 font-[family-name:var(--font-mitr)]"
              style={{ background: "#9D81AC", boxShadow: "0 0 30px rgba(157,129,172,0.4)" }}
            >
              {loading ? "Creating account…" : "Create Mentor Account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/hackathon/mentor/register/page.tsx
git commit -m "feat: add mentor register page"
```

---

## Task 8: Profile Page

**Files:**
- Create: `app/hackathon/mentor/profile/page.tsx`

- [ ] **Step 1: Write profile page**

```tsx
// app/hackathon/mentor/profile/page.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import MentorAvailabilityGrid from "@/components/hackathon/mentor/MentorAvailabilityGrid";
import SessionTypeSelector from "@/components/hackathon/mentor/SessionTypeSelector";
import type { MentorProfile, MentorAvailabilitySlot, MentorSessionType } from "@/types/mentor";

type Slot = { day_of_week: number; hour: number };

export default function MentorProfilePage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    profession: "",
    institution: "",
    bio: "",
    session_type: "healthcare" as MentorSessionType,
  });

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    borderRadius: "0.75rem",
    padding: "0.65rem 0.875rem",
    outline: "none",
    background: focused === name ? "#0d1219" : "#0a0f16",
    border: `1px solid ${focused === name ? "rgba(145,196,227,0.5)" : "rgba(74,107,130,0.3)"}`,
    boxShadow: focused === name ? "0 0 18px rgba(145,196,227,0.06)" : "none",
    color: "#C0D8F0",
    caretColor: "#91C4E3",
    fontSize: "0.875rem",
    transition: "all 0.2s",
  });

  useEffect(() => {
    if (!pageRef.current) return;
    gsap.fromTo(pageRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
  }, []);

  useEffect(() => {
    // Load mentor profile + availability
    fetch("/api/hackathon/mentor/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.mentor) { router.replace("/hackathon/mentor/login"); return; }
        const m: MentorProfile = data.mentor;
        setMentor(m);
        setForm({
          full_name: m.full_name,
          profession: m.profession,
          institution: m.institution,
          bio: m.bio,
          session_type: m.session_type,
        });
      })
      .catch(() => router.replace("/hackathon/mentor/login"));

    fetch("/api/hackathon/mentor/availability")
      .then((r) => r.json())
      .then((data) => {
        setSlots((data.slots ?? []).map((s: MentorAvailabilitySlot) => ({
          day_of_week: s.day_of_week,
          hour: s.hour,
        })));
      });
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/hackathon/mentor/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); return; }
      setMentor(data.mentor);
    } catch {
      setError("Photo upload failed");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Save profile
      const profileRes = await fetch("/api/hackathon/mentor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!profileRes.ok) {
        const d = await profileRes.json();
        setError(d.error || "Failed to save profile");
        return;
      }

      // Save availability
      const availRes = await fetch("/api/hackathon/mentor/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!availRes.ok) {
        const d = await availRes.json();
        setError(d.error || "Failed to save availability");
        return;
      }

      setSuccess("Profile saved successfully!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#010108" }}>
        <div className="w-8 h-8 rounded-full border-2 border-[#91C4E3]/30 border-t-[#91C4E3] animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden py-16"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#91C4E3] opacity-4 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#9D81AC] opacity-4 blur-[150px] rounded-full pointer-events-none" />

      <div ref={pageRef} className="relative z-10 max-w-2xl mx-auto px-6 opacity-0">
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push("/hackathon/mentor/dashboard")}
            className="text-[#91C4E3] hover:text-white text-sm transition-colors font-[family-name:var(--font-mitr)]"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">Edit Profile</h1>
          <div className="w-24" />
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Photo + basic info */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <div className="flex gap-8 items-start">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3">
                <label className="cursor-pointer group relative">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 group-hover:border-[#91C4E3]/50"
                    style={{
                      background: "rgba(13,18,25,0.8)",
                      border: "2px solid rgba(74,107,130,0.4)",
                    }}
                  >
                    {mentor.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mentor.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                    {photoLoading && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[#91C4E3]/30 border-t-[#91C4E3] rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="sr-only" />
                </label>
                <p className="text-xs text-center font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
                  Click to upload<br />Max 5MB
                </p>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-4">
                {([
                  { name: "full_name", label: "Full Name" },
                  { name: "profession", label: "Profession / Title" },
                  { name: "institution", label: "Institution / University" },
                ] as const).map((f) => (
                  <div key={f.name}>
                    <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
                      {f.label}
                    </label>
                    <input
                      name={f.name}
                      type="text"
                      value={form[f.name]}
                      onChange={handleChange}
                      onFocus={() => setFocused(f.name)}
                      onBlur={() => setFocused(null)}
                      required
                      style={inputStyle(f.name)}
                      className="font-[family-name:var(--font-mitr)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="mt-5">
              <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>Bio</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                onFocus={() => setFocused("bio")}
                onBlur={() => setFocused(null)}
                rows={3}
                style={{ ...inputStyle("bio"), resize: "none" }}
                className="font-[family-name:var(--font-mitr)]"
              />
            </div>
          </div>

          {/* Session type */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <h2 className="text-lg font-medium text-white mb-4 font-[family-name:var(--font-bai-jamjuree)]">Session Type</h2>
            <SessionTypeSelector
              value={form.session_type}
              onChange={(v) => setForm((prev) => ({ ...prev, session_type: v }))}
            />
          </div>

          {/* Availability */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <h2 className="text-lg font-medium text-white mb-4 font-[family-name:var(--font-bai-jamjuree)]">Weekly Availability</h2>
            <MentorAvailabilityGrid slots={slots} onChange={setSlots} />
          </div>

          {/* Feedback + Save */}
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{ background: "rgba(255,70,70,0.08)", border: "1px solid rgba(255,70,70,0.25)", color: "#ff8888" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-full text-lg transition-all duration-300 disabled:opacity-50 font-[family-name:var(--font-mitr)]"
            style={{ background: "#9D81AC", boxShadow: "0 0 30px rgba(157,129,172,0.4)" }}
          >
            {loading ? "Saving…" : "Save Profile"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/hackathon/mentor/profile/page.tsx
git commit -m "feat: add mentor profile page with availability grid"
```

---

## Task 9: Dashboard Page

**Files:**
- Create: `app/hackathon/mentor/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard page**

```tsx
// app/hackathon/mentor/dashboard/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import MentorBookingCard from "@/components/hackathon/mentor/MentorBookingCard";
import MentorStatsRow from "@/components/hackathon/mentor/MentorStatsRow";
import type { MentorProfile, MentorBooking, MentorTeamAssignment } from "@/types/mentor";

type BookingFilter = "upcoming" | "past" | "all";
type DashTab = "bookings" | "teams";

const SESSION_TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  healthcare: { label: "Healthcare Mentor", color: "#65ABFC", bg: "rgba(101,171,252,0.12)" },
  group:      { label: "Group Mentor",      color: "#A594BA", bg: "rgba(165,148,186,0.12)" },
};

export default function MentorDashboardPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [assignments, setAssignments] = useState<MentorTeamAssignment[]>([]);
  const [filter, setFilter] = useState<BookingFilter>("upcoming");
  const [dashTab, setDashTab] = useState<DashTab>("bookings");

  useEffect(() => {
    if (!pageRef.current) return;
    gsap.fromTo(pageRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
  }, []);

  useEffect(() => {
    fetch("/api/hackathon/mentor/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.mentor) { router.replace("/hackathon/mentor/login"); return; }
        setMentor(data.mentor);
      })
      .catch(() => router.replace("/hackathon/mentor/login"));

    fetch("/api/hackathon/mentor/bookings?filter=all")
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings ?? []));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/hackathon/mentor/logout", { method: "POST" });
    router.push("/hackathon/mentor/login");
  };

  const now = new Date();
  const filteredBookings = bookings.filter((b) => {
    const d = new Date(b.slot_datetime);
    if (filter === "upcoming") return d >= now && b.status !== "cancelled";
    if (filter === "past") return d < now;
    return true;
  });

  if (!mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#010108" }}>
        <div className="w-8 h-8 rounded-full border-2 border-[#91C4E3]/30 border-t-[#91C4E3] animate-spin" />
      </div>
    );
  }

  const badge = SESSION_TYPE_BADGE[mentor.session_type] ?? SESSION_TYPE_BADGE.healthcare;

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden py-16"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#91C4E3] opacity-4 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#9D81AC] opacity-4 blur-[150px] rounded-full pointer-events-none" />

      <div ref={pageRef} className="relative z-10 max-w-2xl mx-auto px-6 space-y-8 opacity-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-widest uppercase font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
              Mentor Portal
            </p>
            <h1 className="text-3xl font-medium text-white mt-1 font-[family-name:var(--font-bai-jamjuree)]">
              {mentor.full_name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
                style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.color}40` }}
              >
                {badge.label}
              </span>
              {mentor.is_approved && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
                  style={{ color: "#34d399", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}
                >
                  Active
                </span>
              )}
              {!mentor.is_approved && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
                  style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  Pending Approval
                </span>
              )}
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-[#4a6b82]/40 text-[#91C4E3] hover:bg-[#91C4E3]/10 font-[family-name:var(--font-mitr)]"
          >
            <Link href="/hackathon/mentor/profile">Edit Profile</Link>
          </Button>
        </div>

        {/* Stats */}
        <MentorStatsRow
          bookings={bookings}
          sessionType={mentor.session_type}
          assignments={assignments}
        />

        {/* Group mentor tab nav */}
        {mentor.session_type === "group" && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(13,18,25,0.8)", border: "1px solid rgba(74,107,130,0.25)" }}>
            {(["bookings", "teams"] as DashTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setDashTab(tab)}
                className="flex-1 py-2 rounded-lg text-sm transition-all font-[family-name:var(--font-mitr)] capitalize"
                style={{
                  background: dashTab === tab ? "rgba(145,196,227,0.15)" : "transparent",
                  color: dashTab === tab ? "#91C4E3" : "#5a7a94",
                  border: dashTab === tab ? "1px solid rgba(145,196,227,0.3)" : "1px solid transparent",
                }}
              >
                {tab === "teams" ? "Team Submissions" : "My Bookings"}
              </button>
            ))}
          </div>
        )}

        {/* Teams view (group mentors only) */}
        {mentor.session_type === "group" && dashTab === "teams" && (
          <div
            className="rounded-3xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            {assignments.length === 0 ? (
              <p className="text-center text-sm py-8 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
                No teams assigned yet. An admin will assign teams to you.
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div key={a.id} className="px-4 py-3 rounded-xl" style={{ background: "rgba(165,148,186,0.08)", border: "1px solid rgba(165,148,186,0.2)" }}>
                    <p className="text-sm font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">Team {a.team_id.slice(0, 8)}</p>
                    <p className="text-xs font-[family-name:var(--font-space-mono)]" style={{ color: "#A594BA" }}>
                      Assigned {new Date(a.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings section */}
        {(mentor.session_type === "healthcare" || dashTab === "bookings") && (
          <div
            className="rounded-3xl p-6 space-y-5"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">Bookings</h2>
              {/* Filter tabs */}
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(74,107,130,0.2)" }}>
                {(["upcoming", "past", "all"] as BookingFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1 rounded-md text-xs transition-all font-[family-name:var(--font-mitr)] capitalize"
                    style={{
                      background: filter === f ? "rgba(145,196,227,0.15)" : "transparent",
                      color: filter === f ? "#91C4E3" : "#5a7a94",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <p className="text-center text-sm py-8 font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
                No {filter} bookings yet.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => (
                  <MentorBookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full text-sm transition-colors py-2 font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#5a7a94")}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/hackathon/mentor/dashboard/page.tsx
git commit -m "feat: add mentor dashboard page"
```

---

## Task 10: Supabase Storage Bucket

The `mentor-photos` storage bucket must exist for photo uploads to work.

- [ ] **Step 1: Create a migration for the storage bucket**

```sql
-- supabase/migrations/20260403100001_mentor_photos_bucket.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-photos', 'mentor-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photo
CREATE POLICY "Mentors can upload own photo" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'mentor-photos' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Mentor photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'mentor-photos');

-- Allow authenticated users to update/replace own photo
CREATE POLICY "Mentors can update own photo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'mentor-photos' AND auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply**

```bash
supabase db push --local
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403100001_mentor_photos_bucket.sql
git commit -m "feat: add mentor-photos storage bucket"
```

---

## Task 11: Build Check

- [ ] **Step 1: Run the build**

```bash
pnpm build
```

Expected: build completes with no TypeScript errors. Fix any type errors before proceeding.

Common fixes needed:
- If `mentor_profiles` join in `getMentorBySessionToken` has a type error, cast: `data.mentor_profiles as unknown as MentorProfile`
- If the storage bucket migration fails due to RLS policies already existing on `storage.objects`, add `DROP POLICY IF EXISTS` guards before the `CREATE POLICY` lines

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint warnings.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: resolve build and lint issues in mentor booking portal"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|------------------|------|
| Routes: login, register, dashboard, profile | Tasks 6, 7, 8, 9 |
| `mentor_profiles` table | Task 1 |
| `mentor_availability` table | Task 1 |
| `mentor_bookings` table | Task 1 |
| `mentor_team_assignments` table | Task 1 |
| Healthcare vs group session types | Tasks 1, 5d, 9 |
| Availability grid (8×24, quick actions) | Task 5a |
| Dashboard stats row (3 cards) | Task 5c |
| Dashboard booking list with filter tabs | Task 9 |
| Dashboard group tab: Team Submissions / My Bookings | Task 9 |
| Photo upload (circular, 5MB limit) | Tasks 4g, 8, 10 |
| Admin approves before visible | Task 1 (is_approved column + RLS) |
| Bioluminescent Ocean design theme | All UI tasks |
| Session type selector (2 cards, glow border) | Task 5d |
| Login/register glass card aesthetic | Tasks 6, 7 |
| gsap float-up on page load | Tasks 6, 7, 8, 9 |
