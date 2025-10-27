# Integrating Auto-Save into MilestoneDetailsPanel

This guide shows how to add auto-save functionality to the existing `MilestoneDetailsPanel.tsx` component.

## Step-by-Step Integration

### Step 1: Add Imports

Add these imports at the top of `MilestoneDetailsPanel.tsx`:

```typescript
// Add these new imports
import { useMilestoneAutoSave } from "@/hooks/milestone-details/useMilestoneAutoSave";
import { AutoSaveIndicator } from "@/components/journey/milestone-details/common/AutoSaveIndicator";
import { getMilestoneStatusConfig } from "@/components/journey/utils/milestoneStatusConfig";
```

### Step 2: Initialize the Hook

Inside the `MilestoneDetailsPanel` component, add the hook:

```typescript
export function MilestoneDetailsPanel({
  milestone,
  projectId,
  allMilestones,
  onMilestoneUpdated,
}: MilestoneDetailsPanelProps) {
  // Add this line after existing state declarations
  const { saveField, status: autoSaveStatus, flush } = useMilestoneAutoSave();

  // ... rest of existing code
```

### Step 3: Replace Manual Save Logic

Find the existing field change handlers and update them:

#### Title Changes

**Before:**
```typescript
const handleTitleChange = async (newTitle: string) => {
  setEditTitle(newTitle);
  // Manual save logic
  await updateMilestone(milestone.id, { title: newTitle });
  toast.success("Title updated");
};
```

**After:**
```typescript
const handleTitleChange = (newTitle: string) => {
  setEditTitle(newTitle);
  // Auto-save with debouncing
  if (milestone) {
    saveField(milestone.id, "title", newTitle);
  }
};
```

#### Description Changes

**Before:**
```typescript
const handleDescriptionChange = async (newDescription: string) => {
  setEditDescription(newDescription);
  await updateMilestone(milestone.id, { description: newDescription });
  toast.success("Description updated");
};
```

**After:**
```typescript
const handleDescriptionChange = (newDescription: string) => {
  setEditDescription(newDescription);
  if (milestone) {
    saveField(milestone.id, "description", newDescription);
  }
};
```

#### Details Changes

**Before:**
```typescript
const handleDetailsChange = async (newDetails: string) => {
  setEditDetails(newDetails);
  await updateMilestone(milestone.id, { details: newDetails });
  toast.success("Details updated");
};
```

**After:**
```typescript
const handleDetailsChange = (newDetails: string) => {
  setEditDetails(newDetails);
  if (milestone) {
    saveField(milestone.id, "details", newDetails);
  }
};
```

### Step 4: Update Progress Handler

The progress slider needs special handling:

**Replace:**
```typescript
const handleProgressChange = useCallback(
  async (value: number[]) => {
    if (!milestone) return;

    const newProgress = value[0];
    setEditProgress(newProgress);

    try {
      await updateMilestone(milestone.id, {
        progress_percentage: newProgress,
        status: newProgress === 100 ? "completed" : newProgress > 0 ? "in_progress" : "not_started",
      });
      onMilestoneUpdated();
      toast.success("Progress updated");
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  },
  [milestone, onMilestoneUpdated]
);
```

**With:**
```typescript
const handleProgressChange = useCallback(
  (value: number[]) => {
    if (!milestone) return;

    const newProgress = value[0];
    setEditProgress(newProgress);

    // Auto-save progress and auto-update status
    saveField(milestone.id, "progress_percentage", newProgress);

    const newStatus = newProgress === 100
      ? "completed"
      : newProgress > 0
        ? "in_progress"
        : "not_started";

    saveField(milestone.id, "status", newStatus);
  },
  [milestone, saveField]
);
```

### Step 5: Update Status Handler

**Replace:**
```typescript
const handleStatusChange = useCallback(
  async (newStatus: MilestoneStatus) => {
    if (!milestone) return;

    setEditStatus(newStatus);

    try {
      await updateMilestone(milestone.id, {
        status: newStatus,
      });
      onMilestoneUpdated();
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  },
  [milestone, onMilestoneUpdated]
);
```

**With:**
```typescript
const handleStatusChange = useCallback(
  (newStatus: MilestoneStatus) => {
    if (!milestone) return;

    setEditStatus(newStatus);
    saveField(milestone.id, "status", newStatus);
  },
  [milestone, saveField]
);
```

### Step 6: Add Auto-Save Indicator to Header

Update the header section to show save status:

**Find this section:**
```typescript
{/* Milestone Header */}
<div className="flex items-start gap-2 mb-3">
  <StatusIcon className="w-5 h-5 text-blue-400 mt-1" />
  <div className="flex-1">
    <h2 className="text-lg font-bold text-slate-100 mb-2">
      {milestone.title}
    </h2>
    <Badge className={statusStyle}>{milestone.status}</Badge>
  </div>
</div>
```

