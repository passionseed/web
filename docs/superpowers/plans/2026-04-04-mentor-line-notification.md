# Mentor Line Bot Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a mentor gets booked, they receive a Line message notification via a Line Messaging API bot. Mentors connect their Line account by adding the bot as a friend, receiving a connect code from the bot, then entering that code on the profile page.

**Architecture:** One Line Official Account (bot) shared across the platform.

Connection flow:
```
Mentor adds bot as friend
       ↓
Line fires "follow" webhook → server generates short-lived code (e.g. CONNECT-a3f9b2)
       ↓
Bot sends code to mentor via Line message
       ↓
Mentor enters code on profile page → server verifies code → stores Line User ID
       ↓
On booking → server pushes Line notification to mentor
```

Booking notification flow:
```
POST /api/hackathon/bookings
       ↓
createBooking() → MentorBooking saved
       ↓
sendMentorBookingNotification() [fire & forget]
       ↓
Line Messaging API → push message to mentor.line_user_id
```

**Tech Stack:** Line Messaging API (`@line/bot-sdk`), Next.js API routes, Supabase (mentor_profiles table), existing `lib/hackathon/mentor-db.ts` patterns.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/hackathon/line.ts` | Create | Line Messaging API client + `sendMentorBookingNotification()` + `sendLineConnectCode()` |
| `app/api/hackathon/mentor/line-webhook/route.ts` | Create | Receives Line webhook events — follow event → generate code → send to mentor |
| `app/api/hackathon/mentor/line-connect/route.ts` | Create | Mentor submits connect code → verify → store Line User ID |
| `app/api/hackathon/bookings/route.ts` | Create | Student-facing booking creation endpoint (triggers notification) |
| `lib/hackathon/mentor-db.ts` | Modify | Add `line_user_id` to selects, add `getMentorById`, `createBooking`, connect code helpers |
| `types/mentor.ts` | Modify | Add `line_user_id` field to `MentorProfile` |
| `supabase/migrations/20260404000005_add_line_user_id_to_mentor_profiles.sql` | Create | Add `line_user_id` column |
| `supabase/migrations/20260404000006_mentor_line_connect_codes.sql` | Create | Short-lived connect codes table |
| `app/hackathon/mentor/profile/page.tsx` | Modify | Add "Connect Line" section with QR + code input field |
| `.env.local` | Modify | Add `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` |

---

## Task 1: Add line_user_id to DB and types

**Files:**
- Create: `supabase/migrations/20260404000005_add_line_user_id_to_mentor_profiles.sql`
- Modify: `types/mentor.ts`
- Modify: `lib/hackathon/mentor-db.ts`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260404000005_add_line_user_id_to_mentor_profiles.sql
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS line_user_id TEXT;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Push migration**

```bash
supabase db push --include-all --yes
```

Expected: `Applying migration 20260404000005_add_line_user_id_to_mentor_profiles.sql...`

- [ ] **Step 3: Update MentorProfile type**

In `types/mentor.ts`, add `line_user_id` to `MentorProfile`:

```typescript
export type MentorProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profession: string;
  institution: string;
  bio: string;
  photo_url: string | null;
  line_user_id: string | null;  // ADD THIS
  session_type: MentorSessionType;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 4: Update mentor-db.ts selects to include line_user_id**

Every `.select("id, user_id, full_name, email, ...")` in `lib/hackathon/mentor-db.ts` needs `line_user_id` added. There are 3 occurrences — in `registerMentor`, `updateMentorProfile`, and `getMentorBySessionToken`.

In `registerMentor` (around line 126):
```typescript
.select(
  "id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, session_type, is_approved, created_at, updated_at"
)
```

In `updateMentorProfile` (around line 151):
```typescript
.select(
  "id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, session_type, is_approved, created_at, updated_at"
)
```

In `getMentorBySessionToken` (around line 177):
```typescript
.select(
  "expires_at, mentor_profiles(id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, session_type, is_approved, created_at, updated_at)"
)
```

