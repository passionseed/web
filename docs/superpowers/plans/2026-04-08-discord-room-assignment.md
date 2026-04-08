# Discord Room Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a mentor confirms a booking, assign a Discord room number based on time conflicts with other confirmed sessions; recompute rooms for affected bookings when a session is cancelled.

**Architecture:** Add `discord_room INT` column to `mentor_bookings`. On confirm, query all overlapping confirmed bookings across all mentors, sort by `created_at` ASC, assign rooms 1, 2, 3… and bulk-update. On cancel, clear the room, then recompute rooms for all bookings that overlapped with the cancelled one. Display room number on the `MentorBookingCard` and send a Line message with the room on confirm.

**Tech Stack:** Next.js 15 App Router, Supabase (service role), @line/bot-sdk, TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260408000000_add_discord_room_to_bookings.sql` | Add `discord_room` column |
| Modify | `types/mentor.ts` | Add `discord_room` field to `MentorBooking` |
| Modify | `lib/hackathon/mentor-db.ts` | Add `getOverlappingConfirmedBookings`, `assignDiscordRooms` |
| Modify | `lib/hackathon/line.ts` | Add `sendMentorSessionConfirmedNotification` |
| Modify | `app/api/hackathon/mentor/bookings/[id]/route.ts` | Wire room assignment + Line notify on confirm/cancel |
| Modify | `components/hackathon/mentor/MentorBookingCard.tsx` | Display discord room badge |

---

### Task 1: Database migration — add `discord_room` column

**Files:**
- Create: `supabase/migrations/20260408000000_add_discord_room_to_bookings.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260408000000_add_discord_room_to_bookings.sql
ALTER TABLE mentor_bookings
  ADD COLUMN IF NOT EXISTS discord_room INT DEFAULT NULL;

COMMENT ON COLUMN mentor_bookings.discord_room IS
  'Discord room number assigned when session is confirmed. NULL when pending or cancelled. Recomputed on cancellation of overlapping sessions.';
```

- [ ] **Step 2: Apply the migration locally**

```bash
npx supabase db push --local
```

Expected: migration applies with no errors. Verify with:
```bash
npx supabase db diff --local
```
Expected: no diff (migration is in sync).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260408000000_add_discord_room_to_bookings.sql
git commit -m "feat: add discord_room column to mentor_bookings"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `types/mentor.ts`

- [ ] **Step 1: Add `discord_room` to `MentorBooking`**

In `types/mentor.ts`, change the `MentorBooking` type from:

```typescript
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
```

To:

```typescript
export type MentorBooking = {
  id: string;
  mentor_id: string;
  student_id: string | null;
  slot_datetime: string;
  duration_minutes: number;
  status: MentorBookingStatus;
  notes: string | null;
  discord_room: number | null;
  created_at: string;
};
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm build 2>&1 | head -40
```

Expected: build succeeds or only pre-existing errors (the new nullable field won't break existing code).

- [ ] **Step 3: Commit**

```bash
git add types/mentor.ts
git commit -m "feat: add discord_room to MentorBooking type"
```

---

### Task 3: Room assignment logic in `mentor-db.ts`

**Files:**
- Modify: `lib/hackathon/mentor-db.ts`

- [ ] **Step 1: Add `getOverlappingConfirmedBookings` function**

Add at the end of the `-- Bookings --` section in `lib/hackathon/mentor-db.ts`:

```typescript
/**
 * Returns all confirmed bookings (across all mentors) whose time window
 * overlaps with [slotDatetime, slotDatetime + durationMinutes).
 * Two bookings overlap when:
 *   A.start < B.end  AND  B.start < A.end
 */
export async function getOverlappingConfirmedBookings(
  slotDatetime: string,
  durationMinutes: number,
  excludeBookingId?: string
): Promise<MentorBooking[]> {
  const slotEnd = new Date(
    new Date(slotDatetime).getTime() + durationMinutes * 60 * 1000
  ).toISOString();

  // Use raw SQL via rpc or manual filter. Supabase JS doesn't support
  // "column op column" comparisons, so we compute end time client-side
  // and use two range filters that together implement overlap detection:
  //   bookings that START before our end AND END after our start
  // booking_end = slot_datetime + duration_minutes * interval '1 minute'
  // We approximate booking_end by fetching all bookings starting before
  // our end, then filter in JS for the second condition.
  let query = getClient()
    .from("mentor_bookings")
    .select("*")
    .eq("status", "confirmed")
    .lt("slot_datetime", slotEnd); // starts before our session ends

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data } = await query;
  const candidates = (data ?? []) as MentorBooking[];

  // Filter: booking must end after our session starts
  return candidates.filter((b) => {
    const bEnd = new Date(b.slot_datetime).getTime() + b.duration_minutes * 60 * 1000;
    return bEnd > new Date(slotDatetime).getTime();
  });
}
```

- [ ] **Step 2: Add `assignDiscordRooms` function**

Add immediately after `getOverlappingConfirmedBookings`:

```typescript
/**
 * Given a set of confirmed bookings that all conflict with each other,
 * assigns discord_room 1, 2, 3... in order of created_at ASC.
 * Bulk-updates all provided bookings in the database.
 * Returns the updated bookings.
 */
