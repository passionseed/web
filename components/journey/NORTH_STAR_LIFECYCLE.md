# North Star Lifecycle System

## Overview

The North Star Lifecycle System implements a "white dwarf" metaphor for North Stars - long-term aspirational goals that can shine brightly, dim over time, be archived like dying stars, and even be reignited later in life.

## The "Death Star" Metaphor

Inspired by stellar evolution, North Stars follow a lifecycle similar to actual stars:

- **Active** 🌟 - Burning brightly, guiding your journey
- **On Hold** ⏸️ - Dimmed temporarily, but still glowing
- **Archived** ⚫ - "White Dwarf" state - visible but desaturated, dormant
- **Achieved** ✨ - Supernova! Bright celebration with shimmer effect

This metaphor acknowledges that our life goals evolve, and it's okay to pause, archive, or even reignite old dreams.

---

## Status Lifecycle

### 1. Active Status
**Visual Characteristics:**
- Full opacity (100%)
- Full color saturation
- Normal glow intensity (0.5)
- No filter effects

**Available Actions:**
- ⏸️ **Pause** → Transition to "On Hold"
- ⚫ **Archive** → Transition to "Archived"
- ✨ **Mark as Achieved** → Transition to "Achieved"
- ✏️ **Edit** → Open full edit dialog
- ➕ **Create Project** → Create project linked to this North Star

### 2. On Hold Status
**Visual Characteristics:**
- Reduced opacity (80%)
- Full color saturation
- Reduced glow intensity (0.3)
- No filter effects

**Available Actions:**
- ▶️ **Resume** → Transition back to "Active"
- ⚫ **Archive** → Transition to "Archived"
- ✨ **Mark as Achieved** → Transition to "Achieved"
- ✏️ **Edit** → Open full edit dialog
- ➕ **Create Project** → Create project linked to this North Star

**Metadata:**
- Optional `pause_reason` stored in metadata

### 3. Archived Status ("White Dwarf")
**Visual Characteristics:**
- Reduced opacity (60%)
- Grayscale filter (60%) - desaturated appearance
- Minimal glow intensity (0.2)
- "Dormant" badge displayed
- Visual resembles a white dwarf star - dim and colorless but still visible

**Available Actions:**
- 🔥 **Reignite** → Transition back to "Active" with celebration
- ✏️ **Edit** → Open full edit dialog
- ➕ **Create Project** → Create project linked to this North Star (even dormant stars can inspire!)

**Philosophy:**
- Represents goals that are no longer priorities but remain visible
- Acknowledges past aspirations without deleting them
- Can be reignited if life circumstances change
- Maintains historical context of your journey

### 4. Achieved Status
**Visual Characteristics:**
- Full opacity (100%)
- Full color saturation
- Enhanced glow intensity (0.7)
- Shimmer animation effect (celebration)
- No filter effects
- Visual celebration of accomplishment

**Metadata:**
- `achieved_at` timestamp (automatically set)
- Optional `achievement_reflection` for capturing the moment

**Available Actions:**
- ✏️ **Edit** → Open full edit dialog
- 🔍 **View Details** → See linked projects and journey

**Note:** Achieved North Stars typically remain in this state as milestones of your journey.

---

## Quick Status Change Dialog

The `QuickStatusChangeDialog` component provides contextual, themed transitions between statuses:

### Pause (Active → On Hold)
- **Theme:** Yellow/Amber
- **Icon:** ⏸️
- **Message:** Taking a break from this North Star? It will remain visible but dimmed. You can resume anytime.
- **Input:** Optional pause reason
- **Button:** "Pause North Star"

### Resume (On Hold → Active)
- **Theme:** Blue/Indigo
- **Icon:** ▶️
- **Message:** Welcome back! This North Star will return to full brightness and become active again.
- **Input:** None
- **Button:** "Resume North Star"

### Archive (Any → Archived)
- **Theme:** Gray/Slate
- **Icon:** ⚫
- **Message:** This North Star will become a 'white dwarf' - dimmed and desaturated but still visible. You can reignite it later if needed.
- **Input:** None
- **Warning Badge:** "This will dim the star"
- **Button:** "Archive North Star"

### Reignite (Archived → Active)
- **Theme:** Amber/Orange gradient
- **Icon:** 🔥
- **Message:** Bringing this North Star back to life! It will return to full color and vibrancy, ready to guide you again.
- **Input:** None
- **Button:** "Reignite North Star" (gradient button)

