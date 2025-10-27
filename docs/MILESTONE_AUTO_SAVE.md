# Milestone Auto-Save Infrastructure

Auto-save system for milestone field updates with debouncing, retry logic, and status indicators.

## Architecture Overview

The auto-save infrastructure consists of four main components:

1. **MilestoneSyncManager** - Core singleton manager for batched updates
2. **useMilestoneAutoSave** - React hook wrapper for easy component integration
3. **AutoSaveIndicator** - Visual feedback component
4. **milestoneStatusConfig** - Centralized status styling configuration

## Key Features

- **Debounced writes**: 2-second delay after last change
- **Batched updates**: Multiple field changes grouped per milestone
- **Retry logic**: Exponential backoff (1s, 2s, 4s) with max 3 retries
- **Status tracking**: idle → saving → saved/error
- **Auto-cleanup**: Flushes pending changes on component unmount
- **Type-safe**: Full TypeScript support

## Usage Examples

### Basic Integration

```typescript
import { useMilestoneAutoSave } from "@/hooks/milestone-details/useMilestoneAutoSave";
import { AutoSaveIndicator } from "@/components/journey/milestone-details/common/AutoSaveIndicator";

function MilestoneEditor({ milestoneId }: { milestoneId: string }) {
  const { saveField, status, flush } = useMilestoneAutoSave();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Auto-save after 2 seconds of inactivity
    saveField(milestoneId, "title", newTitle);
  };

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    saveField(milestoneId, "description", newDescription);
  };

  return (
    <div>
      {/* Status indicator in header */}
      <div className="flex items-center justify-between mb-4">
        <h2>Edit Milestone</h2>
        <AutoSaveIndicator status={status} />
      </div>

      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Title"
      />

      <textarea
        value={description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        placeholder="Description"
      />
    </div>
  );
}
```

### Manual Flush

```typescript
function MilestoneForm() {
  const { saveField, flush, status } = useMilestoneAutoSave();

  const handleExplicitSave = async () => {
    // Force immediate save without waiting for debounce
    await flush();
    console.log("All changes saved!");
  };

  return (
    <div>
      {/* Form fields... */}
      <button onClick={handleExplicitSave}>
        Save Now
      </button>
    </div>
  );
}
```

### Multiple Fields

```typescript
function MilestoneDetailsEditor({ milestone }: { milestone: ProjectMilestone }) {
  const { saveField, status } = useMilestoneAutoSave();

  const handleFieldChange = (field: keyof ProjectMilestone, value: any) => {
    // All changes batched and synced together
    saveField(milestone.id, field, value);
  };

  return (
    <div>
      <AutoSaveIndicator status={status} className="mb-4" />

      <input
        value={milestone.title}
        onChange={(e) => handleFieldChange("title", e.target.value)}
      />

      <textarea
        value={milestone.description || ""}
        onChange={(e) => handleFieldChange("description", e.target.value)}
      />

      <input
        value={milestone.details || ""}
        onChange={(e) => handleFieldChange("details", e.target.value)}
      />

      <input
        type="number"
        value={milestone.progress_percentage}
        onChange={(e) => handleFieldChange("progress_percentage", parseInt(e.target.value))}
      />
    </div>
  );
}
```

### Status Configuration Usage

```typescript
import { getMilestoneStatusConfig } from "@/components/journey/utils/milestoneStatusConfig";
import { Badge } from "@/components/ui/badge";

function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config = getMilestoneStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={config.style}>
      <Icon className={cn("w-4 h-4 mr-2", config.iconClassName)} />
      {config.label}
    </Badge>
  );
}
```

## Component API

### useMilestoneAutoSave()

```typescript
interface UseMilestoneAutoSaveReturn {
  saveField: (milestoneId: string, field: keyof ProjectMilestone, value: any) => void;
  status: SyncStatus; // "idle" | "saving" | "saved" | "error"
  flush: () => Promise<void>;
  error: Error | null;
}
```

### AutoSaveIndicator

```typescript
interface AutoSaveIndicatorProps {
  status: SyncStatus;
  message?: string;
  className?: string;
}
```

### getMilestoneStatusConfig()

```typescript
interface MilestoneStatusConfig {
  style: string; // Tailwind classes for badge
  icon: LucideIcon; // Icon component
  label: string; // Display label
  iconClassName?: string; // Icon-specific classes
}

function getMilestoneStatusConfig(status: MilestoneStatus): MilestoneStatusConfig;
```

