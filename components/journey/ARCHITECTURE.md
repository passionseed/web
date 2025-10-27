# Journey Map Architecture Diagram

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    JourneyMapCanvas (Main)                      │
│                   - Orchestrates everything                     │
│                   - Minimal logic, mostly wiring                │
└───────────┬─────────────────────────────────────────────────────┘
            │
   ┌────────┴────────┐
   │  ReactFlowProvider │
   └────────┬────────┘
            │
┌───────────┴──────────────────────────────────────────────────────┐
│                 JourneyMapCanvasInner                            │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐       │
│  │   Data Hook  │  │  State Hook   │  │   Sync Hook    │       │
│  │ useJourney   │  │ useJourneyMap │  │ usePosition    │       │
│  │  Projects    │  │    State      │  │     Sync       │       │
│  └──────────────┘  └───────────────┘  └────────────────┘       │
│         │                  │                    │                │
│         ▼                  ▼                    ▼                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │            Computed Values (useMemo)                 │       │
│  │  • mapData (from buildJourneyMap)                    │       │
│  │  • journeyStats (from calculateJourneyStats)         │       │
│  │  • northStarProjects (from extractNorthStarOptions)  │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              ▼                         ▼                        │
│   ┌──────────────────┐      ┌──────────────────┐              │
│   │ Left Panel       │      │ Right Panel      │              │
│   │ - Canvas View    │      │ - Details Panel  │              │
│   └──────────────────┘      └──────────────────┘              │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   Database   │
│  (Supabase)  │
└──────┬───────┘
       │
       │ getJourneyProjects()
       ▼
┌──────────────────────┐
│ useJourneyProjects   │ ◄─── Data Layer
│ - Loads projects     │
│ - Handles errors     │
│ - Manages loading    │
└──────┬───────────────┘
       │
       │ projects[]
       ▼
┌──────────────────────┐
│ buildJourneyMap()    │ ◄─── Transformation Layer
│ - Creates nodes      │
│ - Creates edges      │
│ - Positions items    │
└──────┬───────────────┘
       │
       │ { nodes, edges }
       ▼
┌──────────────────────┐
│ JourneyMapCanvasView │ ◄─── Presentation Layer
│ - ReactFlow          │
│ - Visual rendering   │
└──────────────────────┘
```

## Hook Responsibilities

```
┌─────────────────────────────────────────────────────┐
│          useJourneyProjects                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ • Fetches project data from Supabase        │   │
│  │ • Manages loading & error states            │   │
│  │ • Provides refresh function                 │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         useJourneyMapState                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ • Selection state (which project selected)  │   │
│  │ • View mode (overview vs milestone)         │   │
│  │ • Dialog visibility (create, edit)          │   │
│  │ • Panel state (minimized, expanded)         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           usePositionSync                           │
│  ┌─────────────────────────────────────────────┐   │
│  │ • Tracks node position changes              │   │
│  │ • Batches updates to database               │   │
│  │ • Shows sync status to user                 │   │
│  │ • Auto-flushes on unmount                   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Component Breakdown

```
JourneyMapCanvas
├── JourneyMapCanvasView
│   ├── JourneyActionBar
│   │   ├── Stats Display
│   │   └── Create Button
│   ├── ReactFlow Canvas
│   │   ├── Background
│   │   ├── MiniMap
│   │   ├── Controls
│   │   └── Nodes & Edges
│   ├── NavigationGuide
│   │   ├── Stats Grid
│   │   ├── Progress Bar
│   │   └── Controls Guide
│   └── SyncStatusIndicator
├── ProjectDetailsPanel (if selected)
├── MainQuestPanel (if not selected)
├── CreateProjectDialog
└── EditProjectDialog
```

## Utility Function Organization