export async function assignDiscordRooms(bookings: MentorBooking[]): Promise<MentorBooking[]> {
  if (bookings.length === 0) return [];

  const sorted = [...bookings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const updates = sorted.map((b, i) => ({ id: b.id, discord_room: i + 1 }));

  // Supabase JS doesn't support bulk update with different values per row,
  // so we upsert using the id as the conflict target.
  const { data, error } = await getClient()
    .from("mentor_bookings")
    .upsert(
      updates.map(({ id, discord_room }) => ({ id, discord_room })),
      { onConflict: "id" }
    )
    .select("*");

  if (error) throw error;
  return (data ?? []) as MentorBooking[];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/hackathon/mentor-db.ts
git commit -m "feat: add getOverlappingConfirmedBookings and assignDiscordRooms"
```

---

### Task 4: Line notification for confirmed session with room number

**Files:**
- Modify: `lib/hackathon/line.ts`

- [ ] **Step 1: Add `sendMentorSessionConfirmedNotification`**

In `lib/hackathon/line.ts`, add after `sendMentorBookingNotification`:

```typescript
export async function sendMentorSessionConfirmedNotification(
  mentor: MentorProfile,
  booking: MentorBooking & { discord_room: number }
): Promise<void> {
  if (!mentor.line_user_id) return;

  const client = getClient();
  const slotDate = new Date(booking.slot_datetime);
  const dateStr = slotDate.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const timeStr = slotDate.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  const message: line.messagingApi.TextMessage = {
    type: "text",
    text: `✅ ยืนยันเซสชันแล้ว!\n\nวันที่: ${dateStr}\nเวลา: ${timeStr}\nระยะเวลา: ${booking.duration_minutes} นาที\n\n🎮 Discord Room: ${booking.discord_room}`,
  };

  await client.pushMessage({
    to: mentor.line_user_id,
    messages: [message],
  });
}
```

Note: The import of `MentorBooking` is already in scope via `@/types/mentor`. The function uses the intersection type `MentorBooking & { discord_room: number }` (not `number | null`) since we only call this after room assignment.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hackathon/line.ts
git commit -m "feat: add sendMentorSessionConfirmedNotification with discord room"
```

---

### Task 5: Wire room assignment into the PATCH booking endpoint

**Files:**
- Modify: `app/api/hackathon/mentor/bookings/[id]/route.ts`

- [ ] **Step 1: Replace the entire route file**

The current file is 51 lines. Replace it with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";
import {
  getOverlappingConfirmedBookings,
  assignDiscordRooms,
} from "@/lib/hackathon/mentor-db";
import { sendMentorSessionConfirmedNotification } from "@/lib/hackathon/line";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { MentorBooking } from "@/types/mentor";

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["confirmed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify booking belongs to this mentor
  const { data: booking } = await getClient()
    .from("mentor_bookings")
    .select("*")
    .eq("id", id)
    .eq("mentor_id", mentor.id)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
  }

  if (status === "confirmed") {
    // Step 1: mark as confirmed, clear any stale room first
    const { error: updateError } = await getClient()
      .from("mentor_bookings")
      .update({ status: "confirmed", discord_room: null })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });

    // Step 2: fetch the freshly-confirmed booking
    const { data: freshBooking } = await getClient()
      .from("mentor_bookings")
      .select("*")
      .eq("id", id)
      .single();
    if (!freshBooking) return NextResponse.json({ error: "Failed to fetch updated booking" }, { status: 500 });

    // Step 3: find all other confirmed bookings that overlap with this session
    const overlapping = await getOverlappingConfirmedBookings(
      freshBooking.slot_datetime,
      freshBooking.duration_minutes,
      id // exclude this booking — we'll include it manually below
    );

    // Step 4: assign rooms across the full conflict group (including this booking)
    const conflictGroup: MentorBooking[] = [freshBooking as MentorBooking, ...overlapping];
    const updated = await assignDiscordRooms(conflictGroup);

    // Step 5: find the updated version of this booking to return
    const thisBooking = updated.find((b) => b.id === id) ?? (freshBooking as MentorBooking);

    // Step 6: send Line notification if mentor has line_user_id and room was assigned
    if (thisBooking.discord_room !== null) {
      try {
        await sendMentorSessionConfirmedNotification(mentor, {
          ...thisBooking,
          discord_room: thisBooking.discord_room,
        });
      } catch (lineErr) {
        // Line notification failure should not fail the booking update
        console.error("Line notify failed:", lineErr);
      }
    }

    return NextResponse.json({ booking: thisBooking });
  }

  // status === "cancelled"
  // Step 1: find overlapping confirmed bookings BEFORE cancelling (they'll need recompute)
  const overlappingBeforeCancel = await getOverlappingConfirmedBookings(
    booking.slot_datetime,
    booking.duration_minutes,
    id
  );

  // Step 2: cancel this booking and clear its room
  const { data: cancelled, error: cancelError } = await getClient()
    .from("mentor_bookings")
    .update({ status: "cancelled", discord_room: null })
    .eq("id", id)
    .select("*")
    .single();
  if (cancelError) return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });

  // Step 3: recompute rooms for remaining confirmed bookings that overlapped
  if (overlappingBeforeCancel.length > 0) {
    await assignDiscordRooms(overlappingBeforeCancel);
  }

  return NextResponse.json({ booking: cancelled });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/hackathon/mentor/bookings/[id]/route.ts
