# Hackathon Profile Settings Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings gear icon to the participant info card on `/hackathon/dashboard` that opens a modal letting users edit their profile fields.

**Architecture:** A gear icon button is added to the top-right of the existing info card. Clicking it opens a Shadcn Dialog (already imported) with a form pre-filled with current values. On submit, it calls `PATCH /api/hackathon/me` which updates the `hackathon_participants` row. The dashboard refreshes its local state on success. Admins (`is_admin: true`) do not see the gear icon.

**Tech Stack:** Next.js 15 App Router, React hooks, Shadcn Dialog, TailwindCSS, Supabase (service role), existing hackathon session cookie auth.

---

### Task 1: Add `updateParticipant` to `lib/hackathon/db.ts`

**Files:**
- Modify: `lib/hackathon/db.ts`

- [ ] **Step 1: Add the function at the bottom of `lib/hackathon/db.ts`**

```typescript
export async function updateParticipant(
  id: string,
  fields: {
    name?: string;
    phone?: string;
    university?: string;
    track?: string;
    grade_level?: string;
    experience_level?: number;
    bio?: string;
  }
) {
  const { data, error } = await getClient()
    .from("hackathon_participants")
    .update(fields)
    .eq("id", id)
    .select("id, name, email, phone, university, role, track, grade_level, experience_level, referral_source, bio, team_name, created_at")
    .single();
  if (error) throw error;
  return data as HackathonParticipant;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hackathon/db.ts
git commit -m "feat: add updateParticipant db function"
```

---

### Task 2: Create `PATCH /api/hackathon/me` route

**Files:**
- Modify: `app/api/hackathon/me/route.ts`

- [ ] **Step 1: Add the PATCH handler to `app/api/hackathon/me/route.ts`**

Add this after the existing `GET` function:

```typescript
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, university, track, grade_level, experience_level, bio } = body;

  // Validate required fields
  if (!name?.trim() || !phone?.trim() || !university?.trim() || !track?.trim() || !grade_level?.trim() || !bio?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (typeof experience_level !== "number" || experience_level < 1 || experience_level > 10) {
    return NextResponse.json({ error: "Invalid experience level" }, { status: 400 });
  }

  try {
    const { updateParticipant } = await import("@/lib/hackathon/db");
    const updated = await updateParticipant(participant.id, {
      name: name.trim(),
      phone: phone.trim(),
      university: university.trim(),
      track,
      grade_level,
      experience_level,
      bio: bio.trim(),
    });
    return NextResponse.json({ participant: updated });
  } catch (err) {
    console.error("Update participant error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
```

Also add `updateParticipant` to the existing import at the top:

```typescript
import { getSessionParticipant, updateParticipant } from "@/lib/hackathon/db";
```

(Remove the dynamic import inside the handler and use the top-level import instead.)

- [ ] **Step 2: Verify the import at top of the file looks like:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, updateParticipant } from "@/lib/hackathon/db";
import { createClient } from "@/utils/supabase/server";
```

And the PATCH handler uses `updateParticipant` directly (no dynamic import).

- [ ] **Step 3: Commit**

```bash
git add app/api/hackathon/me/route.ts
git commit -m "feat: add PATCH /api/hackathon/me for profile updates"
```

---

### Task 3: Add Settings Modal to Dashboard

**Files:**
- Modify: `app/hackathon/dashboard/page.tsx`

The dashboard already imports `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `Button`, and the `Slider` component is used on the register page — we need to add it here. The `TRACKS` and `GRADES` constants must be defined locally (same values as register page).

- [ ] **Step 1: Add imports at the top of `app/hackathon/dashboard/page.tsx`**

Add to the existing imports:

```typescript
import { Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
```

The `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, and `Button` are already imported.

- [ ] **Step 2: Add constants after the existing imports (before the component)**

```typescript
const TRACKS = [
  "นักเรียนมัธยมปลาย หรือเทียบเท่า",
  "นักศึกษามหาวิทยาลัย",
];

