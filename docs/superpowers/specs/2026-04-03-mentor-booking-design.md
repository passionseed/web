# Mentor Booking System — Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## Product Context

- **What this is:** A mentor booking platform integrated into the PassionSeed hackathon section. Mentors set up their profiles and availability on the web; students book sessions via the app.
- **Who it's for:** Two audiences — mentors (professionals/academics who sign up via web) and students (who book via mobile app).
- **Space/industry:** EdTech / career mentoring, Thailand-focused (Thai universities and professionals).
- **Project type:** Web portal (mentor-facing) + backend + app plan (student-facing, not built yet).

---

## Scope

### Web (this repo — built now)
Mentor-facing portal at `/app/hackathon/mentor/` routes. Mentors log in, set up their profile including availability, and manage their bookings. Group mentors additionally see their assigned teams' hackathon submissions.

### Backend (Supabase — built now)
New tables with RLS, storage for profile photos, API endpoints that both web and app consume.

### App (plan only — not built in this session)
Student-facing: browse mentors, view availability, book slots (healthcare mode), or view assigned group mentor (group mode).

---

## Routes

```
/hackathon/mentor/login        — email + password sign in
/hackathon/mentor/register     — new mentor account creation
/hackathon/mentor/dashboard    — bookings view + (group mentors) team submission view
/hackathon/mentor/profile      — edit all profile data including availability grid
```

---

## Database Schema

### `mentor_profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | unique |
| `full_name` | text | |
| `profession` | text | e.g. "Cardiologist", "UX Designer" |
| `institution` | text | University or study institution |
| `bio` | text | Short paragraph |
| `photo_url` | text | Supabase Storage URL |
| `session_type` | enum `'healthcare' \| 'group'` | Mutually exclusive |
| `is_approved` | boolean | Admin approves before visible to students |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `mentor_availability`
Stores weekly recurring slots (not specific dates — students see which hours are open each week).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `mentor_id` | uuid FK → mentor_profiles | |
| `day_of_week` | int | 0=Mon … 6=Sun |
| `hour` | int | 0–23 (each row = one hour block) |

### `mentor_bookings`
Used by both session types (shared booking system).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `mentor_id` | uuid FK → mentor_profiles | |
| `student_id` | uuid FK → auth.users | Set by app |
| `slot_datetime` | timestamptz | Specific booked slot |
| `duration_minutes` | int | Default 30 |
| `status` | enum `'pending' \| 'confirmed' \| 'cancelled'` | |
| `notes` | text | Optional student note |
| `created_at` | timestamptz | |

### `mentor_team_assignments`
Admin-assigned linkage for group mentors.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `mentor_id` | uuid FK → mentor_profiles | |
| `team_id` | uuid FK → hackathon_teams | |
| `hackathon_id` | uuid | Which hackathon |
| `assigned_at` | timestamptz | |
| `assigned_by` | uuid FK → auth.users | Admin who made assignment |

---

## Session Types

Two mutually exclusive modes:

| Mode | Description | Dashboard shows |
|------|-------------|-----------------|
| **Healthcare Mentor** | Students book individual 1-on-1 sessions | Booking list (upcoming / past / all) |
| **Group Mentor** | Admin assigns to hackathon teams | Team cards with submission preview + booking list |

Group mentors see both their bookings AND their assigned teams — tabs on the dashboard switch between "Team Submissions" and "My Bookings".

---

## Screens

### Login / Register
- Centered glass card, bioluminescent glow orb background
- Email + password fields, sign in button, link to register
- Matches `/hackathon/login` aesthetic exactly

### Dashboard
**Header:** mentor name, session type badge (blue=healthcare, purple=group), active status badge.

**Stats row (3 cards):** Total Bookings, This Week, Hours Given (or Teams/Members for group mode).

**Booking list (healthcare) / Tab nav (group):**
- Healthcare: tab nav (Upcoming / Past / All), booking cards with student avatar, name, datetime, status badge
- Group: tab nav (Team Submissions / My Bookings), team cards with submission preview + booking cards

### Profile
Two-column layout: photo upload left, form fields right.