## How It Works

### 1. Field Change Flow

```
User types → saveField() → Mark field dirty → Schedule debounced sync
                                                        ↓
                                              Wait 2 seconds
                                                        ↓
                                              Batch all dirty fields
                                                        ↓
                                              Call updateMilestone()
                                                        ↓
                                              Clear dirty fields
                                                        ↓
                                              Update status → UI feedback
```

### 2. Debouncing Strategy

- Each field change resets the 2-second timer
- Last write wins for the same field
- Multiple fields on same milestone batched together
- Different milestones synced in parallel

### 3. Error Handling

```
Sync fails → Retry with exponential backoff
                     ↓
            Retry 1: Wait 1 second
            Retry 2: Wait 2 seconds
            Retry 3: Wait 4 seconds
                     ↓
            Max retries → Show error → Auto-hide after 5s
```

### 4. Status Lifecycle

```
idle → (field change) → saving → (success) → saved → (2s) → idle
                               ↓
                           (error) → error → (5s) → idle
```

## Configuration

### Debounce Interval

Change in `MilestoneSyncManager.ts`:

```typescript
private readonly debounceInterval: number = 2000; // 2 seconds
```

### Max Retries

Change in `MilestoneSyncManager.ts`:

```typescript
private readonly maxRetries: number = 3;
```

### Auto-Hide Timers

Change in `AutoSaveIndicator.tsx`:

```typescript
// "Saved" state auto-hide
setTimeout(() => setVisible(false), 2000);

// "Error" state auto-hide
setTimeout(() => setVisible(false), 5000);
```

## Integration with MilestoneDetailsPanel

To integrate auto-save into the existing `MilestoneDetailsPanel`:

1. Import the hook at the top of the component
2. Replace direct `updateMilestone` calls with `saveField`
3. Add `AutoSaveIndicator` to the header
4. Remove manual save buttons (optional)

Example:

```typescript
// Add at top of MilestoneDetailsPanel
const { saveField, status, flush } = useMilestoneAutoSave();

// Replace this:
const handleTitleChange = async (newTitle: string) => {
  setEditTitle(newTitle);
  await updateMilestone(milestone.id, { title: newTitle });
};

// With this:
const handleTitleChange = (newTitle: string) => {
  setEditTitle(newTitle);
  saveField(milestone.id, "title", newTitle);
};

// Add to header:
<div className="flex items-center justify-between">
  <h2>Milestone Details</h2>
  <AutoSaveIndicator status={status} />
</div>
```

## Benefits Over Manual Save

### Before (Manual Save)
- User must click "Save" button
- Risk of losing changes
- Unclear when changes are saved
- Multiple buttons throughout UI
- Error handling per button

### After (Auto-Save)
- Automatic background saves
- Changes preserved automatically
- Clear visual feedback
- Cleaner UI without save buttons
- Centralized error handling

## Testing

### Test Scenarios

1. **Single field update**: Change one field, verify saved after 2s
2. **Rapid changes**: Type quickly, verify only final value saved
3. **Multiple fields**: Change title and description, verify batched
4. **Network error**: Simulate failure, verify retry logic
5. **Component unmount**: Navigate away, verify flush on cleanup
6. **Concurrent milestones**: Edit multiple milestones, verify independent syncs

### Manual Testing

```typescript
// Enable debug logging
console.log("Dirty count:", syncManager.getDirtyCount());
console.log("Current status:", syncManager.getStatus());
```

## Performance Considerations

- **Batching**: Multiple field changes grouped into single database call
- **Debouncing**: Prevents excessive database writes during rapid changes
- **Parallel syncs**: Different milestones synced concurrently
- **Minimal re-renders**: Status updates isolated to specific components

## Troubleshooting

### Changes not saving
- Check browser console for errors
- Verify milestone ID is correct
- Ensure user is authenticated
- Check network tab for failed requests

### Slow saves
- Check debounce interval (default 2s)
- Verify database connection
- Check for retry loops

### Status indicator stuck
- Check for JavaScript errors
- Verify component cleanup
- Reset singleton: `MilestoneSyncManager.getInstance().dispose()`

## Future Enhancements

- [ ] Offline support with local storage
- [ ] Conflict resolution for concurrent edits
- [ ] Real-time sync indicators for other users
- [ ] Undo/redo functionality
- [ ] Field-level validation before save
- [ ] Optimistic UI updates
