# Journey Map Refactoring - Quick Reference

## 📦 What Was Created

### New Hooks (in `/hooks/`)

```typescript
// Project data management
import { useJourneyProjects } from "@/hooks/use-journey-projects";

// UI state management
import { useJourneyMapState } from "@/hooks/use-journey-map-state";

// Position synchronization
import { usePositionSync } from "@/hooks/use-position-sync";
```

### New Components (in `/components/journey/`)

```typescript
// Canvas view
import { JourneyMapCanvasView } from "@/components/journey";

// Action bar with stats
import { JourneyActionBar } from "@/components/journey";

// Navigation guide
import { NavigationGuide } from "@/components/journey";
```

### New Utilities

```typescript
// Calculations
import {
  calculateJourneyStats,
  calculateOverallProgress,
  checkRecentActivity,
} from "@/components/journey/utils/journeyCalculations";

// Map building
import { buildJourneyMap } from "@/components/journey/utils/journeyMapBuilder";
```

### New Constants

```typescript
import {
  PANEL_SIZES,
  NODE_LAYOUT,
  FLOW_CONFIG,
  VIEW_MODES,
} from "@/components/journey/constants/journeyMapConfig";
```

## 🎯 Key Benefits

| Before                   | After                                |
| ------------------------ | ------------------------------------ |
| 570 lines in one file    | Distributed across 10+ focused files |
| Hard to test             | Easy to test with isolated units     |
| Magic numbers everywhere | Named constants                      |
| Mixed concerns           | Clear separation                     |
| Difficult to maintain    | Easy to understand and modify        |

## 🔧 Common Tasks

### Adding a New Statistic

1. Update `calculateJourneyStats()` in `utils/journeyCalculations.ts`
2. Update `JourneyStats` type in `JourneyActionBar.tsx`
3. Display in `JourneyActionBar` or `NavigationGuide`

### Adding a New Project Action

1. Add handler to `useJourneyMapState` hook
2. Pass through component props
3. Wire to node data in `buildJourneyMap()`

### Modifying Layout

1. Update constants in `constants/journeyMapConfig.ts`
2. Adjust calculations in `utils/journeyCalculations.ts` if needed

### Testing a Feature

```typescript
// Test pure function
import { calculateJourneyStats } from './utils/journeyCalculations';
expect(calculateJourneyStats(projects).progressPercentage).toBe(75);

// Test hook
const { result } = renderHook(() => useJourneyMapState());
act(() => result.current.switchToMilestoneView('id'));
expect(result.current.viewMode).toBe('milestone');

// Test component
render(<JourneyActionBar stats={mockStats} onCreateProject={jest.fn()} />);
```

## 📁 File Structure

```
components/journey/
├── JourneyMapCanvas.tsx          ← Main orchestrator
├── JourneyMapCanvasView.tsx      ← ReactFlow canvas
├── JourneyActionBar.tsx          ← Top bar
├── NavigationGuide.tsx           ← Bottom guide
├── constants/
│   └── journeyMapConfig.ts       ← All config
├── utils/
│   ├── journeyCalculations.ts    ← Pure functions
│   └── journeyMapBuilder.ts      ← Map builder
└── REFACTORING_GUIDE.md          ← Full docs

hooks/
├── use-journey-projects.ts       ← Data hook
├── use-journey-map-state.ts      ← UI state hook
└── use-position-sync.ts          ← Sync hook
```

## 🚨 Breaking Changes

**None!** The public API is unchanged:

```tsx
<JourneyMapCanvas userId="..." userName="..." userAvatar="..." />
```

## ✅ Checklist for Future Changes

- [ ] Does this belong in a hook, util, or component?
- [ ] Can I extract a pure function?
- [ ] Should this be a constant?
- [ ] Am I duplicating code?
- [ ] Have I added proper types?
- [ ] Is this tested or testable?
- [ ] Did I document the change?

## 📚 Documentation

- **Full Guide**: [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md)
- **Summary**: [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)
- **This File**: Quick reference for developers

---

**Last Updated**: 2025-10-27  
**Status**: ✅ Complete & Production Ready