**Fields:**
- Profile photo (circular upload zone, 5MB limit)
- Full Name
- Profession / Title
- Institution / University
- Bio (textarea)

**Session Type selector:** 2 large cards side-by-side (Healthcare | Group), active card gets colored border glow.

**Availability grid:**
- 8 columns (time label + 7 days: Mon–Sun)
- 24 rows (00:00–23:00), scrollable, starts scrolled to 09:00
- Each cell is a toggle slot — inactive = dark, active = cyan glow with dot indicator
- Quick action buttons: "Clear All" and "Weekdays 9–17"

---

## Visual Design System

Inherits the **Bioluminescent Ocean** hackathon theme from `docs/hackathon-design-system.md` without modification.

### Colors (from hackathon design system)
| Token | Hex | Usage in mentor portal |
|-------|-----|------------------------|
| `hack-cyan` | `#91C4E3` | Active availability slots, primary accent, headers |
| `hack-blue` | `#65ABFC` | Healthcare mode badge, healthcare card active border |
| `hack-purple-light` | `#A594BA` | Group mode badge, group card active border, team cards |
| `hack-purple-muted` | `#9D81AC` | CTA buttons (Save, Sign In) |
| `hack-bg-deep` | `#03050a` | Page background |
| `hack-bg-card` | `#0d1219` | Glass card base |
| `hack-bg-elevated` | `#1a2530` | Form inputs |

### Typography (from hackathon design system)
- **Bai Jamjuree** — headings, body, buttons
- **Mitr** — labels, eyebrows, uppercase tags
- **Space Mono** — stat numbers, booking datetimes

### Components
All glass cards use the exact patterns from `docs/hackathon-design-system.md`:
- `bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80 backdrop-blur-md border border-[#4a6b82]/30 rounded-3xl`
- Hover glow border pseudo-element
- Starfield particle background on all pages
- Ambient glow orbs (cyan top-right, purple bottom-left)

### Animations
- Starfield twinkle (CSS keyframes, prime-number durations per CLAUDE.md rules)
- Slot toggle: instant background transition with cyan glow
- Card hover: 0.3s border-color + box-shadow transition
- Page load: float-up fade (opacity: 0 → 1, y: 30 → 0, 0.6s ease-out)

---

## App Plan (not built — reference for future session)

The student app needs:

### Screens
1. **Mentor list** — grid of approved mentor cards (photo, name, profession, session type badge)
2. **Mentor detail** — full profile + availability calendar + "Book Session" CTA
3. **Booking flow** — pick date → pick available hour → confirm → creates `mentor_bookings` row with `status='pending'`
4. **My bookings** — list of student's own bookings with status
5. **My group mentor** (group mode) — shows the assigned mentor's profile + contact, if any

### API surface the app needs
All via Supabase client:
- `GET mentor_profiles` (filtered by `is_approved=true`) — mentor list
- `GET mentor_availability` (filtered by `mentor_id`) — availability grid
- `POST mentor_bookings` — create booking
- `GET mentor_bookings` (filtered by `student_id`) — my bookings
- `GET mentor_team_assignments` joined with `mentor_profiles` (filtered by team) — group mentor lookup

### Auth
Students use existing PassionSeed auth (Supabase). The `student_id` in `mentor_bookings` is the auth user ID.

---

## Admin Integration

- Admin approves mentor profiles via `/admin/` dashboard (set `is_approved = true`)
- Admin assigns group mentors to teams via the same admin panel (inserts into `mentor_team_assignments`)
- Mentors are not visible to students until approved

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-03 | Routes under `/hackathon/mentor/` | Design cohesion — bioluminescent theme already lives in `/hackathon/` section |
| 2026-04-03 | Session type mutually exclusive (no "Both") | Simpler mental model for mentors, cleaner dashboard per mode |
| 2026-04-03 | All-day availability grid (00:00–23:00) | Mentors may have evening or early morning hours |
| 2026-04-03 | Shared booking table for both session types | Same data model, different dashboard view per mode |
| 2026-04-03 | Admin assigns group mentors, not self-select | Group assignments are deliberate matches, not open marketplace |
| 2026-04-03 | App plan only — not built in this session | Web portal + backend is the MVP; app built separately |
