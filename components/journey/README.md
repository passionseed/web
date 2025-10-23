# Journey Map Visualization Components

A comprehensive set of React components for visualizing personal journey maps with projects, milestones, and progress tracking using ReactFlow.

## Overview

The journey map system provides an interactive, gamified visualization of a user's projects and milestones. It features:

- **User Center Node**: Central hub showing user profile and stats
- **North Star Projects**: Long-term guiding projects with star glow effects
- **Short-Term Projects**: Focused projects with progress tracking
- **Milestone Maps**: Detailed milestone tracking for each project
- **Daily Activity Tracking**: Real-time activity feed and streak counter
- **Reflection System**: Journal entries and project reflections

## Architecture

```
components/journey/
├── JourneyMapCanvas.tsx          # Main canvas component
├── MilestoneMapView.tsx          # Milestone detail view
├── nodes/
│   ├── UserCenterNode.tsx        # Central user profile node
│   ├── NorthStarProjectNode.tsx  # North Star project nodes
│   ├── ShortTermProjectNode.tsx  # Short-term project nodes
│   └── MilestoneNode.tsx         # Individual milestone nodes
├── edges/
│   ├── MainQuestPath.tsx         # Animated main quest edges
│   └── NorthStarLink.tsx         # North Star connection edges
├── CreateProjectDialog.tsx       # Project creation form
├── MilestoneProgressDialog.tsx   # Milestone progress tracking
├── CreateMilestoneDialog.tsx     # Milestone creation form
├── ProjectReflectionPanel.tsx    # Project detail side panel
├── DailyActivityPanel.tsx        # Daily activity widget
└── index.ts                      # Barrel exports
```

## Usage

### Basic Setup

```tsx
import { JourneyMapCanvas } from "@/components/journey";

function JourneyPage() {
  return (
    <JourneyMapCanvas
      userId="user-id"
      userName="John Doe"
      userAvatar="/avatar.jpg"
    />
  );
}
```

### Component Features

#### 1. JourneyMapCanvas

Main container that orchestrates the entire journey map experience.

**Features:**
- Displays all projects arranged around user center
- Handles project creation via FAB (Floating Action Button)
- Manages view state (overview vs milestone detail)
- Real-time activity panel
- Zoom and pan controls
- Mini-map navigation

**Props:**
```tsx
interface JourneyMapCanvasProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}
```

#### 2. Node Components

**UserCenterNode**
- Always at (0, 0), non-draggable
- Shows user avatar, project count, completion %
- Animated glow effect
- Click to show journey overview modal

**NorthStarProjectNode**
- Larger size with star icon and glow
- Circular progress ring
- Shows linked short-term project count
- Action buttons: View Milestones, Edit, Reflect
- Daily activity pulse indicator

**ShortTermProjectNode**
- Medium-sized with progress bar
- Status badges and color themes
- Main quest indicator (special border/glow)
- Links to parent North Star
- Action buttons: View Milestones, Edit

**MilestoneNode**
- Circular with progress percentage
- Status indicator (not started, in progress, blocked, completed, skipped)
- Latest journal preview
- Click to open progress dialog

#### 3. Edge Components

**MainQuestPath**
- Animated gradient stroke
- Pulse animation
- Used for main quest connections

**NorthStarLink**
- Dotted line with star marker
- Subtle pulse animation
- Connects short-term to North Star projects

#### 4. Dialog Components

**CreateProjectDialog**
- Title, description, type selector
- North Star toggle
- Link to existing North Star (for short-term)
- Color theme picker
- Main quest designation

**MilestoneProgressDialog**
- Progress slider (0-100%)
- Journal entry textarea
- Previous journals list
- Reflection prompt at 100%
- Auto-completion at 100%

**CreateMilestoneDialog**
- Title, description fields
- Estimated hours input
- Link to previous milestone
- Auto-positioning on map

#### 5. Panel Components

**ProjectReflectionPanel**
- Slide-out sheet from right
- Tabs: Overview, Milestones, Journals, Reflections
- Project stats and progress charts
- Action buttons for edit/reflect

**DailyActivityPanel**
- Fixed bottom-right position
- Today's date and activity count
- Updated projects list
- Streak counter with flame icon
- Quick journal button
- Expandable/collapsible

