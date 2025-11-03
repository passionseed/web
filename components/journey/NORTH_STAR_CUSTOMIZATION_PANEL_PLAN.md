# North Star Customization Panel - Implementation Plan

## Overview

A comprehensive side panel/modal for deep customization of North Stars, providing live preview and advanced configuration options beyond the basic edit dialog.

---

## Component Specification

### Component Name
`NorthStarCustomizationPanel.tsx`

### Props Interface

```typescript
interface NorthStarCustomizationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  northStar: NorthStar | null;
  onSuccess?: () => void;
  mode?: "create" | "edit" | "customize"; // Default: "customize"
}
```

---

## Layout Architecture

### Desktop Layout (>1024px)
```
┌─────────────────────────────────────────────────────┐
│  North Star Customization           [Save] [Close]  │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  Live Preview    │  Configuration Sections          │
│  (Sticky)        │  (Scrollable)                    │
│                  │                                  │
│  ┌────────────┐  │  ▼ Identity & Purpose           │
│  │            │  │     - Title                      │
│  │   ⭐ Star  │  │     - Why (emphasized)           │
│  │   Preview  │  │     - Description                │
│  │            │  │     - Icon                       │
│  └────────────┘  │                                  │
│                  │  ▼ Alignment                     │
│  Status: Active  │     - SDG Goals (grid)          │
│  Progress: 45%   │     - Career Path               │
│                  │                                  │
│  [Quick Actions] │  ▼ Visual Designer              │
│                  │     - Shape                      │
│                  │     - Color Theme                │
│                  │     - Core Size (slider)         │
│                  │     - Flare Count (slider)       │
│                  │     - [Randomize]                │
│                  │                                  │
│                  │  ▼ Progress & Status             │
│                  │     - Progress slider            │
│                  │     - Status (read-only + link)  │
│                  │                                  │
│                  │  ▼ Linked Projects               │
│                  │     - Project list               │
│                  │     - [Create Project]           │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

### Tablet/Mobile Layout (<1024px)
```
┌─────────────────────────────────────┐
│  ← North Star Customization  [Save] │
├─────────────────────────────────────┤
│                                     │
│  Tabs: [Preview] [Edit] [Projects] │
│                                     │
│  [Preview Tab Content]              │
│  ┌───────────────────────────────┐  │
│  │        ⭐ Star Preview        │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Status: Active  |  Progress: 45%  │
│                                     │
│  [Quick Status Actions]             │
│                                     │
│  [Edit Tab - All Form Sections]    │
│                                     │
│  [Projects Tab - Linked Projects]  │
│                                     │
└─────────────────────────────────────┘
```

---

## Section Specifications

### 1. Live Preview Section (Left/Top)

#### Preview Canvas
```typescript
interface PreviewState {
  starConfig: StarConfig;
  color: NorthStarColor;
  shape: NorthStarShape;
  status: NorthStarStatus;
  progress: number;
}
```

**Visual Elements:**
- Large star SVG (200x200px minimum)
- Real-time updates as user changes settings
- Status effects applied (opacity, grayscale, glow)
- Shimmer animation if achieved
- Background with subtle gradient matching color theme

**Info Display:**
- Status badge with icon and label
- Progress percentage with circular indicator
- Created date
- Achieved date (if applicable)

**Quick Actions Bar:**
- Contextual status change buttons (same as node)
- "View on Canvas" button (closes panel, focuses node)

#### Implementation

```typescript
const PreviewSection = ({ northStar, formData, statusEffects }) => {
  return (
    <div className="sticky top-0 h-screen flex flex-col p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950 dark:to-gray-900">
      {/* Star Preview */}
      <div className="flex-1 flex items-center justify-center">
        <div className={cn(
          "relative transition-all duration-500",
          statusEffects.opacity,
          statusEffects.shimmer
        )}
        style={{ filter: statusEffects.filter }}>
          <StarSVG
            config={formData.starConfig}
            size={200}
            color={formData.color}
            glowIntensity={statusEffects.glow}
          />
        </div>
      </div>

      {/* Status Info */}
      <div className="space-y-4">
        <StatusBadge status={northStar.status} />
        <ProgressIndicator value={formData.progress} />
        <DateInfo createdAt={northStar.created_at} achievedAt={northStar.achieved_at} />
      </div>

      {/* Quick Actions */}
      <QuickActionsBar northStar={northStar} onStatusChange={handleStatusChange} />
    </div>
  );
};
```

---

### 2. Identity & Purpose Section

**Fields:**

#### Title Input
```tsx
<FormField
  label="North Star Title"
  required
  value={formData.title}
  onChange={(value) => updateField('title', value)}
  placeholder="e.g., Become a Climate Tech Entrepreneur"
  maxLength={100}
