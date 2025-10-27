# Project Path Integration - Summary

This document summarizes the integration of project path rendering into the Journey Map Canvas.

## Files Created

### 1. `/hooks/use-project-paths.ts`
A custom React hook for managing project path state and operations.

**Features:**
- Load all project paths on mount
- Create new project paths with optimistic updates
- Delete project paths with rollback on error
- Update path types with optimistic updates
- Error handling with toast notifications

**Key Functions:**
```typescript
loadPaths() // Load all paths from database
createPath(sourceId, destId, pathType) // Create new connection
deletePath(pathId) // Remove connection
updatePathType(pathId, newType) // Change connection type
```

## Files Modified

### 2. `/components/journey/JourneyMapCanvas.tsx`
Main canvas component updated to integrate project paths.

**Changes:**
- Import `useProjectPaths` hook
- Call `loadPaths()` on component mount
- Add connection mode state (`isProjectConnectMode`)
- Pass project paths to `buildJourneyMap()` function
- Pass connection handlers to `JourneyMapCanvasView`
- Add `handleProjectPathCreated` callback to refresh paths

**Key Additions:**
```typescript
const { paths, loadPaths, createPath, deletePath, updatePathType } = useProjectPaths();
const [isProjectConnectMode, setIsProjectConnectMode] = React.useState(false);

// Load paths on mount
React.useEffect(() => {
  loadPaths();
}, [loadPaths]);
```

### 3. `/components/journey/JourneyMapCanvasView.tsx`
ReactFlow canvas view updated to register custom edge type.

**Changes:**
- Import `ProjectFloatingEdge` component
- Register `projectLink` edge type in `edgeTypes` object
- Update interface to accept connection mode props
- Already includes connection mode UI with toggle button
- Includes path type selection dialog

**Edge Type Registration:**
```typescript
const edgeTypes = {
  mainQuest: MainQuestFloatingPath,
  northStar: NorthStarFloatingLink,
  projectLink: ProjectFloatingEdge, // NEW
};
```

### 4. `/components/journey/utils/journeyMapBuilder.ts`
Map builder utility updated to create project path edges.

**Changes:**
- Accept optional `projectPaths` parameter
- Import `getProjectPathStyle` utility
- Add `createProjectPathEdge()` function
- Build edges from project paths array

**Edge Creation:**
```typescript
function createProjectPathEdge(path: ProjectPath): Edge {
  const pathStyle = getProjectPathStyle(path.path_type);

  return {
    id: path.id,
    source: path.source_project_id,
    target: path.destination_project_id,
    type: "projectLink",
    animated: pathStyle.animated,
    style: {
      stroke: pathStyle.stroke,
      strokeWidth: pathStyle.strokeWidth,
      strokeDasharray: pathStyle.strokeDasharray,
    },
    markerEnd: {
      type: pathStyle.markerEnd.type,
      color: pathStyle.markerEnd.color,
    },
    data: {
      pathType: path.path_type,
      pathId: path.id,
    },
  };
}
```

## Existing Files Used

### `/components/journey/ProjectFloatingEdge.tsx`
Custom edge component for rendering project paths.

**Features:**
- Renders bezier paths between project nodes
- Applies path-type-specific styling
- Shows animated dashes for "leads_to" type
- Displays label badge on selection
- Provides invisible interaction area for easier selection

### `/components/journey/utils/projectPathStyles.ts`
Styling configuration for different path types.

**Path Types:**
1. **Dependency** (Blue, solid, directional)
   - One project depends on another

2. **Relates To** (Purple, dashed)
   - Projects share common themes

3. **Leads To** (Green, animated)
   - Natural progression between projects

### `/lib/supabase/journey.ts`
Database operations for project paths.

**Functions Used:**
- `getAllProjectPaths()` - Fetch all paths for user
- `createProjectPath(source, dest, type)` - Create new path
- `deleteProjectPath(pathId)` - Remove path
- `updateProjectPathType(pathId, newType)` - Change path type

## How It Works

### 1. Component Mount
```
JourneyMapCanvas loads
  ↓
useProjectPaths() hook initializes
  ↓
loadPaths() fetches from database
  ↓
Paths stored in component state
```

### 2. Building the Map
```
buildJourneyMap() called with paths
  ↓
Creates nodes for projects
  ↓
Creates standard edges (north star, main quest)
  ↓
Iterates through projectPaths array
  ↓
Creates projectLink edges with styling
  ↓
Returns complete nodes + edges
```

### 3. Creating Connections
```
User clicks "Link Projects" button
  ↓
Connection mode activated
  ↓
User drags from source to target project
  ↓
Path type dialog opens
  ↓
User selects type (dependency/relates_to/leads_to)
  ↓
createProjectPath() called
  ↓
Optimistic update in UI
  ↓
Database insert
  ↓
loadPaths() refreshes data
```

### 4. Edge Rendering
```
ReactFlow receives edges array
  ↓
Finds edge with type="projectLink"
  ↓
Looks up ProjectFloatingEdge component
  ↓
Component renders with path data
  ↓
Applies styling based on path_type
  ↓
Displays with animation if needed
```

## User Experience

### Viewing Connections
- Project paths render automatically on map load
- Different colors/styles indicate relationship type
- Hover shows connection details
- Selection highlights the path

### Creating Connections
1. Click "Link Projects" button (top-right)
2. Drag from one project node to another
3. Select connection type from dialog
4. Connection appears immediately

### Managing Connections
- Click edge to select it
- Right-click for context menu (future)
- Delete or change type options (future)

## Data Flow

```
Database (Supabase)
  ↓
getAllProjectPaths()
  ↓
useProjectPaths hook
  ↓
JourneyMapCanvas component
  ↓
buildJourneyMap() utility
  ↓
JourneyMapCanvasView component
  ↓
ReactFlow rendering
  ↓
ProjectFloatingEdge component
  ↓
Visual representation
```

## Future Enhancements

### Edge Context Menu (Planned)
```typescript
const onEdgeContextMenu = useCallback((event, edge) => {
  event.preventDefault();
  if (edge.type === "projectLink") {
    // Show menu with:
    // - Change Type
    // - Delete Link
  }
}, []);
```

### Path Deletion UI
- Right-click edge → Delete option
- Calls `deletePath(pathId)`
- Optimistic UI update

### Path Type Change UI
- Right-click edge → Change Type submenu
- Calls `updatePathType(pathId, newType)`
- Visual update with new styling

## Technical Notes

### Optimistic Updates
All mutation operations use optimistic updates:
- UI updates immediately
- Database operation runs in background
- Rollback on error
- Better perceived performance

### Edge Styling
Styles defined in `projectPathStyles.ts`:
- Centralized configuration
- Easy to modify colors/patterns
- Consistent across app

### Type Safety
Full TypeScript support:
- `ProjectPath` interface from types
- Proper typing on all functions
- IDE autocomplete support

## Testing Checklist

- [x] Paths load on component mount
- [x] Edge type registered correctly
- [x] Edges render with correct styling
- [x] Connection mode toggles properly
- [ ] Path creation works end-to-end
- [ ] Path deletion works
- [ ] Path type updates work
- [ ] Optimistic updates rollback on error
- [ ] Error messages display correctly