### Data Flow

```
User Action → Component Handler → Supabase Function → Database
                                         ↓
                                    Update State
                                         ↓
                                   Re-render Map
```

## Styling

All components use:
- **shadcn/ui** for base components
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Custom gradients** for visual effects
- **Framer Motion** animations (via Tailwind)

### Color Scheme

- **User Center**: Blue gradient (`from-blue-400 to-purple-600`)
- **North Star**: Amber/gold (`from-yellow-300 via-amber-400 to-orange-500`)
- **Short-term**: Status-based colors
- **Main Quest**: Cyan glow (`from-cyan-400 to-blue-500`)
- **Milestones**: Status-based (blue, green, red, orange, gray)

## Data Requirements

The components expect data from the journey database schema:

### Tables Used
- `journey_projects` - Project records
- `project_milestones` - Milestone records
- `milestone_journals` - Progress journal entries
- `project_reflections` - Project reflections
- `milestone_paths` - Connections between milestones

### Required Functions
All functions are imported from `@/lib/supabase/journey`:

- `getJourneyProjects()` - Fetch all user projects
- `getProjectById(id)` - Get single project with details
- `createJourneyProject(data)` - Create new project
- `updateProject(id, data)` - Update project
- `getProjectMilestones(projectId)` - Fetch milestones
- `createMilestone(projectId, data)` - Create milestone
- `updateMilestoneProgress(id, progress, journal)` - Update progress
- `getMilestoneJournals(milestoneId)` - Fetch journals
- `getDailyActivity(date?)` - Get today's activity summary

## Animations

### CSS Animations
```css
@keyframes shadow-pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.4; }
}

@keyframes dash {
  to { stroke-dashoffset: -1000; }
}

@keyframes northStarPulse {
  0%, 100% { opacity: 0.6; stroke-width: 2.5; }
  50% { opacity: 1; stroke-width: 3; }
}
```

### Interactive Animations
- **Hover**: Scale + shadow effects
- **Selection**: Scale + floating shadow
- **Activity**: Pulsing green dot
- **Completion**: Checkmark animation
- **Streak**: Bouncing flame icon

## Accessibility

All components include:
- ARIA labels and descriptions
- Keyboard navigation support
- Focus management
- Screen reader announcements
- Semantic HTML structure

Example:
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`${project.title} - ${status} - ${progress}% complete`}
>
```

## Performance Considerations

1. **Memoization**: Use `useMemo` for expensive calculations
2. **Lazy Loading**: Load project details on demand
3. **Optimistic Updates**: Update UI immediately, sync later
4. **Debouncing**: Debounce position updates when dragging
5. **Virtual Scrolling**: Use in journal/reflection lists

## Future Enhancements

- [ ] 3D globe view option
- [ ] Team journey maps
- [ ] Export journey as PDF/image
- [ ] AI-powered milestone suggestions
- [ ] Integration with calendar
- [ ] Social sharing features
- [ ] Achievement system
- [ ] Custom themes

## Example Page Implementation

```tsx
// app/journey/page.tsx
import { JourneyMapCanvas } from "@/components/journey";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function JourneyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="h-screen">
      <JourneyMapCanvas
        userId={user.id}
        userName={user.user_metadata?.full_name || user.email || "User"}
        userAvatar={user.user_metadata?.avatar_url}
      />
    </main>
  );
}
```

## Troubleshooting

### Common Issues

**Issue: Nodes not appearing**
- Check ReactFlow CSS is imported
- Verify data is loading from Supabase
- Check console for errors

**Issue: Edges not connecting**
- Ensure node IDs match edge source/target
- Verify edge types are registered
- Check handle positions

**Issue: Animations stuttering**
- Reduce number of animated elements
- Use CSS transforms instead of position changes
- Enable GPU acceleration with `will-change`

**Issue: Layout overlapping**
- Adjust radius constants in `buildMapFromProjects`
- Implement collision detection
- Use force-directed layout algorithm

## Dependencies

```json
{
  "@xyflow/react": "^12.8.2",
  "lucide-react": "^0.454.0",
  "date-fns": "^4.1.0",
  "sonner": "^1.7.1"
}
```

## License

Part of the pseed project. See main project LICENSE for details.
