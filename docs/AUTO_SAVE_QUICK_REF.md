# Milestone Auto-Save - Quick Reference

## Quick Start (Copy & Paste)

### 1. Import
```typescript
import { useMilestoneAutoSave } from "@/hooks/milestone-details/useMilestoneAutoSave";
import { AutoSaveIndicator } from "@/components/journey/milestone-details/common/AutoSaveIndicator";
```

### 2. Initialize Hook
```typescript
const { saveField, status, flush } = useMilestoneAutoSave();
```

### 3. Save a Field
```typescript
// On any field change:
saveField(milestoneId, "title", newValue);
saveField(milestoneId, "description", newValue);
saveField(milestoneId, "details", newValue);
saveField(milestoneId, "progress_percentage", 75);
saveField(milestoneId, "status", "in_progress");
```

### 4. Show Status
```typescript
<AutoSaveIndicator status={status} />
```

### 5. Force Save (Optional)
```typescript
await flush(); // Saves immediately without waiting
```

## Common Patterns

### Text Input Auto-Save
```typescript
<input
  value={title}
  onChange={(e) => {
    setTitle(e.target.value);
    saveField(milestoneId, "title", e.target.value);
  }}
/>
```

### Textarea Auto-Save
```typescript
<textarea
  value={description}
  onChange={(e) => {
    setDescription(e.target.value);
    saveField(milestoneId, "description", e.target.value);
  }}
/>
```

### Slider Auto-Save
```typescript
<Slider
  value={[progress]}
  onValueChange={(value) => {
    setProgress(value[0]);
    saveField(milestoneId, "progress_percentage", value[0]);
  }}
/>
```

### Select/Dropdown Auto-Save
```typescript
<Select
  value={status}
  onValueChange={(newStatus) => {
    setStatus(newStatus);
    saveField(milestoneId, "status", newStatus);
  }}
>
  {/* options */}
</Select>
```

## Status Config Helper

### Get Status Style
```typescript
import { getMilestoneStatusConfig } from "@/components/journey/utils/milestoneStatusConfig";

const config = getMilestoneStatusConfig(milestone.status);
// config = { style, icon, label, iconClassName }

const Icon = config.icon;

<Badge className={config.style}>
  <Icon className={config.iconClassName} />
  {config.label}
</Badge>
```

## API Reference

### useMilestoneAutoSave()
```typescript
interface UseMilestoneAutoSaveReturn {
  saveField: (milestoneId: string, field: keyof ProjectMilestone, value: any) => void;
  status: "idle" | "saving" | "saved" | "error";
  flush: () => Promise<void>;
  error: Error | null;
}
```

### AutoSaveIndicator
```typescript
interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
  className?: string;
}
```

### getMilestoneStatusConfig()
```typescript
function getMilestoneStatusConfig(status: MilestoneStatus): {
  style: string;
  icon: LucideIcon;
  label: string;
  iconClassName?: string;
}
```

## Timing

- **Debounce**: 2 seconds after last change
- **Saved indicator**: Auto-hides after 2 seconds
- **Error indicator**: Auto-hides after 5 seconds
- **Retry delays**: 1s, 2s, 4s (exponential backoff)

## Status States

| Status | Icon | Meaning | Duration |
|--------|------|---------|----------|
| `idle` | - | No pending changes | Permanent |
| `saving` | Spinner | Saving to database | Until complete |
| `saved` | Checkmark | Successfully saved | 2 seconds |
| `error` | Alert | Save failed | 5 seconds |

## Complete Example

```typescript
"use client";

import { useState, useEffect } from "react";
import { useMilestoneAutoSave } from "@/hooks/milestone-details/useMilestoneAutoSave";
import { AutoSaveIndicator } from "@/components/journey/milestone-details/common/AutoSaveIndicator";
import { getMilestoneStatusConfig } from "@/components/journey/utils/milestoneStatusConfig";

interface MilestoneEditorProps {
  milestone: ProjectMilestone;
}

export function MilestoneEditor({ milestone }: MilestoneEditorProps) {
  const { saveField, status, flush } = useMilestoneAutoSave();

  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description || "");
  const [progress, setProgress] = useState(milestone.progress_percentage);

  const config = getMilestoneStatusConfig(milestone.status);
  const StatusIcon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header with status indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Edit Milestone</h2>
        <AutoSaveIndicator status={status} />
      </div>

      {/* Status badge */}
      <div>
        <Badge className={config.style}>
          <StatusIcon className={config.iconClassName} />
          {config.label}
        </Badge>
      </div>

      {/* Title input */}
      <div>
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveField(milestone.id, "title", e.target.value);
          }}
        />
      </div>

      {/* Description textarea */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            saveField(milestone.id, "description", e.target.value);
          }}
        />
      </div>

      {/* Progress slider */}
      <div>
        <Label>Progress: {progress}%</Label>
        <Slider
          value={[progress]}
          onValueChange={(value) => {
            setProgress(value[0]);
            saveField(milestone.id, "progress_percentage", value[0]);
          }}
          max={100}
          step={5}
        />
      </div>

      {/* Optional: Manual save button */}
      <Button
        onClick={async () => {
          await flush();
          console.log("All changes saved!");
        }}
      >
        Save Now
      </Button>
    </div>
  );
}
```

## Troubleshooting

### Changes not saving?
```typescript
// Check if hook is initialized
console.log("Status:", status);

// Check dirty count
import { getMilestoneSyncManager } from "@/lib/sync/MilestoneSyncManager";
console.log("Dirty:", getMilestoneSyncManager().getDirtyCount());

// Force save
await flush();
```

### Status stuck?
```typescript
// Reset the singleton
await getMilestoneSyncManager().dispose();
```

### Need custom debounce?
Edit `lib/sync/MilestoneSyncManager.ts`:
```typescript
private readonly debounceInterval: number = 2000; // Change this
```

## Tips

✅ **DO:**
- Use for text fields, textareas, sliders
- Show AutoSaveIndicator in visible location
- Let users know saves are automatic
- Test with slow network

❌ **DON'T:**
- Use for submit buttons (use flush instead)
- Call saveField in loops
- Forget to handle errors
- Skip testing component unmount

## Files

```
lib/sync/MilestoneSyncManager.ts       - Core sync logic
hooks/milestone-details/useMilestoneAutoSave.ts  - React hook
components/journey/milestone-details/common/AutoSaveIndicator.tsx  - UI
components/journey/utils/milestoneStatusConfig.ts  - Status styling
```

## Documentation

- `docs/MILESTONE_AUTO_SAVE.md` - Complete guide
- `docs/AUTO_SAVE_SUMMARY.md` - Implementation summary
- `docs/MILESTONE_AUTO_SAVE_INTEGRATION.md` - Integration guide
- `docs/AUTO_SAVE_QUICK_REF.md` - This file