- [ ] **Step 5: Add helper functions to mentor-db.ts**

Add after the existing `getMentorBySessionToken` function:

```typescript
export async function getMentorById(mentorId: string): Promise<MentorProfile | null> {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select("id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, session_type, is_approved, created_at, updated_at")
    .eq("id", mentorId)
    .single();
  return (data as MentorProfile) ?? null;
}

export async function getMentorByLineUserId(lineUserId: string): Promise<MentorProfile | null> {
  const { data } = await getClient()
    .from("mentor_profiles")
    .select("id, user_id, full_name, email, profession, institution, bio, photo_url, line_user_id, session_type, is_approved, created_at, updated_at")
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
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260404000005_add_line_user_id_to_mentor_profiles.sql types/mentor.ts lib/hackathon/mentor-db.ts
git commit -m "feat: add line_user_id to mentor profiles"
```

---

## Task 2: Connect codes table + DB helpers

**Files:**
- Create: `supabase/migrations/20260404000006_mentor_line_connect_codes.sql`
- Modify: `lib/hackathon/mentor-db.ts`

Connect codes are short-lived (10 min). Keyed by the mentor's Line User ID (from the follow event). When the mentor submits the code on the web, we look it up to get their Line User ID and link it to their mentor profile.

```
follow webhook receives lineUserId
       ↓
generate code → store {code, lineUserId, expires_at}
       ↓
mentor enters code on profile page
       ↓
look up code → get lineUserId → store on mentor profile → delete code
```

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/20260404000006_mentor_line_connect_codes.sql
CREATE TABLE IF NOT EXISTS public.mentor_line_connect_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  line_user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_line_connect_codes_code_idx ON public.mentor_line_connect_codes(code);

-- Auto-cleanup: expired codes are useless
CREATE INDEX IF NOT EXISTS mentor_line_connect_codes_expires_idx ON public.mentor_line_connect_codes(expires_at);
```

Push it:

```bash
supabase db push --include-all --yes
```

- [ ] **Step 2: Add connect code helpers to mentor-db.ts**

```typescript
export async function storeLineConnectCode(lineUserId: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
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
  await getClient()
    .from("mentor_line_connect_codes")
    .delete()
    .eq("code", code.toUpperCase().trim());
  return data.line_user_id;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260404000006_mentor_line_connect_codes.sql lib/hackathon/mentor-db.ts
git commit -m "feat: Line connect codes table and helpers"
```

---

## Task 3: Add Line env vars and create Line client

**Files:**
- Modify: `.env.local`
- Create: `lib/hackathon/line.ts`

- [ ] **Step 1: Add env vars to .env.local**

```
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
```

- [ ] **Step 2: Install Line SDK**

```bash
pnpm add @line/bot-sdk
```

Expected: package added to `node_modules/@line/bot-sdk`

- [ ] **Step 3: Create lib/hackathon/line.ts**

```typescript
// lib/hackathon/line.ts
import * as line from "@line/bot-sdk";
import type { MentorBooking, MentorProfile } from "@/types/mentor";

function getClient(): line.messagingApi.MessagingApiClient {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return new line.messagingApi.MessagingApiClient({ channelAccessToken: token });
}

export function validateLineSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) throw new Error("LINE_CHANNEL_SECRET is not set");
  return line.validateSignature(body, secret, signature);
}

export async function sendLineConnectCode(lineUserId: string, code: string): Promise<void> {
  const client = getClient();
  const message: line.messagingApi.TextMessage = {
    type: "text",
    text: `สวัสดีครับ! 👋\n\nเพื่อเชื่อมต่อ Line กับระบบ PassionSeed Mentor กรุณานำโค้ดนี้ไปกรอกในหน้า Profile:\n\n🔑 ${code}\n\n(โค้ดนี้จะหมดอายุใน 10 นาที)`,
  };
  await client.pushMessage({ to: lineUserId, messages: [message] });
}

