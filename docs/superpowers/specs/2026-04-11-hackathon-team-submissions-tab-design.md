# Hackathon Team Submissions Tab — Design Spec

**Date:** 2026-04-11
**Status:** Approved

## Overview

Add a "Team Submissions" sub-tab inside the Hackathon > Teams section of the admin dashboard. View-only — lets admins browse every team's submissions, see full content, and switch between team members to compare individual vs team submissions. No review/approval actions yet.

## Placement

Inside `AdminDashboard.tsx`, within the hackathon inner `<Tabs>`, add a new tab:

```
Participants | Teams | Submissions | Team Submissions (NEW) | Matching | Questionnaire | Page Analytics | Mentors
```

The new tab renders `<AdminHackathonTeamSubmissions />`.

## New Component

**File:** `components/admin/AdminHackathonTeamSubmissions.tsx`

Self-contained client component. Fetches data on mount, manages its own state.

### Layout

Two-panel layout inside a card:

```
┌─────────────────────────────────────────────────────────────┐
│  [ All ] [ Pending ] [ Passed ] [ Needs Revision ]          │
├──────────────────┬──────────────────────────────────────────┤
│  LEFT PANEL      │  RIGHT PANEL                             │
│  Team list       │  Submission detail                       │
│  (34% width)     │  (66% width)                             │
└──────────────────┴──────────────────────────────────────────┘
```

### Left Panel — Team Submission List

- Header: "Team Submissions" + total count badge
- Filter pills: All / Pending / Passed / Needs Revision — filters by the selected team submission's status
- Scrollable list of submission cards, one per team submission (a team can appear multiple times if they submitted to multiple activities)
- Each card shows:
  - Team name (bold)
  - Activity title (muted)
  - Status badge (color-coded)
  - Submitted timestamp (tiny, muted)
- Selected card: indigo border glow (`border-indigo-500 bg-indigo-500/6 shadow-[0_0_0_1px_#6366f1]`)
- Clicking a card opens that submission in the right panel

### Right Panel — Submission Detail

Empty state if no card selected ("Select a submission to view details").

When a card is selected:

**1. Participant switcher**
- Label: "View submission by"
- One pill/tab per team member
- Each pill: avatar circle (initial, colored) + name
- Members who have submitted: colored border, clickable, status dot (green = passed, yellow = pending/submitted, red = revision_required)
- Members without a submission: greyed out (`opacity-40`), cursor not-allowed, no dot
- Active pill: indigo background tint + indigo border
- Switching participant swaps the content below

**2. Viewing label**
- "Viewing [Name]'s submission" — updates on switch
- If viewing a team submission (scope = team): "Viewing team submission"

**3. Activity context row**
- Phase badge (if available)
- Activity title (bold)
- Scope badge: "Individual" (sky) or "Team" (purple)

**4. Assessment prompt**
- Section label: "Assessment Prompt"
- Prompt text in italic muted style
- Falls back to "No prompt available" if metadata is missing

**5. Answer content**
- Section label: "Submitted Answer"
- Full `text_answer` in a dark scrollable box (max-h ~200px, overflow-y auto)
- If image: thumbnail (max-h 120px, rounded, bordered)
- If files: file chips with paperclip icon and filename/count
- If no content: "No answer submitted"

**6. Footer**
- Status badge
- Submitted timestamp ("Submitted X ago" using `formatDistanceToNow`)

### Empty right panel state

When nothing is selected:
```
[FileText icon]
Select a team submission from the list to view details
```

## Data

### API endpoint

Reuse `/api/admin/hackathon/teams/submissions` (GET). Extend the query to also return assessment prompt for each submission.

**Changes to `app/api/admin/hackathon/teams/submissions/route.ts`:**

Add to the team submissions query:
```sql
hackathon_phase_activity_assessments(id, metadata, display_order)
```

Map `metadata.prompt` or `metadata.submission_label` into a `prompt` field on each submission object.

### Types

```typescript
interface SubmissionMember {
  participant_id: string;
  name: string;
  email: string;
  university: string;
  is_owner: boolean;
}

interface TeamSubmissionDetail {
  id: string;
  team_id: string;
  team_name: string;
  activity_id: string;
  activity_title: string | null;
  assessment_id: string | null;
  prompt: string | null;
  scope: "team" | "individual";
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
  submitted_by: string | null;
  submitted_by_name: string | null;
  members: SubmissionMember[];
  // For individual submissions grouped under the team
  participant_submissions: IndividualSubmissionDetail[];
}

interface IndividualSubmissionDetail {
  id: string;
  participant_id: string;
  participant_name: string | null;
  activity_id: string;
  activity_title: string | null;
  prompt: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
}
```

## State

```typescript
const [submissions, setSubmissions] = useState<TeamSubmissionDetail[]>([])
const [loading, setLoading] = useState(true)
const [filter, setFilter] = useState<"all" | "pending_review" | "passed" | "revision_required">("all")
const [selectedId, setSelectedId] = useState<string | null>(null)
const [activeMemberId, setActiveMemberId] = useState<string | null>(null)  // for participant switcher
```

When `selectedId` changes, reset `activeMemberId` to the first member who has a submission (or null if team submission scope with no individual switcher needed).

## Dashboard Integration

In `AdminDashboard.tsx`, add to the inner hackathon `<TabsList>`:

```tsx
<TabsTrigger value="team-submissions">Team Submissions</TabsTrigger>
```

And in content:
```tsx
<TabsContent value="team-submissions">
  <AdminHackathonTeamSubmissions key={`team-submissions-${refreshKey}`} />
</TabsContent>
```

Import the component at the top.

## Styling

Follow existing admin component patterns:
- `bg-slate-950/20` for panel backgrounds
- `border-slate-700/50` borders
- Shadcn `Badge`, `Button`, `Card` components
- Status colors: yellow for pending/submitted, green for passed, red for revision_required
- Indigo (`#6366f1`) for selected/active states — consistent with the mockup

## Out of Scope

- Review / approve / revision actions (future work)
- Pagination (all submissions loaded at once, consistent with other tabs)
- Real-time updates
