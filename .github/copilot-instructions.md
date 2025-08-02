# Copilot Instructions for PSeed Learning Platform

## Project Architecture

PSeed is a Next.js 15 learning platform with **gamified learning maps** as the core feature. Key architectural patterns:

- **App Router** with TypeScript, using Server/Client Components appropriately
- **Supabase** for auth, database, and real-time features
- **React Flow** for interactive learning map visualization
- **Shadcn/UI** components with Tailwind CSS
- **Batch operations** for complex data updates to minimize database calls

## Core Domain: Learning Maps

The learning map feature dominates the codebase. Understanding this flow is essential:

1. **Maps** contain **Nodes** connected by **Paths**
2. **Nodes** have **Content** (videos/slides/text) and **Assessments** (quiz/text/file upload)
3. **Students** progress through nodes, tracked in `student_node_progress`
4. **TAs/Instructors** grade submissions and provide feedback
5. **Leaderboards** rank students by completion speed and grades
6. **Node unlocking** based on prerequisite completion (passed nodes unlock next nodes)

Key files: `/components/map/`, `/lib/supabase/maps.ts`, `/types/map.ts`, `/map-plan.md`

## Database Patterns

- **Batch Updates**: Use `batchUpdateMap()` for complex operations instead of individual CRUD calls
- **Temporary IDs**: New entities use `temp_*` prefixes until persisted (see `generateTempId()`)
- **Progress Tracking**: Database triggers auto-update progress status when graded
- **Cascade Deletes**: Foreign keys with CASCADE to maintain referential integrity
- **Grade-to-Progress Mapping**: `update_progress_on_grade()` trigger maps pass/fail → passed/failed status

Example batch update structure:

```typescript
const batchUpdate: BatchMapUpdate = {
  map: { title: "Updated" },
  nodes: { create: [], update: [], delete: [] },
  paths: { create: [], delete: [] },
  content: { create: [], update: [], delete: [] },
  assessments: { create: [], update: [], delete: [] },
  quizQuestions: { create: [], update: [], delete: [] },
};
```

## Component Patterns

### Map Editor vs Viewer Architecture

- **MapEditor** (`/components/map/MapEditor.tsx`): Interactive editing with drag/drop, node creation
  - Includes `NodeEditorPanel` for detailed node editing
  - Uses `temp_*` IDs for new entities until batch save
  - Metadata stores position data: `{ position: { x, y }, temp_id }`
- **MapViewer** (`/components/map/MapViewer.tsx`): Read-only with progress indicators, node locking
  - Includes `NodeViewPanel` for student interaction
  - Implements `isNodeUnlocked()` prerequisite logic
  - Shows visual progress states (passed, failed, submitted, in_progress)

### State Management Patterns

- **Local state** for drafts, **batch operations** for persistence
- **Progress loading** pattern: `loadAllProgress()` → `progressMap` → node states
- **Form validation** with error arrays and helper functions
- **Temp ID mapping** for connecting new nodes with paths during batch operations

### Assessment & Grading Flow

```
Student submits → assessment_submissions → TA grades → submission_grades → trigger updates progress
```

- **Multiple file support**: `file_urls` array instead of single `file_url`
- **Regrading support**: Creates new grade entries, shows most recent
- **Grade data visualization**: Statistics cards showing pending/passed/failed counts

### File Structure Convention

```
/components/map/
  ├── MapEditor.tsx          # Main editor component
  ├── MapViewer.tsx          # Student view
  ├── NodeEditorPanel.tsx    # Edit node details (tabs: details/content/assessment)
  ├── NodeViewPanel.tsx      # Student node interaction
  ├── ContentEditor.tsx      # Manage node content (video/canva/text)
  ├── AssessmentSection.tsx  # Handle submissions/grading
  ├── NodeHeaderView.tsx     # Node header with progress badges
  └── LearningContentView.tsx # Display content to students
```

## Key Development Workflows

### Database Migrations

```bash
# Run migrations locally
supabase db push --local

# Reset database (development)
supabase db reset
```

### Node Unlocking Logic

Nodes unlock when **at least one** prerequisite node has `status = 'passed'` OR `status = 'submitted'` (allowing progression while awaiting grading):

