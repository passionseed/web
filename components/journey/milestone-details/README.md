# Milestone Details Inline Editing System

This directory contains components and hooks for inline editing of milestone details with auto-save functionality.

## Components

### InlineEditableTitle
Single-line input for editing milestone titles.

**Features:**
- Character limit: 200
- Required field validation
- Auto-save on blur
- Press Enter to save, Escape to cancel
- Visual feedback with loading indicator

**Usage:**
```tsx
import { InlineEditableTitle } from "@/components/journey/milestone-details/details";

<InlineEditableTitle
  milestone={milestone}
  onUpdate={() => refreshMilestones()}
/>
```

### InlineEditableDescription
Multi-line textarea for editing milestone descriptions.

**Features:**
- Character limit: 1000
- Optional field
- Auto-save on blur
- Escape to cancel
- Whitespace preserved in display

**Usage:**
```tsx
import { InlineEditableDescription } from "@/components/journey/milestone-details/details";

<InlineEditableDescription
  milestone={milestone}
  onUpdate={() => refreshMilestones()}
/>
```

### InlineEditableDetails
Large multi-line textarea for detailed notes.

**Features:**
- Character limit: 5000
- Optional field
- Auto-save on blur
- Markdown preview in view mode
- Escape to cancel

**Usage:**
```tsx
import { InlineEditableDetails } from "@/components/journey/milestone-details/details";

<InlineEditableDetails
  milestone={milestone}
  onUpdate={() => refreshMilestones()}
/>
```

## Hooks

### useInlineEdit
Generic hook for inline editing functionality.

**Features:**
- State management (isEditing, value, originalValue)
- Validation support
- Keyboard event handling (Enter, Escape)
- Auto-save callback
- Error handling

**Usage:**
```tsx
import { useInlineEdit } from "@/hooks/milestone-details";

const {
  isEditing,
  value,
  error,
  isSaving,
  startEdit,
  cancelEdit,
  setValue,
  saveEdit,
  handleKeyDown,
} = useInlineEdit({
  initialValue: "Current value",
  onSave: async (newValue) => {
    await updateMilestone(id, { field: newValue });
  },
  validate: (value) => {
    if (!value.trim()) return "Field is required";
    return null;
  },
  maxLength: 200,
});
```

### useMilestoneAutoSave
Hook for auto-saving milestone fields with debouncing.

**Features:**
- Automatic debouncing
- Status tracking (idle, saving, synced, error)
- Manual flush capability
- Cleanup on unmount

**Usage:**
```tsx
import { useMilestoneAutoSave } from "@/hooks/milestone-details";

const { saveField, status, flush, error } = useMilestoneAutoSave();

// Mark field for auto-save
saveField(milestoneId, 'title', 'New Title');

// Manually flush all pending changes
await flush();
```

## Common Components

### CharacterCounter
Displays character count with color coding.

**Features:**
- Green when under 70% of limit
- Yellow when 70-90% of limit
- Red when over 90% of limit
- Conditional rendering

**Usage:**
```tsx
import { CharacterCounter } from "@/components/journey/milestone-details/common";

<CharacterCounter
  current={value.length}
  max={200}
  show={isEditing}
/>
```

## Design Patterns

### Click-to-Edit Pattern
All components follow a consistent click-to-edit pattern:
1. View mode: Display value with hover effect
2. Click to enter edit mode
3. Edit mode: Show input/textarea with focus
4. Auto-save on blur or manual save with keyboard shortcuts
5. Visual feedback during save

### State Management
- Local state for edit mode
- Optimistic UI updates
- Error handling with rollback
- Loading indicators

### Keyboard Shortcuts
- **Enter**: Save (for single-line inputs only)
- **Escape**: Cancel editing
- **Blur**: Auto-save

### Styling
- Dark theme using slate colors
- Consistent spacing and sizing
- Smooth transitions
- Clear visual states (view, editing, saving, error)

## File Structure

```
components/journey/milestone-details/
├── common/
│   ├── CharacterCounter.tsx      # Character count display
│   └── index.ts                  # Common exports
├── details/
│   ├── InlineEditableTitle.tsx
│   ├── InlineEditableDescription.tsx
│   ├── InlineEditableDetails.tsx
│   └── index.ts                  # Details exports
└── README.md                     # This file

hooks/milestone-details/
├── useInlineEdit.ts              # Generic inline edit hook
├── useMilestoneAutoSave.ts       # Auto-save hook
└── index.ts                      # Hook exports
```

## Integration Example

```tsx
"use client";

import React from "react";
import { ProjectMilestone } from "@/types/journey";
import {
  InlineEditableTitle,
  InlineEditableDescription,
  InlineEditableDetails,
} from "@/components/journey/milestone-details/details";

interface MilestoneEditorProps {
  milestone: ProjectMilestone;
  onUpdate: () => void;
}

export function MilestoneEditor({ milestone, onUpdate }: MilestoneEditorProps) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">
          Title
        </label>
        <InlineEditableTitle milestone={milestone} onUpdate={onUpdate} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">
          Description
        </label>
        <InlineEditableDescription milestone={milestone} onUpdate={onUpdate} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">
          Details
        </label>
        <InlineEditableDetails milestone={milestone} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
```

## Testing

To test the components:
1. Click on a field to enter edit mode
2. Modify the value
3. Press Enter (for title) or click outside to save
4. Press Escape to cancel
5. Try exceeding character limits
6. Test with empty values
7. Verify auto-save behavior

## Future Enhancements

Potential improvements for Phase 3:
- Markdown editor with preview toggle for details
- Rich text formatting toolbar
- Checklist support in description
- Attachment support
- Collaborative editing indicators
- Undo/redo functionality