/>
```

#### Why Textarea (EMPHASIZED)
```tsx
<FormField
  label="What do you want to see happening in the next 3 years?"
  description="This is the heart of your North Star. Be specific and personal."
  required
  emphasized // Special styling to highlight importance
  value={formData.why}
  onChange={(value) => updateField('why', value)}
  placeholder="Paint a vivid picture of the future you want to create..."
  rows={6}
  maxLength={1000}
  showCharacterCount
/>
```

**Visual Treatment:**
- Larger textarea (6+ rows)
- Highlighted border (subtle glow or accent color)
- Motivational placeholder text
- Character counter
- Optional AI assist button (future: "Help me clarify my why")

#### Description Textarea
```tsx
<FormField
  label="Description (optional)"
  value={formData.description}
  onChange={(value) => updateField('description', value)}
  placeholder="Additional context about this North Star..."
  rows={4}
/>
```

#### Icon Picker
```tsx
<EmojiPicker
  label="Icon"
  value={formData.icon}
  onChange={(value) => updateField('icon', value)}
  defaultIcon="⭐"
/>
```

---

### 3. Alignment Section

#### SDG Goals Multi-Select
```tsx
<SDGGoalSelector
  label="UN Sustainable Development Goals"
  description="Align your North Star with global impact goals"
  value={formData.sdgGoals}
  onChange={(goals) => updateField('sdgGoals', goals)}
  renderMode="grid" // Grid of 17 cards