### Achievement (Any → Achieved)
- **Theme:** Green/Emerald
- **Icon:** ✨
- **Message:** Congratulations! This North Star has been fulfilled. Take a moment to reflect on what you accomplished.
- **Input:** Optional achievement reflection
- **Button:** "Mark as Achieved"
- **Automatic:** Sets `achieved_at` timestamp

---

## North Star Data Model

### Database Schema

```typescript
interface NorthStar {
  // Core Identity
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  why: string | null; // The deep "why" - most important field
  icon: string;

  // Alignment & Purpose
  sdg_goals: number[]; // UN Sustainable Development Goals (1-17)
  career_path: string | null; // Career alignment

  // Visual Customization
  north_star_shape: string; // Shape type
  north_star_color: string; // Color theme
  metadata: NorthStarMetadata | null; // Contains starConfig

  // Canvas Position
  position_x: number | null;
  position_y: number | null;

  // Progress & Status
  progress_percentage: number; // 0-100
  status: NorthStarStatus; // "active" | "achieved" | "on_hold" | "archived"

  // Timestamps
  created_at: string;
  updated_at: string;
  achieved_at: string | null; // Set when status = "achieved"
}
```

### Metadata Structure

```typescript
interface NorthStarMetadata {
  // Star Visual Configuration
  starConfig?: {
    coreSize: number; // 40-80, default 60
    flareCount: number; // 3-8, default 5
    seed: string; // For procedural generation
  };

  // Status-related metadata
  pause_reason?: string; // Set when pausing
  achievement_reflection?: string; // Set when achieving

  // Extensible for future features
  [key: string]: any;
}
```

---

## Customizable Properties

### 1. Core Identity Fields

#### **Title** (Required)
- **Type:** Text
- **Purpose:** The name of your North Star
- **Example:** "Become a Climate Tech Entrepreneur"
- **Validation:** Required, max length

#### **Why** (Most Important!)
- **Type:** Long text
- **Purpose:** Your deep motivation - "What you want to see happening in the next 3 years"
- **Example:** "I want to see renewable energy accessible to rural communities in Southeast Asia, empowering local economies while fighting climate change."
- **UI Treatment:** Large textarea, emphasized as most important question

#### **Description**
- **Type:** Long text
- **Purpose:** Additional context about the North Star
- **Optional:** Yes

#### **Icon**
- **Type:** Single emoji
- **Purpose:** Visual identifier
- **Default:** "⭐"

---

### 2. Alignment & Purpose

#### **SDG Goals** (UN Sustainable Development Goals)
- **Type:** Multi-select checkboxes (1-17)
- **Purpose:** Align North Star with global impact goals
- **Options:** 17 official UN SDGs
- **Visual:** Each goal has:
  - Number (1-17)
  - Title (e.g., "No Poverty")
  - Description
  - Official color code
  - Icon emoji
- **Examples:**
  - Goal 4: Quality Education 📚 #C5192D
  - Goal 13: Climate Action 🌍 #3F7E44
  - Goal 8: Decent Work 💼 #A21942

#### **Career Path**
- **Type:** Single select dropdown
- **Purpose:** Career alignment
- **Options:**
  - Technology & Engineering 💻
  - Healthcare & Medicine 🏥
  - Education & Teaching 🎓
  - Business & Entrepreneurship 📈
  - Arts & Creative 🎨
  - Science & Research 🔬
  - Social Impact & NGO 🤲
  - Environment & Sustainability 🌱
  - Law & Policy ⚖️
  - Media & Communications 📱
  - Finance & Economics 💰
  - Other / Exploring 🌟

---

### 3. Visual Customization

#### **North Star Shape**
- **Type:** Single select (visual picker)
- **Purpose:** Visual style preference
- **Options:**
  - Classic Star ⭐
  - Sparkle ✨
  - Shooting Star 🌠
  - Glowing Star 💫
  - Compass 🧭
  - Target 🎯
  - Diamond 💎
  - Crown 👑

