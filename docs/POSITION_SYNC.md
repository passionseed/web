# Position Sync System Documentation

## Overview

The Position Sync system provides efficient, batched position synchronization for journey projects and project milestones. Instead of writing to the database on every drag event (which would create excessive database load), this system collects position changes and syncs them in batches after a configurable delay.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Drags Node on Canvas                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Local State Updated Immediately                     │
│                  (ReactFlow handles this)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         onNodeDragStop → PositionSyncManager.markDirty()        │
│              (Marks node as needing sync)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Debounced Timer (10 seconds default)                │
│          Resets on each drag (last write wins)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           SyncManager Batches All Dirty Nodes                    │
│     Projects: [{id, x, y}, ...]                                  │
│     Milestones: [{id, x, y}, ...]                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Parallel RPC Calls to Supabase                      │
│    ├─ update_journey_projects_positions(items)                   │
│    └─ update_project_milestones_positions(items)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│        Database Updates All Positions in Bulk                    │
│        (updated_at automatically set by trigger)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database Layer (SQL)

**File**: `supabase/migrations/20251027000000_add_batch_position_sync.sql`

Two PostgreSQL RPC functions for batch updates:

#### `update_journey_projects_positions(items jsonb)`
- Updates position_x and position_y for multiple projects
- Input format: `[{"id": "uuid", "x": 123.45, "y": 678.90}, ...]`
- Enforces RLS: only updates user's own projects
- `updated_at` automatically updated by existing trigger

#### `update_project_milestones_positions(items jsonb)`
- Updates position_x and position_y for multiple milestones
- Input format: `[{"id": "uuid", "x": 123.45, "y": 678.90}, ...]`
- Enforces RLS: only updates milestones in user's projects
- `updated_at` automatically updated by existing trigger

### 2. Supabase Client Wrapper (TypeScript)

**File**: `lib/supabase/position-sync.ts`

Type-safe wrapper functions:

```typescript
import { batchUpdateProjectPositions, batchUpdateMilestonePositions } from '@/lib/supabase/position-sync';

// Update multiple projects
await batchUpdateProjectPositions([
  { id: "project-1", x: 100, y: 200 },
  { id: "project-2", x: 300, y: 400 }
]);

// Update multiple milestones
await batchUpdateMilestonePositions([
  { id: "milestone-1", x: 150, y: 250 },
  { id: "milestone-2", x: 350, y: 450 }
]);
```

### 3. PositionSyncManager (Singleton)

**File**: `lib/sync/PositionSyncManager.ts`

Core synchronization manager with the following features:

#### Key Methods

```typescript
import { getPositionSyncManager } from '@/lib/sync/PositionSyncManager';

const syncManager = getPositionSyncManager();

// Mark nodes as dirty (needs sync)
syncManager.markProjectDirty(projectId, x, y);
syncManager.markMilestoneDirty(milestoneId, x, y);

// Listen to sync status changes
const unsubscribe = syncManager.onStatusChange((event) => {
  console.log('Status:', event.status); // "idle" | "saving" | "saved" | "error"
  console.log('Message:', event.message);
});

// Force immediate sync (e.g., on component unmount)
await syncManager.flush();

// Get current status
const status = syncManager.getStatus();

// Get count of dirty items
const { projects, milestones } = syncManager.getDirtyCount();
```

#### Configuration

- **Debounce Interval**: 10 seconds (default)
- **Max Retries**: 3 attempts with exponential backoff
- **Retry Delays**: 1s, 2s, 4s

#### Sync Status States

- `idle` - No pending changes, system idle
- `saving` - Sync in progress
- `saved` - Sync completed successfully (auto-transitions to idle after 2s)
- `error` - Sync failed after max retries (auto-transitions to idle after 5s)

### 4. SyncStatusIndicator Component

**File**: `components/journey/SyncStatusIndicator.tsx`

Visual feedback component that displays:

- **Saving...** (blue, animated spinner) - During sync
- **All changes saved** (green, checkmark) - After successful sync
- **Failed to save changes** (red, alert icon) - On error

Auto-hides 2 seconds after successful sync or 5 seconds after error.

## Integration

### JourneyMapCanvas (Projects)

**File**: `components/journey/JourneyMapCanvas.tsx`

```typescript
// 1. Import dependencies
import { getPositionSyncManager, SyncStatus } from '@/lib/sync/PositionSyncManager';
import { SyncStatusIndicator } from './SyncStatusIndicator';

// 2. Initialize sync manager and state
const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
const [syncMessage, setSyncMessage] = useState<string | undefined>(undefined);
const syncManager = getPositionSyncManager();

// 3. Subscribe to status changes
useEffect(() => {
  const unsubscribe = syncManager.onStatusChange((event) => {
    setSyncStatus(event.status);
    setSyncMessage(event.message);
    if (event.status === "error") {
      toast.error(event.message || "Failed to save position changes");
    }
  });

  return () => {
    syncManager.flush(); // Flush on unmount
    unsubscribe();
  };
}, [syncManager]);

// 4. Update drag handler
const handleNodeDragStop = useCallback(
  (_event: any, node: Node) => {
    if (node.id === "user-center") return;
    syncManager.markProjectDirty(node.id, node.position.x, node.position.y);
  },
  [syncManager]
);

// 5. Add status indicator to UI
<SyncStatusIndicator status={syncStatus} message={syncMessage} />
```