export async function sendMentorBookingNotification(
  mentor: MentorProfile,
  booking: MentorBooking,
  bookerName: string
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
    text: `📅 การจองใหม่!\n\nผู้จอง: ${bookerName}\nวันที่: ${dateStr}\nเวลา: ${timeStr}\nระยะเวลา: ${booking.duration_minutes} นาที${booking.notes ? `\nหมายเหตุ: ${booking.notes}` : ""}\n\nกรุณาเข้าสู่ระบบเพื่อยืนยันการจอง`,
  };

  await client.pushMessage({
    to: mentor.line_user_id,
    messages: [message],
  });
}

export async function sendLineWelcomeMessage(lineUserId: string, mentorName: string): Promise<void> {
  const client = getClient();
  const message: line.messagingApi.TextMessage = {
    type: "text",
    text: `เชื่อมต่อสำเร็จ! 🎉\n\nสวัสดีครับ/ค่ะ คุณ${mentorName}\nคุณจะได้รับการแจ้งเตือนผ่าน Line เมื่อมีการจองเซสชันกับคุณ`,
  };
  await client.pushMessage({ to: lineUserId, messages: [message] });
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/hackathon/line.ts
git commit -m "feat: Line Messaging API client"
```

---

## Task 4: Line webhook endpoint

**Files:**
- Create: `app/api/hackathon/mentor/line-webhook/route.ts`

This endpoint receives all Line events. On `follow` event: generate a connect code, store it, send it to the mentor via Line message.

- [ ] **Step 1: Create webhook route**

```typescript
// app/api/hackathon/mentor/line-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateLineSignature, sendLineConnectCode } from "@/lib/hackathon/line";
import { storeLineConnectCode } from "@/lib/hackathon/mentor-db";
import crypto from "crypto";

function generateConnectCode(): string {
  // 6 uppercase alphanumeric chars, easy to type
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-line-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  if (!validateLineSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  for (const event of payload.events ?? []) {
    if (event.type === "follow" && event.source?.userId) {
      const lineUserId: string = event.source.userId;
      const code = generateConnectCode();

      try {
        await storeLineConnectCode(lineUserId, code);
        await sendLineConnectCode(lineUserId, code);
      } catch (err) {
        console.error("Line connect code error:", err);
        // Don't fail the webhook response — Line will retry if we return non-200
      }
    }
    // Ignore all other event types (message, unfollow, etc.)
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hackathon/mentor/line-webhook/route.ts
git commit -m "feat: Line webhook — follow event generates connect code"
```

---

## Task 5: Code submission endpoint

**Files:**
- Create: `app/api/hackathon/mentor/line-connect/route.ts`

Mentor submits the code from their profile page. Server looks it up, links the Line User ID to their mentor profile, sends welcome message.

- [ ] **Step 1: Create endpoint**

```typescript
// app/api/hackathon/mentor/line-connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  consumeLineConnectCode,
  setMentorLineUserId,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import { sendLineWelcomeMessage } from "@/lib/hackathon/line";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const lineUserId = await consumeLineConnectCode(code);
  if (!lineUserId) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  await setMentorLineUserId(mentor.id, lineUserId);

  // Send welcome confirmation back via Line (fire and forget)
  sendLineWelcomeMessage(lineUserId, mentor.full_name).catch(console.error);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hackathon/mentor/line-connect/route.ts
git commit -m "feat: Line connect code submission endpoint"
```

---

## Task 6: Booking creation endpoint with notification

**Files:**
- Create: `app/api/hackathon/bookings/route.ts`
- Modify: `lib/hackathon/mentor-db.ts` (add `createBooking`)

- [ ] **Step 1: Add createBooking to mentor-db.ts**

```typescript
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
```

- [ ] **Step 2: Create booking API route**

```typescript
// app/api/hackathon/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMentorById, createBooking } from "@/lib/hackathon/mentor-db";
import { sendMentorBookingNotification } from "@/lib/hackathon/line";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mentor_id, slot_datetime, duration_minutes, notes, booker_name } = body;

    if (!mentor_id || !slot_datetime || !booker_name) {
      return NextResponse.json(
        { error: "mentor_id, slot_datetime, and booker_name are required" },
        { status: 400 }
      );
    }

    const mentor = await getMentorById(mentor_id);
    if (!mentor) return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    if (!mentor.is_approved) return NextResponse.json({ error: "Mentor not available" }, { status: 403 });

    const slotDate = new Date(slot_datetime);
    if (isNaN(slotDate.getTime())) {
      return NextResponse.json({ error: "Invalid slot_datetime" }, { status: 400 });
    }
    if (slotDate < new Date()) {
      return NextResponse.json({ error: "Cannot book a slot in the past" }, { status: 400 });
    }

    const booking = await createBooking({
      mentor_id,
      student_id: null,
      slot_datetime,
      duration_minutes: duration_minutes ?? 30,
      notes,
    });

    // Fire and forget — booking is already saved
    sendMentorBookingNotification(mentor, booking, booker_name).catch((err) =>
      console.error("Line notification failed:", err)
    );

    return NextResponse.json({ booking });
  } catch (err) {
    console.error("Booking creation error:", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/hackathon/mentor-db.ts app/api/hackathon/bookings/route.ts
git commit -m "feat: booking creation endpoint with Line notification"
```

---

## Task 7: Connect Line UI on mentor profile page

**Files:**
- Modify: `app/hackathon/mentor/profile/page.tsx`

- [ ] **Step 1: Add state and handler**

Add alongside existing state declarations:

```typescript
const [lineCode, setLineCode] = useState("");
const [lineConnecting, setLineConnecting] = useState(false);
const [lineSuccess, setLineSuccess] = useState(false);
const [lineError, setLineError] = useState("");

const handleConnectLine = async () => {
  if (!lineCode.trim()) return;
  setLineConnecting(true);
  setLineError("");
  try {
    const res = await fetch("/api/hackathon/mentor/line-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: lineCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "เชื่อมต่อไม่สำเร็จ");
    setLineSuccess(true);
    setLineCode("");
    // Refresh mentor data to show connected state
    const meRes = await fetch("/api/hackathon/mentor/me");
    const meData = await meRes.json();
    if (meData.mentor) setMentor(meData.mentor);
  } catch (err) {
    setLineError(err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ");
  } finally {
    setLineConnecting(false);
  }
};
```

- [ ] **Step 2: Add UI section**

Add after the availability grid, before the save button:

```tsx
{/* Line Notification */}
<div style={{
  marginTop: "2rem",
  padding: "1.25rem",
  borderRadius: "0.75rem",
  background: "#0a0f16",
  border: "1px solid rgba(74,107,130,0.3)",
}}>
  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
    <span style={{ fontSize: "1.25rem" }}>💬</span>
    <span style={{ color: "#C0D8F0", fontWeight: 600 }}>Line Notification</span>
  </div>

  {mentor?.line_user_id ? (
    <div style={{ color: "#4ade80", fontSize: "0.875rem" }}>
      ✓ เชื่อมต่อ Line แล้ว
    </div>
  ) : (
    <>
      <p style={{ color: "#7fa8c8", fontSize: "0.8rem", marginBottom: "1rem", lineHeight: 1.6 }}>
        1. เพิ่ม <strong style={{ color: "#C0D8F0" }}>@PassionSeed</strong> เป็นเพื่อนใน Line<br />
        2. Bot จะส่งโค้ดให้คุณทางแชท<br />
        3. กรอกโค้ดนั้นด้านล่าง
      </p>

      {lineSuccess && (
        <p style={{ color: "#4ade80", fontSize: "0.8rem", marginBottom: "0.75rem" }}>✓ เชื่อมต่อสำเร็จ!</p>
      )}
      {lineError && (
        <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{lineError}</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={lineCode}
          onChange={(e) => setLineCode(e.target.value.toUpperCase())}
          placeholder="โค้ด 6 หลัก เช่น A3F9B2"
          maxLength={6}
          style={{
            flex: 1,
            borderRadius: "0.75rem",
            padding: "0.6rem 0.875rem",
            background: "#0d1219",
            border: "1px solid rgba(74,107,130,0.3)",
            color: "#C0D8F0",
            fontSize: "0.875rem",
            letterSpacing: "0.1em",
            outline: "none",
          }}
        />
        <button
          onClick={handleConnectLine}
          disabled={lineConnecting || lineCode.length < 6}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "0.75rem",
            background: "rgba(0,195,0,0.15)",
            border: "1px solid rgba(0,195,0,0.3)",
            color: "#4ade80",
            cursor: lineConnecting || lineCode.length < 6 ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
            opacity: lineCode.length < 6 ? 0.5 : 1,
          }}
        >
          {lineConnecting ? "..." : "เชื่อมต่อ"}
        </button>
      </div>
    </>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/hackathon/mentor/profile/page.tsx
git commit -m "feat: Line connect code UI on mentor profile page"
```

---

## Task 8: Line Developer Console setup (manual steps)

- [ ] **Step 1: Create Line Official Account**
  - Go to https://developers.line.biz
  - Create provider → new channel → Messaging API
  - Name it "PassionSeed Mentor" (or whatever your bot name will be)

- [ ] **Step 2: Get credentials**
  - Channel Secret → `LINE_CHANNEL_SECRET` in `.env.local`
  - Issue long-lived Channel Access Token → `LINE_CHANNEL_ACCESS_TOKEN`

- [ ] **Step 3: Set webhook URL**
  - Webhook URL: `https://your-domain.com/api/hackathon/mentor/line-webhook`
  - Enable "Use webhook"
  - Disable "Auto-reply messages" and "Greeting messages"

- [ ] **Step 4: Get bot QR code**
  - Download from Messaging API settings
  - Display it on the profile page (optional but helpful — add as `<img>` in the UI section above)

---

## Task 9: End-to-end smoke test

- [ ] **Step 1: Verify migrations applied**

```bash
supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name IN ('mentor_profiles', 'mentor_line_connect_codes') ORDER BY table_name, column_name;" --db-url "postgresql://postgres.iikrvgjfkuijcpvdwzvv:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

Expected: `line_user_id` on `mentor_profiles`, all columns on `mentor_line_connect_codes`.

- [ ] **Step 2: Test webhook locally (use ngrok)**

```bash
ngrok http 3000
# Copy the https URL, set as webhook in Line console
```

Add bot as friend from your Line app. Expected: Line message arrives with a 6-char code.

- [ ] **Step 3: Submit code on profile page**

Log in as the mentor, go to `/hackathon/mentor/profile`, enter the code. Expected: "✓ เชื่อมต่อสำเร็จ!" and profile refreshes to show connected state.

- [ ] **Step 4: Test booking notification**

```bash
curl -X POST http://localhost:3000/api/hackathon/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "mentor_id": "<mentor id with line_user_id set>",
    "slot_datetime": "2026-04-10T10:00:00+07:00",
    "duration_minutes": 30,
    "booker_name": "นักศึกษาทดสอบ",
    "notes": "ทดสอบการแจ้งเตือน"
  }'
```

Expected: Line message arrives within a few seconds.

---

## Notes

- Webhook requires a public HTTPS URL — use `ngrok http 3000` for local testing.
- Connect codes expire after 10 minutes. If expired, mentor must unfollow and re-follow the bot to get a new code.
- Booking notifications are fire-and-forget — a Line API failure will not fail the booking. Check logs for `"Line notification failed:"`.
- The `consumeLineConnectCode` function normalizes the code to uppercase and trims whitespace before lookup.