/>
```

**Visual Design:**
- Grid layout (3-4 columns)
- Each SDG card:
  - Goal number in colored circle (official SDG color)
  - Goal icon emoji
  - Goal title
  - Checkbox/toggle
  - Hover: Show full description
- Selected cards have accent border
- Mobile: 2 columns, scrollable

**Component:**
```typescript
const SDGGoalSelector = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {SDG_GOALS.map((goal) => (
        <button
          key={goal.number}
          onClick={() => toggleGoal(goal.number)}
          className={cn(
            "relative p-4 rounded-lg border-2 transition-all",
            value.includes(goal.number)
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mb-2"
            style={{ backgroundColor: goal.color }}
          >
            {goal.number}
          </div>
          <div className="text-2xl mb-1">{goal.icon}</div>
          <div className="text-xs font-medium line-clamp-2">{goal.title}</div>

          {value.includes(goal.number) && (
            <div className="absolute top-2 right-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
};
```

#### Career Path Selector
```tsx
<Select
  label="Career Path"
  description="Align with your career direction"
  value={formData.careerPath}
  onChange={(value) => updateField('careerPath', value)}
  options={CAREER_PATHS}
  renderOption={(option) => (
    <span>{option.icon} {option.label}</span>
  )}
/>
```

---

### 4. Visual Designer Section

This is the **most interactive section** - all changes update the preview in real-time.

#### Shape Selector
```tsx
<ShapeSelector
  label="Star Shape"
  value={formData.shape}
  onChange={(shape) => updateField('shape', shape)}
  options={NORTH_STAR_SHAPES}
/>
```

**Visual Design:**
- Grid of shape options (4 columns)
- Each option shows:
  - Shape icon/emoji
  - Shape label
  - Mini preview of star with that shape
- Selected option has accent border and checkmark
- Hover shows enlarged preview

#### Color Theme Selector
```tsx
<ColorThemeSelector
  label="Color Theme"
  value={formData.colorTheme}
  onChange={(color) => updateField('colorTheme', color)}
  options={NORTH_STAR_COLORS}
/>
```

**Visual Design:**
- Grid of color swatches (4 columns)
- Each swatch:
  - Large color circle with gradient (base + glow)
  - Color name below
  - Selected has checkmark overlay
- Hover shows color hex codes

**Component:**
```typescript
const ColorThemeSelector = ({ value, onChange, options }) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {options.map((colorOption) => (
        <button
          key={colorOption.value}
          onClick={() => onChange(colorOption.value)}
          className="flex flex-col items-center gap-2 group"
        >
          <div
            className={cn(
              "relative w-16 h-16 rounded-full border-4 transition-all",
              value === colorOption.value
                ? "border-blue-500 scale-110"
                : "border-transparent group-hover:border-gray-300"
            )}
            style={{
              background: `radial-gradient(circle, ${colorOption.color}, ${colorOption.glow})`
            }}
          >
            {value === colorOption.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            )}
          </div>
          <span className="text-xs font-medium">{colorOption.label}</span>
        </button>
      ))}
    </div>
  );
};
```

#### Advanced Star Configuration
```tsx
<AdvancedStarConfig
  label="Star Configuration"
  value={formData.starConfig}
  onChange={(config) => updateField('starConfig', config)}
  collapsible // Starts collapsed
/>
```

**Fields:**

1. **Core Size Slider**
```tsx
<Slider
  label="Core Size"
  min={40}
  max={80}
  step={5}
  value={formData.starConfig.coreSize}
  onChange={(value) => updateStarConfig('coreSize', value)}
  showValue
/>
```

2. **Flare Count Slider**
```tsx
<Slider
  label="Light Rays"
  min={3}
  max={8}
  step={1}
  value={formData.starConfig.flareCount}
  onChange={(value) => updateStarConfig('flareCount', value)}
  showValue
/>
```

3. **Randomize Button**
```tsx
<Button
  variant="outline"
  onClick={randomizeStarConfig}
  className="w-full"
>
  <Shuffle className="w-4 h-4 mr-2" />
  Randomize Star Pattern
</Button>
```

**Randomize Logic:**
```typescript
const randomizeStarConfig = () => {
  updateField('starConfig', {
    coreSize: Math.floor(Math.random() * 41) + 40, // 40-80
    flareCount: Math.floor(Math.random() * 6) + 3, // 3-8
    seed: Math.random().toString(36).substring(7), // New random seed
  });
};
```

---

### 5. Progress & Status Section

#### Progress Slider
```tsx
<Slider
  label="Progress Percentage"
  description="Track your progress toward this North Star"
  min={0}
  max={100}
  step={5}
  value={formData.progress}
  onChange={(value) => updateField('progress', value)}
  showValue
  suffix="%"
  renderValue={(value) => (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold">{value}%</span>
      <ProgressRing value={value} size={32} />
    </div>
  )}
/>
```

#### Status Display (Read-Only with Link)
```tsx
<StatusDisplay
  label="Current Status"
  value={northStar.status}
  onChangeClick={() => setShowQuickStatusDialog(true)}
/>
```

**Visual:**
- Large status badge with icon
- Status-specific colors
- "Change Status" link button
- Opens QuickStatusChangeDialog

---

### 6. Linked Projects Section

#### Project List
```tsx
<LinkedProjectsList
  northStarId={northStar.id}
  onCreateProject={() => setShowCreateProjectDialog(true)}
/>
```

**Features:**
- List of all projects linked to this North Star
- Each project shows:
  - Icon and title
  - Status badge
  - Progress percentage
  - Quick actions (View, Edit, Unlink)
- Empty state: "No projects linked yet. Create one to start making progress!"
- "Create Project" button (opens CreateProjectDialog with pre-selection)

**Component:**
```typescript
const LinkedProjectsList = ({ northStarId, onCreateProject }) => {
  const { data: projects } = useLinkedProjects(northStarId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Linked Projects ({projects?.length || 0})
        </h4>
        <Button size="sm" onClick={onCreateProject}>
          <Plus className="w-4 h-4 mr-1" />
          Create Project
        </Button>
      </div>

      {projects?.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-12 h-12" />}
          title="No projects yet"
          description="Create a project to start making progress toward this North Star."
          action={
            <Button onClick={onCreateProject}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              compact
              actions={[
                { label: "View", onClick: () => viewProject(project.id) },
                { label: "Edit", onClick: () => editProject(project.id) },
                { label: "Unlink", onClick: () => unlinkProject(project.id), variant: "destructive" },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## State Management

### Form State
```typescript
interface CustomizationFormData {
  // Identity
  title: string;
  why: string;
  description: string;
  icon: string;

  // Alignment
  sdgGoals: number[];
  careerPath: string;

  // Visual
  shape: string;
  colorTheme: string;
  starConfig: {
    coreSize: number;
    flareCount: number;
    seed: string;
  };

  // Progress
  progress: number;
}

const [formData, setFormData] = useState<CustomizationFormData>(() =>
  initializeFromNorthStar(northStar)
);

const updateField = <K extends keyof CustomizationFormData>(
  field: K,
  value: CustomizationFormData[K]
) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
  // Trigger debounced auto-save
  debouncedSave({ [field]: value });
};
```

### Auto-Save Logic
```typescript
const debouncedSave = useMemo(
  () =>
    debounce(async (changes: Partial<NorthStarUpdateData>) => {
      if (!northStar) return;

      try {
        await updateNorthStar(northStar.id, changes);
        toast.success("Changes saved", { duration: 1000 });
      } catch (error) {
        console.error("Auto-save failed:", error);
        toast.error("Failed to save changes");
      }
    }, 1000),
  [northStar]
);
```

### Unsaved Changes Detection
```typescript
const hasUnsavedChanges = useMemo(() => {
  if (!northStar) return false;
  return JSON.stringify(formData) !== JSON.stringify(initializeFromNorthStar(northStar));
}, [formData, northStar]);

// Warn on close if unsaved
const handleClose = () => {
  if (hasUnsavedChanges) {
    if (confirm("You have unsaved changes. Are you sure you want to close?")) {
      onOpenChange(false);
    }
  } else {
    onOpenChange(false);
  }
};
```

---

## Responsive Behavior

### Breakpoints
```typescript
const breakpoints = {
  mobile: "< 640px",
  tablet: "640px - 1023px",
  desktop: ">= 1024px"
};
```

### Layout Adaptations

#### Desktop (>= 1024px)
- Two-column layout
- Left: Sticky preview (400px)
- Right: Scrollable form sections
- Side-by-side comparison

#### Tablet (640px - 1023px)
- Modal overlay (80% viewport)
- Tabbed interface: [Preview | Edit | Projects]
- Vertical scrolling within tabs

#### Mobile (< 640px)
- Full-screen modal
- Tabbed interface with smaller tabs
- Collapsed sections by default
- Floating save button

---

## Interactions & Animations

### Real-Time Preview Updates
```typescript
useEffect(() => {
  // Update preview whenever form data changes
  updatePreview(formData);
}, [formData]);
```

### Section Collapse/Expand
```typescript
const [expandedSections, setExpandedSections] = useState<string[]>([
  "identity",
  "visual" // Expanded by default
]);

const toggleSection = (sectionId: string) => {
  setExpandedSections((prev) =>
    prev.includes(sectionId)
      ? prev.filter((id) => id !== sectionId)
      : [...prev, sectionId]
  );
};
```

### Smooth Transitions
```css
.preview-star {
  transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

.form-section {
  transition: max-height 300ms ease-out, opacity 200ms ease-out;
}

.color-swatch {
  transition: transform 200ms ease-out, border-color 200ms ease-out;
}
```

---

## Accessibility

### Keyboard Navigation
- Tab order follows visual hierarchy
- All interactive elements focusable
- Escape key closes panel (with unsaved warning)
- Enter key saves and closes

### Screen Reader Support
```tsx
<div role="dialog" aria-labelledby="panel-title" aria-describedby="panel-description">
  <h2 id="panel-title">North Star Customization</h2>
  <p id="panel-description" className="sr-only">
    Customize your North Star's appearance, alignment, and details
  </p>
  {/* ... */}
</div>
```

### Focus Management
- Focus trap within panel when open
- Return focus to trigger element on close
- Focus first input field on open

---

## Component File Structure

```
components/journey/
├── customization/
│   ├── NorthStarCustomizationPanel.tsx   # Main panel component
│   ├── PreviewSection.tsx                # Live preview
│   ├── IdentitySection.tsx               # Identity & Purpose form
│   ├── AlignmentSection.tsx              # SDG & Career
│   ├── VisualDesignerSection.tsx         # Visual customization
│   ├── ProgressSection.tsx               # Progress & Status
│   ├── LinkedProjectsSection.tsx         # Projects list
│   ├── SDGGoalSelector.tsx               # SDG grid component
│   ├── ColorThemeSelector.tsx            # Color picker
│   ├── ShapeSelector.tsx                 # Shape picker
│   └── AdvancedStarConfig.tsx            # Sliders for star config
└── ui/
    ├── emoji-picker.tsx                   # Emoji selector
    ├── progress-ring.tsx                  # Circular progress
    └── collapsible-section.tsx            # Accordion section
```

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Create `NorthStarCustomizationPanel.tsx` component
- [ ] Implement responsive layout (desktop two-column, mobile tabs)
- [ ] Set up form state management with auto-save
- [ ] Add unsaved changes detection

### Phase 2: Preview Section
- [ ] Build `PreviewSection.tsx` with sticky positioning
- [ ] Implement real-time star preview updates
- [ ] Add status effects visualization
- [ ] Create quick actions bar

### Phase 3: Form Sections
- [ ] `IdentitySection.tsx` - Title, Why (emphasized), Description, Icon
- [ ] `AlignmentSection.tsx` - SDG selector, Career path dropdown
- [ ] `VisualDesignerSection.tsx` - Shape, Color, Star config sliders
- [ ] `ProgressSection.tsx` - Progress slider, Status display
- [ ] `LinkedProjectsSection.tsx` - Project list, Create project

### Phase 4: Interactive Components
- [ ] `SDGGoalSelector.tsx` - Grid with 17 SDG cards
- [ ] `ColorThemeSelector.tsx` - Color swatches with gradients
- [ ] `ShapeSelector.tsx` - Shape options grid
- [ ] `AdvancedStarConfig.tsx` - Core size & flare count sliders
- [ ] `EmojiPicker.tsx` - Emoji selection UI

### Phase 5: Polish
- [ ] Add smooth transitions and animations
- [ ] Implement keyboard navigation
- [ ] Add ARIA labels and screen reader support
- [ ] Test on mobile, tablet, desktop
- [ ] Add loading states
- [ ] Error handling and validation

### Phase 6: Integration
- [ ] Wire up to JourneyMapCanvas
- [ ] Add "Customize" button to NorthStarNode
- [ ] Connect to Supabase update functions
- [ ] Test auto-save functionality
- [ ] Test with QuickStatusChangeDialog integration

---

## Usage Example

```tsx
// In JourneyMapCanvas.tsx
const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
const [customizingNorthStar, setCustomizingNorthStar] = useState<NorthStar | null>(null);

const handleCustomizeNorthStar = useCallback((northStar: NorthStar) => {
  setCustomizingNorthStar(northStar);
  setCustomizePanelOpen(true);
}, []);

// In render
<NorthStarCustomizationPanel
  open={customizePanelOpen}
  onOpenChange={setCustomizePanelOpen}
  northStar={customizingNorthStar}
  onSuccess={refreshNorthStars}
/>
```

---

## Future Enhancements

### v1.2
- [ ] Achievement reflection editor (rich text)
- [ ] Status change timeline visualization
- [ ] AI-powered "Why" suggestions

### v2.0
- [ ] Star animation presets
- [ ] Custom CSS filters for star effects
- [ ] North Star templates/presets
- [ ] Community-shared star designs
- [ ] Export/import North Star configurations
- [ ] Duplicate North Star feature
- [ ] North Star history (version control)

---

## Performance Optimization

### Rendering
- Use `React.memo` for all section components
- Debounce preview updates (100ms)
- Virtualize SDG goal grid if expanded to show descriptions
- Lazy load linked projects list

### Auto-Save
- Debounce auto-save (1000ms)
- Batch multiple field changes
- Optimistic UI updates
- Background save with toast confirmation

### Preview Updates
- Memoize star SVG generation
- Use CSS transforms for animations (GPU)
- Throttle color/shape changes to preview

---

## Testing Strategy

### Unit Tests
- Form validation logic
- Auto-save debouncing
- State management
- Preview update triggers

### Integration Tests
- Save and close flow
- Unsaved changes warning
- Quick status change integration
- Project creation from panel

### Visual Regression Tests
- Preview rendering with all status types
- SDG grid layout
- Color theme selector
- Responsive layouts (mobile/tablet/desktop)

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Color contrast

---

## Migration Path

For existing North Stars without full metadata:

```typescript
const migrateNorthStar = (northStar: NorthStar): NorthStar => {
  return {
    ...northStar,
    metadata: {
      ...northStar.metadata,
      starConfig: northStar.metadata?.starConfig || {
        coreSize: 60,
        flareCount: 5,
        seed: northStar.id,
      },
    },
  };
};
```

---

## Success Metrics

- **User Engagement**: % of North Stars customized beyond defaults
- **Feature Usage**: Most used customization options
- **Time to Customize**: Average time spent in panel
- **Conversion**: % of users who customize vs. use defaults
- **Retention**: Do customized North Stars have higher engagement?