### MilestoneMapView (Milestones)

**File**: `components/journey/MilestoneMapView.tsx`

Same integration pattern as JourneyMapCanvas, but using `markMilestoneDirty()`:

```typescript
const handleNodeDragStop = useCallback(
  (_event: any, node: Node) => {
    syncManager.markMilestoneDirty(node.id, node.position.x, node.position.y);
  },
  [syncManager]
);
```

## Behavior Details

### Debouncing

- Timer resets on every drag event (last write wins)
- If user drags multiple nodes within 10 seconds, only one sync occurs
- Example timeline:
  ```
  T+0s:  Drag node A   → Timer starts (10s)
  T+3s:  Drag node B   → Timer resets (10s from now)
  T+5s:  Drag node C   → Timer resets (10s from now)
  T+15s: → Sync triggered (all 3 nodes batched)
  ```

### Error Recovery

1. **First Failure**: Retry after 1 second
2. **Second Failure**: Retry after 2 seconds
3. **Third Failure**: Retry after 4 seconds
4. **Max Retries Exceeded**: Show error, transition to idle after 5s

Dirty nodes remain in queue even after error, so they'll be included in the next successful sync.

### Cleanup and Unmounting

When a component unmounts:
1. `syncManager.flush()` is called
2. All pending changes are synced immediately
3. Event listeners are unsubscribed
4. No data loss occurs

### Concurrent Syncs

If a sync is already in progress, subsequent sync requests are ignored until the current sync completes. This prevents race conditions.

## Performance Considerations

### Before (Per-Drag Write)
- **Drag 10 nodes**: 10 database writes
- **Network overhead**: 10 round trips
- **Database load**: 10 UPDATE queries
- **Total time**: ~500-1000ms (50-100ms per write)

### After (Batched Write)
- **Drag 10 nodes**: 1 database write (after debounce)
- **Network overhead**: 1 round trip
- **Database load**: 1 UPDATE query (bulk)
- **Total time**: ~50-100ms (single write)

**Improvement**: 90% reduction in database writes and network overhead.

## Security

### Row Level Security (RLS)

Both RPC functions enforce RLS:

**Projects**:
```sql
WHERE jp.user_id = auth.uid()
```

**Milestones**:
```sql
WHERE pm.project_id IN (
  SELECT id FROM journey_projects WHERE user_id = auth.uid()
)
```

Users can only update positions for their own records.

### SQL Injection Protection

Uses parameterized queries with type casting:
```sql
WHERE jp.id = (elem->>'id')::uuid
```

## Testing

### Manual Test Cases

1. **Single Node Drag**
   - Drag one node
   - Wait 10 seconds
   - Verify position is saved in database

2. **Multiple Node Rapid Drag**
   - Drag 5+ nodes rapidly within 10 seconds
   - Verify only one sync occurs (after 10s from last drag)
   - Verify all positions are saved correctly

3. **Component Unmount**
   - Drag a node
   - Navigate away before 10s debounce
   - Verify position is still saved (via flush)

4. **Network Failure**
   - Disable network
   - Drag a node
   - Re-enable network
   - Verify automatic retry succeeds

5. **Mixed Projects and Milestones**
   - Drag project nodes and milestone nodes
   - Verify both tables are updated correctly in parallel

### Database Verification

```sql
-- Check project positions
SELECT id, title, position_x, position_y, updated_at
FROM journey_projects
WHERE user_id = auth.uid()
ORDER BY updated_at DESC;

-- Check milestone positions
SELECT id, title, position_x, position_y, updated_at
FROM project_milestones
WHERE project_id IN (SELECT id FROM journey_projects WHERE user_id = auth.uid())
ORDER BY updated_at DESC;
```

## Troubleshooting

### Positions Not Saving

1. Check browser console for errors
2. Verify user is authenticated
3. Check RLS policies are not blocking updates
4. Verify migration was applied: `supabase db push --local`

### Sync Indicator Stuck on "Saving..."

1. Check network tab for failed RPC calls
2. Check for JavaScript errors in console
3. Verify Supabase connection is working
4. Check if sync manager is properly initialized

### Positions Reset After Refresh

1. Check if flush() is being called on unmount
2. Verify database actually contains updated positions
3. Check if positions are being loaded correctly on mount

## Future Enhancements

### Phase 2 (Optional)

1. **Local Caching with IndexedDB**
   - Cache positions locally for offline support
   - Sync when connection is restored

2. **Last Synced Timestamp**
   - Add `last_synced_at` in local state
   - Detect unsaved changes across sessions

3. **Analytics Events**
   - Track "Node Moved" events
   - Analyze user interaction patterns

4. **Optimistic UI Updates**
   - Update database record immediately in local cache
   - Roll back on sync failure

5. **Configurable Debounce**
   - Allow users to adjust debounce interval
   - Different intervals for different node types

## Changelog

### 2025-10-27 - Initial Release

- Created SQL migration with batch RPC functions
- Implemented PositionSyncManager singleton
- Added Supabase client wrapper functions
- Created SyncStatusIndicator component
- Integrated into JourneyMapCanvas and MilestoneMapView
- Wrote comprehensive documentation

## References

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [ReactFlow onNodeDragStop](https://reactflow.dev/api-reference/react-flow#onnodedragstop)
- [Debouncing in React](https://dmitripavlutin.com/react-throttle-debounce/)
