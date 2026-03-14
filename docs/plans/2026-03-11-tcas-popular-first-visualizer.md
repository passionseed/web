# TCAS Popular-First Visualizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the TCAS visualizer usable by default by showing a popular 300-program view first, then letting users drill into faculty or university subsets with a full-size readable canvas.

**Architecture:** Keep the current Next.js + Supabase API structure, but change the server responses so the client can start in a `popular` mode and receive category lists sorted by real program counts. Update the client visualizer to measure its container, render the graph at the correct size, and present a more usable default flow with clearer controls and category resets.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase SSR client, react-force-graph-2d, shadcn/ui

---

### Task 1: Add popular-first category data

**Files:**
- Modify: `app/api/tcas/categories/route.ts`
- Test: manual API verification in browser/devtools

**Step 1: Write the intended response shape in comments or types**

Document the response to include:

```ts
{
  faculties: string[];
  universities: string[];
}
```

and ensure faculties are sorted by descending program count, not alphabetically.

**Step 2: Fetch enough data to compute faculty popularity**

Read from `tcas_programs` with `faculty_name`, excluding null/empty values.

**Step 3: Compute counts and sort faculties by popularity**

Use a small reducer like:

```ts
const facultyCounts = faculties.reduce<Record<string, number>>((acc, row) => {
  const name = row.faculty_name?.trim();
  if (!name) return acc;
  acc[name] = (acc[name] ?? 0) + 1;
  return acc;
}, {});

const sortedFaculties = Object.entries(facultyCounts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([name]) => name);
```

**Step 4: Keep universities stable and simple**

Continue returning ordered university names, filtering falsy values.

**Step 5: Verify manually**

Run app and inspect `/api/tcas/categories` in browser/devtools.

Expected: first faculty is a high-volume faculty, not a random low-volume one.

### Task 2: Add `popular` projection mode returning 300 programs

**Files:**
- Modify: `app/api/tcas/projection/route.ts`
- Test: manual API verification in browser/devtools

**Step 1: Add a small constant for popular limit**

```ts
const POPULAR_PROGRAM_LIMIT = 300;
```

**Step 2: Keep shared node selection logic DRY**

Retain the existing select clause and projection formatting in one place.

**Step 3: Implement `category=popular`**

For popular mode:
- fetch program rows with `faculty_name`, `projection_2d`, names, and university join
- compute faculty counts from the fetched rows
- sort rows by faculty popularity descending
- return first 300 rows

Suggested pattern:

```ts
const facultyCounts = rows.reduce<Record<string, number>>((acc, row) => {
  const key = row.faculty_name || "Unknown";
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

const popularRows = [...rows]
  .sort((a, b) => {
    const countDiff = (facultyCounts[b.faculty_name || "Unknown"] ?? 0) - (facultyCounts[a.faculty_name || "Unknown"] ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.program_name.localeCompare(b.program_name);
  })
  .slice(0, POPULAR_PROGRAM_LIMIT);
```

**Step 4: Preserve existing faculty/university filters**

Keep `faculty` and `university` query behavior working.

**Step 5: Verify manually**

Check these URLs in browser/devtools:
- `/api/tcas/projection?category=popular`
- `/api/tcas/projection?category=faculty&value=<known faculty>`

Expected:
- popular returns 300 nodes
- faculty returns a smaller targeted subset

### Task 3: Make the visualizer start in popular mode

**Files:**
- Modify: `components/tcas/TCASVisualizer.tsx`
- Test: manual UI verification at `/tcas/visualizer`

**Step 1: Set initial state to popular**

Initialize:

```ts
const [categoryType, setCategoryType] = useState("popular");
const [categoryValue, setCategoryValue] = useState("popular");
```

**Step 2: Add “Popular” to the category type selector**

Selector options should be:
- Popular
- Faculty
- University

**Step 3: Handle category type changes predictably**

When switching:
- `popular` sets `categoryValue` to `popular`
- `faculty` sets first faculty from sorted list
- `university` sets first university
- clear search text on every type switch

**Step 4: Hide the second selector for popular mode**

Only show the value dropdown when type is `faculty` or `university`.

**Step 5: Build the fetch URL safely**

Popular mode should call:

```ts
/api/tcas/projection?category=popular
```

Other modes should include encoded `value`.

### Task 4: Make the graph fill the card and read better

**Files:**
- Modify: `components/tcas/TCASVisualizer.tsx`
- Test: manual UI verification in desktop browser

**Step 1: Add a measured graph container**

Use `useRef<HTMLDivElement | null>(null)` and track size with state:

```ts
const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
```

**Step 2: Use `ResizeObserver`**

Observe the graph wrapper div and update width/height whenever it changes.

**Step 3: Render the graph only after dimensions are known**

Pass explicit dimensions:

```tsx
<ForceGraph2D
  width={graphSize.width}
  height={graphSize.height}
  ...
/>
```

**Step 4: Improve readability defaults**

Tune rendering for usability:

```tsx
nodeRelSize={4}
cooldownTicks={120}
warmupTicks={80}
d3AlphaDecay={0.02}
d3VelocityDecay={0.15}
```

Keep drag disabled, pan/zoom enabled.

**Step 5: Improve layout clarity**

Move controls into a clearer stacked header layout if needed so the graph has consistent remaining height. Keep hover card and legend, but ensure they do not cover the entire graph area on load.

### Task 5: Tighten client behavior and empty/loading states

**Files:**
- Modify: `components/tcas/TCASVisualizer.tsx`
- Test: manual UI verification

**Step 1: Remove debug logging**

Delete temporary `console.log("Fetched nodes:", ...)`.

**Step 2: Fix loading logic**

Show initial skeleton before first data load, then a lighter overlay when changing filters.

**Step 3: Improve status text**

Show the active scope, for example:

```tsx
Popular view · 300 programs
```

or

```tsx
Faculty: คณะวิศวกรรมศาสตร์ · 214 programs
```

**Step 4: Keep empty state scoped**

If search removes all results, say no results match the current view instead of implying the category itself is empty.

### Task 6: Verify implementation

**Files:**
- Modify: none
- Test: `components/tcas/TCASVisualizer.tsx`, `app/api/tcas/projection/route.ts`, `app/api/tcas/categories/route.ts`

**Step 1: Run diagnostics**

Run LSP diagnostics on:
- `components/tcas/TCASVisualizer.tsx`
- `app/api/tcas/projection/route.ts`
- `app/api/tcas/categories/route.ts`

Expected: no diagnostics in these files.

**Step 2: Run targeted TypeScript validation if needed**

Use a focused validation path if global `tsc` is noisy from unrelated files.

**Step 3: Manual browser verification**

Confirm:
- page opens in popular mode
- count is ~300
- graph fills the intended area
- switching faculty/university works
- search filters current view
- graph is readable and interactive

**Step 4: Optional final build**

Run `pnpm build` only if disk space is sufficient.

Expected: build issues, if any, should be unrelated to these TCAS files before treating this work as blocked.