**Replace with:**
```typescript
{/* Milestone Header */}
<div className="flex items-start gap-2 mb-3">
  <StatusIcon className="w-5 h-5 text-blue-400 mt-1" />
  <div className="flex-1">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-lg font-bold text-slate-100">
        {milestone.title}
      </h2>
      {/* Auto-save indicator */}
      <AutoSaveIndicator status={autoSaveStatus} />
    </div>
    <Badge className={statusStyle}>{milestone.status}</Badge>
  </div>
</div>
```

### Step 7: Optional - Remove Manual Save Button

In the "Edit" tab, you can now remove or keep the manual save button:

**Option A: Remove the button entirely** (recommended)
```typescript
{/* Remove this entire section */}
<Button
  onClick={handleSaveDetails}
  disabled={isSaving || !editTitle.trim()}
  className="w-full"
>
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    <>
      <Save className="w-4 h-4 mr-2" />
      Save Changes
    </>
  )}
</Button>
```

**Option B: Keep as "Save Now" button**
```typescript
<Button
  onClick={async () => {
    await flush(); // Force immediate save
    onMilestoneUpdated(); // Refresh UI
    toast.success("All changes saved");
  }}
  className="w-full"
>
  <Save className="w-4 h-4 mr-2" />
  Save Now
</Button>
```

### Step 8: Add Flush on Tab Change (Optional)

If you want to ensure changes are saved when switching tabs:

```typescript
const handleTabChange = async (newTab: string) => {
  // Flush pending changes before switching
  await flush();
};

// Update Tabs component
<Tabs defaultValue="details" onValueChange={handleTabChange}>
```

### Step 9: Simplify the handleSaveDetails Function

Since individual fields now auto-save, simplify or remove this function:

```typescript
// Option 1: Remove entirely if not needed

// Option 2: Keep for explicit save
const handleSaveDetails = useCallback(async () => {
  await flush();
  onMilestoneUpdated();
  toast.success("Milestone updated");
}, [flush, onMilestoneUpdated]);
```

### Step 10: Use Status Config for Badge

Replace the inline status styling with the config utility:

**Replace:**
```typescript
const statusStyle = {
  not_started: "bg-slate-700 text-slate-200",
  in_progress: "bg-blue-700 text-blue-200",
  completed: "bg-green-700 text-green-200",
  blocked: "bg-red-700 text-red-200",
  skipped: "bg-yellow-700 text-yellow-200",
}[milestone.status] || "bg-slate-700 text-slate-200";

const StatusIcon = {
  completed: CheckCircle2,
  in_progress: Clock,
  blocked: AlertCircle,
  skipped: AlertCircle,
  not_started: Circle,
}[milestone.status] || Circle;
```

**With:**
```typescript
const statusConfig = getMilestoneStatusConfig(milestone.status);
const StatusIcon = statusConfig.icon;
```

**And update the Badge:**
```typescript
<Badge className={statusConfig.style}>
  {statusConfig.label}
</Badge>
```

## Complete Integration Summary

### Changes Made:
1. ✅ Added `useMilestoneAutoSave` hook
2. ✅ Replaced async handlers with sync handlers
3. ✅ Added `AutoSaveIndicator` to header
4. ✅ Removed/updated manual save button
5. ✅ Simplified save logic throughout
6. ✅ Used `getMilestoneStatusConfig` for consistency

### Benefits:
- ✅ No more manual "Save" button clicks
- ✅ Changes saved automatically after 2 seconds
- ✅ Clear visual feedback during save
- ✅ No data loss on navigation
- ✅ Cleaner, simpler code
- ✅ Better user experience

### Testing Checklist:
- [ ] Edit title - verify saves after 2 seconds
- [ ] Edit description - verify saves automatically
- [ ] Edit details - verify saves automatically
- [ ] Move progress slider - verify saves automatically
- [ ] Change status dropdown - verify saves immediately
- [ ] Switch tabs - verify no data loss
- [ ] Navigate away - verify changes flushed
- [ ] Check console for errors
- [ ] Verify save indicator appears/disappears
- [ ] Test with slow network (throttle in DevTools)

## Gradual Migration Strategy

You can adopt auto-save gradually:

### Phase 1: Add Infrastructure (Non-Breaking)
- Keep all existing code working
- Add auto-save alongside manual saves
- Test in development

### Phase 2: Selective Adoption
- Start with "Details" tab (title, description)
- Keep manual save for now
- Collect user feedback

### Phase 3: Full Migration
- Replace all manual saves
- Remove save buttons
- Update documentation

### Phase 4: Optimization
- Adjust debounce timing based on usage
- Add analytics
- Monitor performance

## Rollback Plan

If issues arise, you can easily rollback:

1. Remove `useMilestoneAutoSave` hook call
2. Restore original async handlers
3. Keep manual save buttons
4. No database changes needed

The infrastructure remains available for future use.

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify milestone ID is valid
3. Test with network throttling
4. Review `MILESTONE_AUTO_SAVE.md` for troubleshooting
5. Check sync manager status: `MilestoneSyncManager.getInstance().getStatus()`
