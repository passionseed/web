# PathLab JSON Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a JSON export button to the PathLab builder top nav that downloads the full pathlab (all pages + activities) as a single JSON file.

**Architecture:** A new API route `GET /api/pathlab/paths/[pathId]/export` fetches the complete path server-side and returns structured JSON. The builder page's top nav renders a plain `<a>` tag pointing to this endpoint with the `download` attribute — no client JS required.

**Tech Stack:** Next.js App Router API route (TypeScript), Supabase server client, React (server component nav update)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/api/pathlab/paths/[pathId]/export/route.ts` | Export API — fetches full path data, returns JSON response |
| Modify | `app/seeds/[id]/pathlab-builder/page.tsx` | Add Export button to top nav bar |

---

### Task 1: Create the export API route

**Files:**
- Create: `app/api/pathlab/paths/[pathId]/export/route.ts`

- [ ] **Step 1: Create the file with auth + ownership check**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const { pathId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch path + seed + roles in parallel
    const [{ data: path }, { data: roles }] = await Promise.all([
      supabase
        .from('paths')
        .select('id, total_days, created_at, seed:seeds!inner(id, title, description, created_by)')
        .eq('id', pathId)
        .single(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'instructor']),
    ]);

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const seed = path.seed as any;
    const isOwner = seed.created_by === user.id;
    const isAdminOrInstructor = !!roles?.length;

    if (!isOwner && !isAdminOrInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all days for this path
    const { data: days } = await supabase
      .from('path_days')
      .select('*')
      .eq('path_id', pathId)
      .order('day_number', { ascending: true });

    if (!days || days.length === 0) {
      const exportData = {
        exported_at: new Date().toISOString(),
        seed: { id: seed.id, title: seed.title, description: seed.description },
        path: { id: path.id, total_days: path.total_days },
        pages: [],
      };
      return buildDownloadResponse(exportData, seed.title);
    }

    // Fetch all activities for all days in one query
    const dayIds = days.map((d) => d.id);
    const { data: activities } = await supabase
      .from('path_activities')
      .select(
        `
        *,
        path_content (*),
        path_assessment:path_assessments (
          *,
          quiz_questions:path_quiz_questions (*)
        )
      `
      )
      .in('path_day_id', dayIds)
      .order('display_order', { ascending: true });

    // Group activities by day id
    const activitiesByDayId = new Map<string, any[]>();
    for (const activity of activities || []) {
      const list = activitiesByDayId.get(activity.path_day_id) ?? [];
      list.push({
        ...activity,
        path_content: activity.path_content || [],
        path_assessment: (activity.path_assessment as any[])?.[0] ?? null,
      });
      activitiesByDayId.set(activity.path_day_id, list);
    }

    const pages = days.map((day) => ({
      day_number: day.day_number,
      title: day.title,
      context_text: day.context_text,
      reflection_prompts: day.reflection_prompts || [],
      activities: activitiesByDayId.get(day.id) ?? [],
    }));

    const exportData = {
      exported_at: new Date().toISOString(),
      seed: { id: seed.id, title: seed.title, description: seed.description },
      path: { id: path.id, total_days: path.total_days },
      pages,
    };

    return buildDownloadResponse(exportData, seed.title);
  } catch (error) {
    console.error('Error exporting pathlab:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildDownloadResponse(data: object, seedTitle: string): NextResponse {
  const slug = seedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug}-pathlab.json`;
  const json = JSON.stringify(data, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Manually test the endpoint works**

Start the dev server (`pnpm dev`) and visit:
```
http://localhost:3000/api/pathlab/paths/<a-real-path-id>/export
```
Expected: browser downloads a `.json` file containing `exported_at`, `seed`, `path`, and `pages`.

Check that:
- Unauthenticated request → 401
- Wrong user (not owner/admin) → 403
- Valid owner → file download with correct filename

- [ ] **Step 3: Commit**

```bash
git add app/api/pathlab/paths/\[pathId\]/export/route.ts
git commit -m "feat: add pathlab JSON export API endpoint"
```

---

### Task 2: Add Export button to the builder top nav

**Files:**
- Modify: `app/seeds/[id]/pathlab-builder/page.tsx` (lines ~250–273, the top nav `<div className="flex items-center gap-2">`)

- [ ] **Step 1: Add the Export anchor to the top nav (MultiPageBuilder branch)**

Find this block in `page.tsx` (inside the `if (FEATURE_FLAGS.USE_NEW_PAGE_BUILDER)` return):

```tsx
<div className="flex items-center gap-2">
  <Link
    href={`/seeds/${seedId}/reports`}
    className="text-sm text-neutral-400 transition-colors hover:text-white"
  >
    Reports
  </Link>
  <DebugButton
    data={{ ... }}
  />
</div>
```

Add the export link between Reports and DebugButton:

```tsx
<div className="flex items-center gap-2">
  <Link
    href={`/seeds/${seedId}/reports`}
    className="text-sm text-neutral-400 transition-colors hover:text-white"
  >
    Reports
  </Link>
  <a
    href={`/api/pathlab/paths/${path.id}/export`}
    download
    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
  >
    <Download className="h-3.5 w-3.5" />
    Export JSON
  </a>
  <DebugButton
    data={{ ... }}
  />
</div>
```

- [ ] **Step 2: Add the Download icon import**

At the top of `page.tsx`, update the lucide import line from:

```tsx
import { ArrowLeft, Map as MapIcon, Bug } from "lucide-react";
```

to:

```tsx
import { ArrowLeft, Map as MapIcon, Bug, Download } from "lucide-react";
```

- [ ] **Step 3: Verify in browser**

Navigate to the pathlab builder in the browser. Confirm:
- "Export JSON" link appears in the top nav between "Reports" and the debug button
- Clicking it triggers a file download (not a page navigation)
- Downloaded file is valid JSON with the correct filename (`<slug>-pathlab.json`)
- All pages and activities are present in the file

- [ ] **Step 4: Commit**

```bash
git add app/seeds/\[id\]/pathlab-builder/page.tsx
git commit -m "feat: add Export JSON button to pathlab builder top nav"
```