```
┌────────────────────────────────────────────────┐
│      utils/journeyCalculations.ts              │
│  ┌──────────────────────────────────────────┐ │
│  │ Pure Calculation Functions               │ │
│  │                                          │ │
│  │ calculateOverallProgress()               │ │
│  │ calculateJourneyStats()                  │ │
│  │ categorizeProjects()                     │ │
│  │ extractNorthStarOptions()                │ │
│  │ checkRecentActivity()                    │ │
│  │ calculateCircularPosition()              │ │
│  │ getNodePosition()                        │ │
│  │ countLinkedProjects()                    │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
                     ▲
                     │ uses
                     │
┌────────────────────────────────────────────────┐
│       utils/journeyMapBuilder.ts               │
│  ┌──────────────────────────────────────────┐ │
│  │ Map Construction Functions               │ │
│  │                                          │ │
│  │ buildJourneyMap()                        │ │
│  │ ├─ createUserCenterNode()                │ │
│  │ ├─ createNorthStarNode()                 │ │
│  │ ├─ createShortTermNode()                 │ │
│  │ ├─ createNorthStarEdge()                 │ │
│  │ └─ createProjectToUserEdge()             │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## State Management Pattern

```
┌─────────────────────────────────────────────┐
│         Server State (Async)                │
│  ┌─────────────────────────────────────┐   │
│  │ useJourneyProjects                  │   │
│  │ - projects[]                        │   │
│  │ - isLoading                         │   │
│  │ - error                             │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     │ feeds into
                     ▼
┌─────────────────────────────────────────────┐
│      Derived State (Computed)               │
│  ┌─────────────────────────────────────┐   │
│  │ useMemo hooks                       │   │
│  │ - mapData                           │   │
│  │ - journeyStats                      │   │
│  │ - northStarProjects                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     │ combined with
                     ▼
┌─────────────────────────────────────────────┐
│           UI State (Local)                  │
│  ┌─────────────────────────────────────┐   │
│  │ useJourneyMapState                  │   │
│  │ - selectedProjectId                 │   │
│  │ - viewMode                          │   │
│  │ - dialog states                     │   │
│  │ - panel states                      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     │ drives
                     ▼
┌─────────────────────────────────────────────┐
│              Rendering                      │
│  ┌─────────────────────────────────────┐   │
│  │ React Components                    │   │
│  │ - JourneyMapCanvasView              │   │
│  │ - Panels                            │   │
│  │ - Dialogs                           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Constants Organization

```
constants/journeyMapConfig.ts
├── PANEL_SIZES           # ResizablePanel configuration
├── NODE_LAYOUT           # Node positioning radii
├── FLOW_CONFIG           # ReactFlow settings
├── BACKGROUND_CONFIG     # Canvas background
├── MINIMAP_COLORS        # MiniMap node colors
├── RECENT_ACTIVITY_DAYS  # Activity threshold
└── VIEW_MODES            # Enum for view states
```

## Testing Layers

```
┌────────────────────────────────────────────┐
│           Unit Tests                       │
│  ┌──────────────────────────────────────┐ │
│  │ utils/journeyCalculations.ts         │ │
│  │ - Pure functions                     │ │
│  │ - Easy to test                       │ │
│  │ - No mocking needed                  │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│          Hook Tests                        │
│  ┌──────────────────────────────────────┐ │
│  │ use-journey-projects.ts              │ │
│  │ use-journey-map-state.ts             │ │
│  │ use-position-sync.ts                 │ │
│  │ - renderHook from testing library    │ │
│  │ - Act for state updates              │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│       Component Tests                      │
│  ┌──────────────────────────────────────┐ │
│  │ JourneyActionBar.tsx                 │ │
│  │ NavigationGuide.tsx                  │ │
│  │ JourneyMapCanvasView.tsx             │ │
│  │ - React Testing Library              │ │
│  │ - Mock hooks as needed               │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│      Integration Tests                     │
│  ┌──────────────────────────────────────┐ │
│  │ JourneyMapCanvas.tsx (full)          │ │
│  │ - Mock data layer                    │ │
│  │ - Test user interactions             │ │
│  │ - Test state transitions             │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

**Principle**: Data flows down, events flow up  
**Pattern**: Container/Presenter (Smart/Dumb Components)  
**Architecture**: Hooks for logic, Components for UI