```typescript
const isNodeUnlocked = (nodeId: string): boolean => {
  const prerequisites = map.map_nodes.filter((node) =>
    node.node_paths_source.some((path) => path.destination_node_id === nodeId)
  );
  if (prerequisites.length === 0) return true; // Starting node
  return prerequisites.some(
    (prereq) =>
      progressMap[prereq.id]?.status === "passed" ||
      progressMap[prereq.id]?.status === "submitted"
  );
};
```

### Batch Operation Debugging

Watch for emoji-prefixed console logs during batch operations:

```typescript
console.log("🔄 Starting batch update...");
console.log("✅ Nodes created:", createdNodes.length);
console.error("❌ Node creation failed:", error);
console.log("🔗 Mapped temp node temp_123 to real node uuid_456");
```

## Critical Integration Points

### Supabase Client Patterns

```typescript
// Server components
import { createClient } from "@/lib/supabase/server";

// Client components
import { createClient } from "@/lib/supabase/client";
```

### File Upload Flow (Multi-file Support)

1. Upload to Supabase Storage → get public URLs
2. Store URLs in `file_urls` array (supports multiple files)
3. Link to submission via `assessment_submissions.file_urls`

### Authentication & Authorization

- **RLS policies** enforce data access
- **Role checking** via `isInstructor()`, `user_roles` table
- **Progress ownership** via `user_id` foreign keys
- **Grading permissions**: Only TAs/Instructors can grade submissions

## Gamification & Visual Elements

### Node Visual States

- **Locked**: `brightness(0.3) grayscale(1)` with lock overlay
- **Unlocked**: Normal brightness with play icon
- **In Progress**: Orange glow with pulsing clock icon
- **Submitted**: Blue glow with clock icon
- **Passed**: Green glow with checkmark icon
- **Failed**: Red glow with alert triangle icon

### Sprite & Animation System

- **Default sprites**: `/islands/crystal.png` for nodes
- **Custom sprites**: Stored in `node.sprite_url`
- **Boss nodes**: Special badge for nodes with sprites
- **Selection effects**: Scale transform and animated pulse ring
- **Path animations**: Active paths (from passed nodes) are animated

## React Flow Specifics

### Node Types & Edges

- **Custom nodes** with sprite images and floating labels
- **Floating edges** for dynamic path connections (using `FloatingEdgeEdit`)
- **Drag handlers** update `metadata.position` for persistence
- **Selection state** drives the editor panel content
- **MiniMap** for navigation with custom node colors

### Performance Considerations

- **Memoized components** for expensive operations (`useMemo`, `useCallback`)
- **Batch state updates** to minimize React Flow re-calculations
- **Temp ID mapping** prevents UUID conflicts during rapid editing

## Planned Features Roadmap

### Phase 1: Enhanced Gamification

- Upload/gallery system for node sprites
- Before/after sprite states (locked/unlocked)
- Node animations (pulsing, glowing effects)
- Enhanced selection indicators with shadows

### Phase 2: Advanced Grading

- Customizable grading schemes (points, percentages)
- Grade data visualizer dashboard
- Completion rate analytics

### Phase 3: Peer Interaction

- Peer grading system
- Student comments on submissions
- Enhanced leaderboards (per node, per cohort)

### Phase 4: Map Enhancements

- Background decorations (stars, clouds, themes)
- Special node types (bonus, challenge, locked)
- Dynamic paths based on performance
- Custom map themes

## Key External Dependencies

- **@xyflow/react**: Learning map visualization and editing
- **@supabase/supabase-js**: Database client with RLS
- **@radix-ui**: Accessible UI primitives via shadcn/ui
- **lucide-react**: Consistent iconography throughout
- **date-fns**: Date manipulation for progress tracking

## Common Debugging Scenarios

- **Batch save failures**: Check temp ID mapping in console logs
- **Node unlocking**: Verify prerequisite completion with `isNodeUnlocked()`
- **Grade triggers**: Ensure `update_progress_on_grade()` function exists
- **File upload issues**: Check `file_urls` array format and bucket permissions
- **Path creation errors**: Validate temp node IDs are properly mapped to real UUIDs

Follow these patterns and architectural decisions to maintain consistency across this gamified learning platform.
