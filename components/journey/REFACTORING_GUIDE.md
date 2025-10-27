# Journey Map Canvas Refactoring

## Overview

The `JourneyMapCanvas` component has been refactored following clean code principles with improved modularity, separation of concerns, and type safety.

## Architecture

### Directory Structure

```
components/journey/
├── JourneyMapCanvas.tsx              # Main component (REFACTORED)
├── JourneyMapCanvasView.tsx          # ReactFlow canvas view component
├── JourneyActionBar.tsx              # Top action bar with stats
├── NavigationGuide.tsx               # Expandable navigation help
├── constants/
│   └── journeyMapConfig.ts           # Centralized constants
├── utils/
│   ├── journeyCalculations.ts        # Pure calculation functions
│   └── journeyMapBuilder.ts          # Map construction logic
hooks/
├── use-journey-projects.ts           # Project data management
├── use-journey-map-state.ts          # UI state management
└── use-position-sync.ts              # Position synchronization
```

## Key Improvements

### 1. **Separated Concerns**

#### Before

- 500+ lines in single file
- Mixed business logic, UI, and data fetching
- Hard to test and maintain

#### After

- Main component: ~300 lines (orchestration only)
- Business logic extracted to custom hooks
- UI components separated into focused files
- Pure utility functions for calculations

### 2. **Custom Hooks**

#### `useJourneyProjects`

**Responsibility**: Project data loading and state management

```typescript
const { projects, isLoading, refreshProjects } = useJourneyProjects();
```

**Benefits**:

- Encapsulates async data fetching
- Handles loading states and errors
- Reusable across components

#### `useJourneyMapState`

**Responsibility**: UI state management

```typescript
const {
  selectedProjectId,
  viewMode,
  switchToMilestoneView,
  openEditDialog,
  // ... more state
} = useJourneyMapState();
```

**Benefits**:

- Centralizes all UI state
- Provides semantic action methods
- Easy to test state transitions

#### `usePositionSync`

**Responsibility**: Position synchronization with backend

```typescript
const { syncStatus, handleNodeDragStop } = usePositionSync();
```

**Benefits**:

- Isolates sync logic
- Manages batched updates
- Handles cleanup automatically

### 3. **Extracted Components**

#### `JourneyActionBar`

- Displays journey statistics
- "Create Project" button
- Clean props interface

#### `NavigationGuide`

- Expandable statistics panel
- Keyboard/mouse controls help
- Self-contained state

#### `JourneyMapCanvasView`

- Pure ReactFlow rendering
- No business logic
- Highly testable

### 4. **Centralized Configuration**

`constants/journeyMapConfig.ts` contains:

- Panel sizes
- Node positioning radii
- ReactFlow configuration
- Visual styling constants

**Benefits**:

- Single source of truth
- Easy to adjust values
- TypeScript const assertions for type safety

### 5. **Pure Utility Functions**

`utils/journeyCalculations.ts`:

- `calculateOverallProgress()`
- `calculateJourneyStats()`
- `categorizeProjects()`
- `checkRecentActivity()`
- `getNodePosition()`

**Benefits**:

- Easy to unit test
- No side effects
- Reusable across codebase

`utils/journeyMapBuilder.ts`:

- `buildJourneyMap()` - constructs nodes and edges
- Separated node/edge creation logic
- Clear data transformation pipeline

### 6. **Improved Type Safety**

#### Exported Types

```typescript
export interface JourneyMapCanvasProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export interface JourneyStats {
  totalProjects: number;
  northStarCount: number;
  activeProjects: number;
  // ...
}
```

#### Type Constraints

- Const assertions for configurations
- Generic type parameters for ReactFlow
- Proper TypeScript inference

## Migration Guide

### Using the Refactored Component

The public API remains **unchanged**:

```tsx
<JourneyMapCanvas
  userId={user.id}
  userName={user.name}
  userAvatar={user.avatar}
/>
```

### Extending Functionality

#### Adding New Statistics

1. Update `calculateJourneyStats()` in `utils/journeyCalculations.ts`
2. Update `JourneyStats` interface in `JourneyActionBar.tsx`
3. Display in `JourneyActionBar` or `NavigationGuide`