#### **North Star Color**
- **Type:** Single select (color picker with presets)
- **Purpose:** Color theme and glow
- **Options:**
  - Golden (#FFD700, glow: #FFA500)
  - Amber (#FFBF00, glow: #FF8C00)
  - Rose Gold (#B76E79, glow: #E0B0B8)
  - Silver (#C0C0C0, glow: #E8E8E8)
  - Celestial Blue (#4A90E2, glow: #7AB3FF)
  - Royal Purple (#9B59B6, glow: #C39BD3)
  - Emerald (#2ECC71, glow: #58D68D)
  - Sunset Orange (#E67E22, glow: #F39C12)

#### **Star Configuration** (Advanced)
- **Type:** Sliders
- **Stored in:** `metadata.starConfig`
- **Properties:**
  - **Core Size:** 40-80 (default: 60)
    - Controls the size of the star's center
  - **Flare Count:** 3-8 (default: 5)
    - Number of light rays emanating from the star
  - **Seed:** Auto-generated from North Star ID
    - Ensures consistent procedural generation

---

### 4. Progress & Status

#### **Progress Percentage**
- **Type:** Slider (0-100)
- **Purpose:** Track completion toward North Star
- **Visual:** Progress bar or circular indicator
- **Default:** 0

#### **Status**
- **Type:** Managed through Quick Status Change dialogs
- **Values:**
  - `active` - Default state
  - `on_hold` - Temporarily paused
  - `archived` - White dwarf state
  - `achieved` - Completed with celebration

---

### 5. Canvas Position

#### **Position X, Position Y**
- **Type:** Coordinates (pixels)
- **Purpose:** Canvas placement
- **Managed by:** ReactFlow drag interaction
- **Auto-saved:** Yes

---

## Component Architecture

### File Structure

```
components/journey/
├── nodes/
│   └── NorthStarNode.tsx          # Main node component with visual effects
├── dialogs/
│   ├── CreateNorthStarDialog.tsx  # Multi-step creation wizard
│   ├── EditNorthStarDialog.tsx    # Full edit form
│   └── QuickStatusChangeDialog.tsx # Contextual status transitions
├── utils/
│   └── journeyMapBuilder.ts       # Node creation and callback wiring
└── JourneyMapCanvas.tsx           # Main canvas with state management
```

### Data Flow

```
User Action (Click Button)
    ↓
NorthStarNode Component
    ↓
Callback: onQuickStatusChange(northStar, newStatus)
    ↓
JourneyMapCanvas: handleQuickStatusChange()
    ↓
Opens QuickStatusChangeDialog
    ↓
User Confirms
    ↓
handleConfirmStatusChange()
    ↓
updateNorthStar() - Supabase mutation
    ↓
refreshNorthStars() - Refetch data
    ↓
UI Updates with new visual effects
```

---

## Planned: North Star Customization Panel

### Vision

A comprehensive side panel or modal for deep customization of North Stars, going beyond quick edits.

### Panel Sections

#### **1. Identity & Purpose**
- Title (text input)
- Why (large textarea with character count, emphasized)
- Description (textarea)
- Icon picker (emoji selector)

#### **2. Alignment**
- SDG Goals (grid of 17 checkboxes with colors)
- Career Path (dropdown with icons)

#### **3. Visual Designer**
- **Star Preview** (live preview canvas, large)
- Shape selector (visual cards)
- Color theme selector (color swatches)
- Advanced star configuration:
  - Core Size slider (with preview update)
  - Flare Count slider (with preview update)
  - Randomize button (new seed)

#### **4. Progress & Tracking**
- Progress slider (0-100%)
- Status indicator (read-only, use Quick Actions to change)
- Created date (read-only)
- Last updated (read-only)
- Achieved date (if applicable, read-only)

#### **5. Linked Projects**
- List of projects linked to this North Star
- Quick actions per project
- "Create New Project" button

#### **6. Reflections & Notes** (Future)
- Timeline of status changes
- Achievement reflection (if achieved)
- Pause reasons (if on hold)
- Custom notes

### UI/UX Patterns

#### **Live Preview**
- Central star preview that updates in real-time as user changes:
  - Color theme
  - Shape
  - Core size
  - Flare count
- Preview shows current status effects (opacity, grayscale, glow)

#### **Section Organization**
- Collapsible sections for better organization
- Primary sections expanded by default
- Advanced sections collapsed

#### **Responsive Layout**
- Desktop: Side panel (400-500px wide)
- Tablet: Modal overlay
- Mobile: Full screen modal

#### **Save Behavior**
- Auto-save on blur for text fields
- Immediate save for selections (color, shape)
- Manual save button for batch changes
- Unsaved changes warning

---

## Technical Implementation Details

### Visual Effect System

```typescript
// Status-based opacity
const nodeOpacity =
  northStar.status === 'archived' ? 'opacity-60' :
  northStar.status === 'on_hold' ? 'opacity-80' :
  'opacity-100';

// Status-based glow intensity
const glowIntensity =
  northStar.status === 'active' ? 0.5 :
  northStar.status === 'achieved' ? 0.7 :
  northStar.status === 'on_hold' ? 0.3 :
  0.2;

// Status-based color filter
const filterEffect =
  northStar.status === 'archived' ? 'grayscale(60%)' :
  'none';
```

### Shimmer Animation (Achievement Celebration)

```css
@keyframes shimmer {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.achievement-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
```

### Star SVG Generation

The `StarSVG` component uses procedural generation:
- Deterministic seed based on North Star ID
- Configurable core size and flare count
- Supports color theming with glow effects
- Renders as inline SVG for performance

---

## Future Enhancements

### Planned Features

1. **Unified North Star Wizard Dialog**
   - Single dialog for create/edit/remake
   - Mode switching based on context
   - Preserves data when switching modes

2. **Scrap & Remake Confirmation**
   - Special dialog for "scrapping" and recreating
   - Preserves linked projects
   - Archives old version, creates new one

3. **North Star Timeline**
   - Visual timeline of status changes
   - Show pause periods, achievement date
   - Linked project milestones

4. **Impact Dashboard**
   - SDG goal alignment visualization
   - Projects contributing to each SDG
   - Progress across multiple North Stars

5. **Achievement Gallery**
   - Special view for achieved North Stars
   - Reflection journal
   - Celebration animations

6. **Star Customization Presets**
   - Save custom star configurations
   - Community-shared presets
   - Theme packs (e.g., "Galaxy", "Aurora", "Minimalist")

---

## Usage Guidelines

### When to Use Each Status

#### Use **Active** when:
- Actively working toward this North Star
- It's a current priority in your life
- You're creating projects aligned with it

#### Use **On Hold** when:
- Temporarily deprioritizing this goal
- Life circumstances require a pause
- You plan to return to it later

#### Use **Archived** when:
- This goal is no longer relevant
- Your priorities have shifted significantly
- You want to keep it visible but inactive
- You might reignite it in the distant future

#### Use **Achieved** when:
- You've accomplished this North Star!
- The goal has been fulfilled
- You want to celebrate and reflect

### Best Practices

1. **Be Honest with Status Changes**
   - It's okay to pause or archive goals
   - Life evolves, and so should your North Stars
   - Don't feel guilty about changing priorities

2. **Use the "Why" Field Deeply**
   - This is your north star's soul
   - Focus on what you want to see in 3 years
   - Be specific and personal

3. **Leverage SDG Alignment**
   - Connect personal goals to global impact
   - Find meaning in contribution
   - Discover aligned communities

4. **Create Projects to Make Progress**
   - North Stars are destinations
   - Projects are the journey
   - Use "Create Project" button to take action

5. **Reflect on Achievements**
   - Use the achievement reflection field
   - Capture the moment and feeling
   - Inspire future self

---

## API Reference

### Supabase Functions

#### `createNorthStar(data: NorthStarCreateData)`
Creates a new North Star with default status "active".

#### `updateNorthStar(id: string, data: NorthStarUpdateData)`
Updates North Star properties. Used for:
- Status changes
- Progress updates
- Visual customization
- Position changes

#### `deleteNorthStar(id: string)`
Permanently deletes a North Star and its relationships.

#### `getNorthStars(userId: string)`
Fetches all North Stars for a user, ordered by creation date.

---

## Accessibility

- Semantic HTML for screen readers
- Keyboard navigation for all actions
- ARIA labels on status buttons
- Color contrast compliance
- Focus indicators on interactive elements

---

## Performance Considerations

- Star SVG cached and memoized
- Status effects use CSS transforms (GPU accelerated)
- ReactFlow nodes optimized with React.memo
- Batch updates when changing multiple properties
- Lazy loading of achievement celebration effects

---

## Changelog

### v1.0 (Current)
- ✅ White dwarf lifecycle implementation
- ✅ Quick status change dialogs
- ✅ Visual status effects (opacity, grayscale, glow)
- ✅ Achievement celebration shimmer
- ✅ Create projects from North Stars
- ✅ Full edit dialog
- ✅ Contextual status buttons

### v1.1 (Planned)
- ⏳ North Star customization panel
- ⏳ Unified wizard dialog
- ⏳ Scrap & remake functionality
- ⏳ Achievement gallery
- ⏳ Status change timeline

---

## Contributing

When extending the North Star system:

1. **Maintain the Metaphor**: Keep the stellar lifecycle metaphor consistent
2. **Preserve Visual Effects**: Status-based visual changes are core to UX
3. **Test All Transitions**: Ensure smooth transitions between all status combinations
4. **Update Documentation**: Keep this file in sync with implementation
5. **Consider Mobile**: All features should work on touch devices

---

## References

- [UN Sustainable Development Goals](https://sdgs.un.org/goals)
- [ReactFlow Documentation](https://reactflow.dev/)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript)
- [Star Lifecycle (Astronomy)](https://en.wikipedia.org/wiki/Stellar_evolution)