git commit -m "feat: assign and recompute discord rooms on booking confirm/cancel"
```

---

### Task 6: Display Discord room on `MentorBookingCard`

**Files:**
- Modify: `components/hackathon/mentor/MentorBookingCard.tsx`

- [ ] **Step 1: Add Discord room badge to the card**

The current card shows status badge top-right and date/time below the student name. Add a Discord room line below the date/time, shown only when `booking.discord_room` is not null and `booking.status === "confirmed"`.

Replace the section inside the `<div className="space-y-0.5">` block. The current content is:

```tsx
<p className="text-sm text-white font-medium font-[family-name:var(--font-bai-jamjuree)]">
  {booking.student_id
    ? `Student ${booking.student_id.slice(0, 6)}`
    : "No student yet"}
</p>
<p
  className="text-xs font-[family-name:var(--font-space-mono)]"
  style={{ color: "#91C4E3" }}
>
  {dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}{" "}
  {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
  {" · "}
  {booking.duration_minutes} min
</p>
{booking.notes && (
  <p
    className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
    style={{ color: "#5a7a94" }}
  >
    {booking.notes}
  </p>
)}
```

Replace with:

```tsx
<p className="text-sm text-white font-medium font-[family-name:var(--font-bai-jamjuree)]">
  {booking.student_id
    ? `Student ${booking.student_id.slice(0, 6)}`
    : "No student yet"}
</p>
<p
  className="text-xs font-[family-name:var(--font-space-mono)]"
  style={{ color: "#91C4E3" }}
>
  {dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}{" "}
  {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
  {" · "}
  {booking.duration_minutes} min
</p>
{booking.status === "confirmed" && booking.discord_room !== null && (
  <p
    className="text-xs font-medium font-[family-name:var(--font-space-mono)] mt-1"
    style={{ color: "#a78bfa" }}
  >
    🎮 Discord Room {booking.discord_room}
  </p>
)}
{booking.notes && (
  <p
    className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
    style={{ color: "#5a7a94" }}
  >
    {booking.notes}
  </p>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -40
```

Expected: no new errors. The `discord_room` field is now on `MentorBooking` (added in Task 2).

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

1. Log in as a mentor at `/hackathon/mentor/login`
2. Create two overlapping test bookings (same time slot)
3. Accept the first → should show "🎮 Discord Room 1" on the card
4. Accept the second → should show "🎮 Discord Room 2" on the card
5. Cancel the first → second booking card should refresh to "🎮 Discord Room 1"

Note: step 5 requires a page refresh since the card doesn't poll. The `onUpdate` callback only updates the cancelled card's state; the second card will show updated room on next page load. This is acceptable scope.

- [ ] **Step 4: Commit**

```bash
git add components/hackathon/mentor/MentorBookingCard.tsx
git commit -m "feat: show discord room badge on confirmed booking cards"
```

---

## Self-Review

**Spec coverage:**
- ✅ Discord room shown on card when confirmed
- ✅ Discord room sent via Line message on confirm
- ✅ Room 1 when no conflict, Room 2+ for overlapping sessions
- ✅ Rooms recomputed when a session is cancelled
- ✅ Overlap = time window intersection (not exact start match)

**Placeholder scan:** None found.

**Type consistency:**
- `MentorBooking.discord_room: number | null` — defined Task 2, used in Tasks 3, 5, 6 ✅
- `getOverlappingConfirmedBookings` — defined Task 3, imported Task 5 ✅
- `assignDiscordRooms` — defined Task 3, imported Task 5 ✅
- `sendMentorSessionConfirmedNotification` — defined Task 4, imported Task 5 ✅

**Known limitation:** After a cancellation, sibling booking cards on the same page won't update their room number until page refresh. The `onUpdate` callback only propagates to the card whose status changed. This is in-scope acceptable behaviour — the card that was cancelled correctly shows "cancelled" and the others reflect correct state on reload.