#### Adding New Project Actions

1. Add callback to `useJourneyMapState` hook
2. Pass through `JourneyMapCanvasInner` props
3. Wire to `buildJourneyMap` callbacks

#### Modifying Layout

1. Adjust constants in `constants/journeyMapConfig.ts`
2. Update calculation logic in `utils/journeyCalculations.ts` if needed

## Testing Strategy

### Unit Tests

#### Pure Functions

```typescript
describe("calculateJourneyStats", () => {
  it("calculates progress percentage correctly", () => {
    const projects = [
      /* test data */
    ];
    const stats = calculateJourneyStats(projects);
    expect(stats.progressPercentage).toBe(75);
  });
});
```

#### Hooks

```typescript
describe("useJourneyMapState", () => {
  it("switches to milestone view", () => {
    const { result } = renderHook(() => useJourneyMapState());
    act(() => {
      result.current.switchToMilestoneView("project-id");
    });
    expect(result.current.viewMode).toBe("milestone");
  });
});
```

### Integration Tests

Test the main component with mocked hooks:

```typescript
jest.mock("@/hooks/use-journey-projects", () => ({
  useJourneyProjects: () => ({
    projects: mockProjects,
    isLoading: false,
  }),
}));
```

## Performance Considerations

### Memoization

- `useMemo` for expensive calculations (stats, map building)
- `useCallback` for stable event handlers
- Prevents unnecessary re-renders

### Lazy Loading

- Components split for better code splitting
- Milestone view loaded separately

### Batched Updates

- Position sync uses debounced batching
- Reduces database calls

## Future Enhancements

### Recommended Next Steps

1. **Add unit tests** for calculation utilities
2. **Extract more sub-components** from panels
3. **Create context provider** for shared journey data
4. **Add error boundaries** for better error handling
5. **Implement optimistic updates** for better UX

## Dependencies

### External

- `@xyflow/react` - Diagram rendering
- `react-resizable-panels` - Panel layout
- `sonner` - Toast notifications

### Internal

- `/lib/supabase/journey` - Data layer
- `/lib/sync/PositionSyncManager` - Sync manager
- `/types/journey` - Type definitions

## Design Decisions

### Why Custom Hooks?

- **Reusability**: Logic can be shared across components
- **Testing**: Easier to test in isolation
- **Separation**: UI and logic cleanly separated
- **Composition**: Multiple hooks compose well

### Why Extract Constants?

- **Maintainability**: Single source of truth
- **Consistency**: Same values everywhere
- **Type Safety**: Const assertions prevent mutations
- **Documentation**: Values self-documenting

### Why Pure Functions?

- **Testability**: No mocking required
- **Reliability**: Same input = same output
- **Debugging**: Easy to trace issues
- **Performance**: Easier to optimize

## Comparison

| Aspect               | Before | After     |
| -------------------- | ------ | --------- |
| Lines in main file   | 500+   | ~300      |
| Custom hooks         | 0      | 3         |
| Extracted components | 0      | 3         |
| Constants file       | 0      | 1         |
| Utility modules      | 0      | 2         |
| Magic numbers        | Many   | 0         |
| Inline calculations  | Many   | 0         |
| Type safety          | Good   | Excellent |
| Testability          | Hard   | Easy      |

## Code Review Checklist

- ✅ No magic numbers
- ✅ Single Responsibility Principle
- ✅ DRY (Don't Repeat Yourself)
- ✅ Proper TypeScript types
- ✅ Meaningful names
- ✅ Documentation comments
- ✅ Error handling
- ✅ Cleanup in useEffect
- ✅ Memoization where needed
- ✅ Accessibility attributes

## Related Documentation

- [MAP_EDIT_SECURITY.md](../../MAP_EDIT_SECURITY.md) - Security patterns
- [map-plan.md](../../map-plan.md) - Original map architecture
- [AUTO_SAVE_SUMMARY.md](../../docs/AUTO_SAVE_SUMMARY.md) - Position sync
