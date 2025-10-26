# MilestoneFormFields and useMilestoneForm Usage Examples

## Overview

This directory contains modular, reusable form components for milestone creation and editing, following best software architecture practices:

- **Small, focused components** (Single Responsibility Principle)
- **Fully typed with TypeScript**
- **Controlled inputs with proper props**
- **Consistent styling with dark theme**
- **Separation of UI and logic**

## Files

- `MilestoneFormFields.tsx` - Reusable UI components for form fields
- `useMilestoneForm.ts` - Custom hook encapsulating form logic

## Basic Usage Example

```typescript
import { useMilestoneForm } from "@/hooks/useMilestoneForm";
import {
  TitleField,
  DescriptionField,
  DetailsField,
  ProgressSlider,
  StatusSelector,
} from "@/components/journey/forms/MilestoneFormFields";
import { Button } from "@/components/ui/button";

function MilestoneEditDialog({
  projectId,
  milestone,
  existingMilestones,
  onSuccess
}) {
  const {
    formData,
    updateField,
    errors,
    isSubmitting,
    handleSubmit,
    isEditMode,
  } = useMilestoneForm({
    projectId,
    milestone,
    existingMilestones,
    onSuccess,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <TitleField
        value={formData.title}
        onChange={(value) => updateField("title", value)}
        error={errors.title}
        disabled={isSubmitting}
      />

      <DescriptionField
        value={formData.description}
        onChange={(value) => updateField("description", value)}
        disabled={isSubmitting}
      />

      <DetailsField
        value={formData.details}
        onChange={(value) => updateField("details", value)}
        disabled={isSubmitting}
      />

      <ProgressSlider
        value={formData.progress}
        onChange={(value) => updateField("progress", value)}
        disabled={isSubmitting}
      />

      <StatusSelector
        value={formData.status}
        onChange={(value) => updateField("status", value)}
        disabled={isSubmitting}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isEditMode ? "Update" : "Create"} Milestone
      </Button>
    </form>
  );
}
```

## Available Form Components

### TitleField

Required text input with character counter.

```typescript
<TitleField
  value={string}
  onChange={(value: string) => void}
  disabled={boolean}
  error={string}
/>
```

### DescriptionField

Optional multi-line text input with character counter (2000 char limit).

```typescript
<DescriptionField
  value={string}
  onChange={(value: string) => void}
  disabled={boolean}
/>
```

### DetailsField

Optional large text area for detailed notes (10,000 char limit).

```typescript
<DetailsField
  value={string}
  onChange={(value: string) => void}
  disabled={boolean}
/>
```

### ProgressSlider

Slider for setting milestone progress (0-100%, step 5%).

```typescript
<ProgressSlider
  value={number}
  onChange={(value: number) => void}
  disabled={boolean}
/>
```

### StatusSelector

Dropdown for milestone status selection.

```typescript
<StatusSelector
  value={MilestoneStatus}
  onChange={(value: MilestoneStatus) => void}
  disabled={boolean}
/>
```

Status options: `not_started`, `in_progress`, `completed`, `blocked`, `skipped`

## useMilestoneForm Hook

### Parameters

```typescript
{
  projectId: string;              // Required: Project ID
  milestone?: ProjectMilestone;   // Optional: For edit mode
  onSuccess?: () => void;         // Optional: Callback after successful submit
  existingMilestones?: ProjectMilestone[]; // Optional: For position calculation
}
```

### Return Values

```typescript
{
  formData: MilestoneFormData;    // Current form state
  updateField: (field, value) => void;  // Update individual field
  errors: Record<string, string>; // Validation errors
  isSubmitting: boolean;          // Submission state
  handleSubmit: () => Promise<void>; // Submit handler
  resetForm: () => void;          // Reset to initial state
  isEditMode: boolean;            // True if editing existing milestone
}
```

### Form Data Structure

```typescript
{
  title: string;
  description: string;
  details: string;
  progress: number;  // 0-100
  status: MilestoneStatus;
}
```

## Advanced Usage: Create vs Edit Mode

The hook automatically detects create vs edit mode:

```typescript
// Create new milestone
const { formData, handleSubmit } = useMilestoneForm({
  projectId: "abc123",
  onSuccess: () => refreshMilestones(),
  existingMilestones: allMilestones,
});

// Edit existing milestone
const { formData, handleSubmit } = useMilestoneForm({
  projectId: "abc123",
  milestone: existingMilestone,  // Edit mode activated
  onSuccess: () => refreshMilestones(),
});
```

## Features

### Automatic Validation

- Title required, max 500 characters
- Description max 2,000 characters
- Details max 10,000 characters
- Real-time error display

### Automatic Position Calculation

When creating new milestones, positions are calculated automatically by finding the rightmost existing milestone and placing the new one 250 units to the right.

### Toast Notifications

Success and error toasts are handled automatically:
- Create: "Milestone created successfully"
- Update: "Milestone updated successfully"
- Error: Appropriate error messages

### Form Reset

After successful creation, the form automatically resets to initial state. Edit mode retains values after update.

## Integration with Supabase

The hook uses these functions from `/lib/supabase/journey.ts`:
- `createMilestone(projectId, data)`
- `updateMilestone(milestoneId, data)`

Both functions are type-safe and handle authentication automatically.

## Styling

All components use consistent dark theme styling:
- Background: `bg-slate-900`
- Borders: `border-slate-700`
- Text: `text-slate-100`
- Labels: `text-slate-200`
- Helpers: `text-slate-500`
- Errors: `text-red-400`

## Benefits of This Architecture

1. **Reusability** - Form fields can be used in any dialog or form
2. **Maintainability** - Logic separated from UI
3. **Testability** - Each component and hook can be tested independently
4. **Consistency** - Same styling and behavior across the app
5. **Type Safety** - Full TypeScript support throughout
6. **Developer Experience** - Clear APIs, easy to understand and use