const GRADES: Record<string, string[]> = {
  "นักเรียนมัธยมปลาย หรือเทียบเท่า": ["ม.4", "ม.5", "ม.6", "ปวช.", "อื่นๆ"],
  "นักศึกษามหาวิทยาลัย": ["ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"],
};
```

- [ ] **Step 3: Add settings state inside `HackathonDashboardPage` component, after existing state declarations**

```typescript
const [showSettings, setShowSettings] = useState(false);
const [settingsForm, setSettingsForm] = useState({
  name: "",
  phone: "",
  university: "",
  track: "",
  grade_level: "",
  experience_level: 1,
  bio: "",
});
const [settingsLoading, setSettingsLoading] = useState(false);
const [settingsError, setSettingsError] = useState("");
const [settingsFocused, setSettingsFocused] = useState<string | null>(null);
```

- [ ] **Step 4: Add a helper to sync form when participant loads — add this inside the component after the state declarations**

```typescript
const openSettings = () => {
  if (!participant) return;
  setSettingsForm({
    name: participant.name,
    phone: participant.phone,
    university: participant.university,
    track: participant.track,
    grade_level: participant.grade_level,
    experience_level: participant.experience_level,
    bio: participant.bio,
  });
  setSettingsError("");
  setShowSettings(true);
};

const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setSettingsForm((prev) => {
    if (name === "track" && value !== prev.track) {
      return { ...prev, track: value, grade_level: "" };
    }
    return { ...prev, [name]: value };
  });
  setSettingsError("");
};

const handleSettingsSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSettingsLoading(true);
  setSettingsError("");
  try {
    const res = await fetch("/api/hackathon/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setSettingsError(data.error || "Failed to update profile");
      return;
    }
    setParticipant(data.participant);
    setShowSettings(false);
  } catch {
    setSettingsError("Something went wrong. Please try again.");
  } finally {
    setSettingsLoading(false);
  }
};
```

- [ ] **Step 5: Add the settings input style helper inside the component**

```typescript
const settingsInputStyle = (name: string): React.CSSProperties => ({
  width: "100%",
  borderRadius: "0.75rem",
  padding: "0.65rem 0.875rem",
  outline: "none",
  transition: "all 0.3s",
  background: settingsFocused === name ? "#0d1219" : "#0a0f16",
  border: `1px solid ${settingsFocused === name ? "rgba(101,171,252,0.45)" : "rgba(74,107,130,0.35)"}`,
  boxShadow: settingsFocused === name
    ? "0 0 18px rgba(101,171,252,0.08), inset 0 0 18px rgba(101,171,252,0.02)"
    : "none",
  color: "#C0D8F0",
  caretColor: "#65ABFC",
  fontSize: "0.875rem",
});
```

- [ ] **Step 6: Add the Settings Dialog JSX — place it after the existing onboarding nudge `</Dialog>` closing tag and before the main content `<div ref={contentRef}`**

```tsx
<Dialog open={showSettings} onOpenChange={setShowSettings}>
  <DialogContent className="border-[#4a6b82]/30 bg-[#0d1219] text-white sm:max-w-md font-[family-name:var(--font-mitr)] max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-xl text-white">แก้ไขโปรไฟล์</DialogTitle>
      <DialogDescription className="text-[#5a7a94] text-sm">
        อัปเดตข้อมูลส่วนตัวของคุณ
      </DialogDescription>
    </DialogHeader>

    {settingsError && (
      <div
        className="px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
        style={{
          background: "rgba(255,70,70,0.07)",
          border: "1px solid rgba(255,70,70,0.22)",
          color: "#FF8888",
        }}
      >
        {settingsError}
      </div>
    )}

    <form onSubmit={handleSettingsSubmit} className="space-y-4 mt-2">
      {([
        { name: "name", label: "ชื่อ-นามสกุล", type: "text" },
        { name: "phone", label: "เบอร์โทรศัพท์", type: "tel" },
        { name: "university", label: "สถานศึกษา", type: "text" },
      ] as const).map((f) => (
        <div key={f.name}>
          <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
            {f.label}
          </label>
          <input
            name={f.name}
            type={f.type}
            value={settingsForm[f.name]}
            onChange={handleSettingsChange}
            onFocus={() => setSettingsFocused(f.name)}
            onBlur={() => setSettingsFocused(null)}
            required
            style={settingsInputStyle(f.name)}
            className="font-[family-name:var(--font-mitr)]"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
            ระดับการศึกษา
          </label>
          <select
            name="track"
            value={settingsForm.track}
            onChange={handleSettingsChange}
            onFocus={() => setSettingsFocused("track")}
            onBlur={() => setSettingsFocused(null)}
            required
            style={{ ...settingsInputStyle("track"), appearance: "none", color: settingsForm.track ? "#C0D8F0" : "#2A3A50" }}
            className="font-[family-name:var(--font-mitr)]"
          >
            <option value="" disabled style={{ background: "#0d1219", color: "#2A3A50" }}>เลือก</option>
            {TRACKS.map((t) => (
              <option key={t} value={t} style={{ background: "#0d1219", color: "#C0D8F0" }}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
            ชั้นปี
          </label>
          <select
            name="grade_level"
            value={settingsForm.grade_level}
            onChange={handleSettingsChange}
            onFocus={() => setSettingsFocused("grade_level")}
            onBlur={() => setSettingsFocused(null)}
            required
            disabled={!settingsForm.track}
            style={{
              ...settingsInputStyle("grade_level"),
              appearance: "none",
              color: settingsForm.grade_level ? "#C0D8F0" : "#2A3A50",
              opacity: !settingsForm.track ? 0.5 : 1,
            }}
            className="font-[family-name:var(--font-mitr)]"
          >
            <option value="" disabled style={{ background: "#0d1219", color: "#2A3A50" }}>
              {settingsForm.track ? "เลือกชั้นปี" : "เลือกระดับก่อน"}
            </option>
            {settingsForm.track && GRADES[settingsForm.track]?.map((g) => (
              <option key={g} value={g} style={{ background: "#0d1219", color: "#C0D8F0" }}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs mb-2 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
          ระดับความชำนาญในการแข่ง ({settingsForm.experience_level})
        </label>
        <div className="px-1 mb-1">
          <Slider
            min={1}
            max={10}
            step={1}
            value={[settingsForm.experience_level]}
            onValueChange={(vals) => setSettingsForm((prev) => ({ ...prev, experience_level: vals[0] }))}
            className="mb-2"
          />
          <div className="flex justify-between text-[10px] font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
            <span>ครั้งแรก</span>
            <span>ชำนาญสุดๆ</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
          เรื่องเท่ๆ เกี่ยวกับตัวเอง
        </label>
        <textarea
          name="bio"
          value={settingsForm.bio}
          onChange={handleSettingsChange}
          onFocus={() => setSettingsFocused("bio")}
          onBlur={() => setSettingsFocused(null)}
          required
          rows={3}
          style={{ ...settingsInputStyle("bio"), resize: "none" }}
          className="font-[family-name:var(--font-mitr)]"
        />
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowSettings(false)}
          className="text-[#5a7a94] hover:text-white hover:bg-white/5 font-[family-name:var(--font-mitr)]"
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          disabled={settingsLoading}
          className="bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] hover:from-[#6a9ac4] hover:to-[#5a8ab4] text-white border border-[#7aa4c4]/30 shadow-[0_0_15px_rgba(90,122,148,0.4)] transition-all font-[family-name:var(--font-mitr)] disabled:opacity-40"
        >
          {settingsLoading ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

- [ ] **Step 7: Add the gear icon button to the info card — find this existing block in the JSX:**

```tsx
<div className="flex justify-between items-start relative z-10">
  <div>
    <p className="text-2xl font-medium text-white">{participant.name}</p>
    <p className="text-[#91C4E3] text-sm mt-1 bg-[#91C4E3]/10 inline-block px-3 py-1 rounded-full border border-[#91C4E3]/30 font-medium">
      {participant.role}
    </p>
  </div>
</div>
```

Replace it with:

```tsx
<div className="flex justify-between items-start relative z-10">
  <div>
    <p className="text-2xl font-medium text-white">{participant.name}</p>
    <p className="text-[#91C4E3] text-sm mt-1 bg-[#91C4E3]/10 inline-block px-3 py-1 rounded-full border border-[#91C4E3]/30 font-medium">
      {participant.role}
    </p>
  </div>
  {!participant.is_admin && (
    <button
      onClick={openSettings}
      className="p-2 rounded-xl transition-all duration-200 hover:bg-[#4a6b82]/20 text-[#4a6b82] hover:text-[#91C4E3]"
      aria-label="แก้ไขโปรไฟล์"
    >
      <Settings className="w-4 h-4" />
    </button>
  )}
</div>
```

- [ ] **Step 8: Commit**

```bash
git add app/hackathon/dashboard/page.tsx
git commit -m "feat: add profile settings modal to hackathon dashboard"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Log in as a non-admin participant at `/hackathon/login`**

- [ ] **Step 3: Navigate to `/hackathon/dashboard` — verify the gear icon appears in the top-right of the info card**

- [ ] **Step 4: Click the gear icon — verify the modal opens with all fields pre-filled with current values**

- [ ] **Step 5: Edit the university field, click บันทึก — verify the card updates without page reload**

- [ ] **Step 6: Change the track dropdown — verify grade_level resets to empty**

- [ ] **Step 7: Log in as an admin — verify the gear icon does NOT appear**

- [ ] **Step 8: Test validation — clear the name field and submit — verify error message appears**
