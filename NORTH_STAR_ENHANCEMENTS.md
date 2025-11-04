# North Star Wizard Enhancements - Implementation Guide

## Summary of Changes

This document outlines all enhancements to the North Star creation wizard as per user requirements.

## Files Created

1. `/constants/life-aspects.ts` - Life aspect framework (8 categories) ✅
2. `/lib/ai/north-star-enhancer.ts` - AI enhancement functions using Gemini API ✅

## Files Modified

1. `/components/ui/star-generator.tsx` - Renamed "Core Size" → "Star Size" ✅
2. `/components/journey/CreateNorthStarDialog.tsx` - Major enhancements (IN PROGRESS)

## Key Changes to CreateNorthStarDialog.tsx

### 1. Enhanced Imports ✅

```typescript
import { LIFE_ASPECTS } from "@/constants/life-aspects";
import {
  enhanceVision,
  generateMilestones,
} from "@/lib/ai/north-star-enhancer";
import { addMonths, format } from "date-fns";
import { Sparkles, Calendar } from "lucide-react";

interface SMARTMilestone {
  title: string;
  startDate: string;
  dueDate: string;
  measurable: string;
}
```

### 2. Updated State ✅

```typescript
const [formData, setFormData] = useState({
  visionQuestion: "",
  milestones: [] as SMARTMilestone[], // Changed from string[]
  lifeAspects: [] as string[], // NEW
  sdgGoals: [] as number[],
  careerPath: "",
  starConfig: createDefaultStarConfig(),
  northStarColor: "golden",
  title: "",
});
const [aiUsed, setAiUsed] = useState(false);
const [isAiLoading, setIsAiLoading] = useState(false);
const [showSMARTDetails, setShowSMARTDetails] = useState(false);
const [editingMilestone, setEditingMilestone] = useState<SMARTMilestone | null>(
  null
);
```

### 3. Translations to Add

Add to both `en` and `th` objects:

```typescript
// Step 1 AI Enhancement
aiEnhance: "✨ Enhance with AI",
aiEnhancing: "Enhancing...",
aiEnhanced: "✓ AI Enhanced",
aiError: "AI enhancement failed",
aiLimitReached: "AI enhancement already used",

// Step 2 SMART Milestones
smartMode: "Add SMART Details",
simpleMode: "Simple Mode",
startDate: "Start Date",
dueDate: "Due Date",
measurableGoal: "How will you measure success?",
timelineView: "Timeline View",
generating: "Generating...",
aiGenerate: "✨ Generate Milestones with AI",

// Step 3 Life Aspects
lifeAspectsTitle: "🌈 Life Aspects",
lifeAspectsSubtitle: "Select the areas of life this North Star impacts",
sdgForBusiness: "For Social Impact & Business Projects",
aspectsSelected: "Selected Aspects",
```

### 4. AI Enhancement Handlers

```typescript
// Add after handleSubmit function
const handleEnhanceVision = async () => {
  if (aiUsed) {
    toast.error(t.aiLimitReached);
    return;
  }

  if (!formData.visionQuestion.trim()) {
    toast.error("Please write your vision first");
    return;
  }

  setIsAiLoading(true);
  try {
    const result = await enhanceVision(formData.visionQuestion, language);
    if (result.success && result.data) {
      setFormData((prev) => ({
        ...prev,
        visionQuestion: result.data as string,
      }));
      setAiUsed(true);
      toast.success(t.aiEnhanced);
    } else {
      toast.error(result.error || t.aiError);
    }
  } catch (error) {
    toast.error(t.aiError);
  } finally {
    setIsAiLoading(false);
  }
};

const handleGenerateMilestones = async () => {
  if (aiUsed) {
    toast.error(t.aiLimitReached);
    return;
  }

  if (!formData.visionQuestion.trim()) {
    toast.error("Please complete your vision first");
    return;
  }

  setIsAiLoading(true);
  try {
    const result = await generateMilestones(formData.visionQuestion, language);
    if (result.success && result.data) {
      const milestones = result.data as string[];
      const today = new Date();

      const smartMilestones: SMARTMilestone[] = milestones.map(
        (title, index) => ({
          title,
          startDate: format(addMonths(today, index * 6), "yyyy-MM-dd"),
          dueDate: format(addMonths(today, (index + 1) * 6), "yyyy-MM-dd"),
          measurable: "",
        })
      );

      setFormData((prev) => ({ ...prev, milestones: smartMilestones }));
      setAiUsed(true);
      toast.success(`Generated ${milestones.length} milestones!`);
    } else {
      toast.error(result.error || t.aiError);
    }
  } catch (error) {
    toast.error(t.aiError);
  } finally {
    setIsAiLoading(false);
  }
};
```

### 5. Step 1 UI Changes (Add AI Enhancement Button)

In Step 1 after the Textarea:

```typescript
<div className="flex justify-end mt-2">
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleEnhanceVision}
    disabled={isAiLoading || aiUsed || !formData.visionQuestion.trim()}
    className="gap-2"
  >
    {isAiLoading ? (
      <><Loader2 className="w-4 h-4 animate-spin" /> {t.aiEnhancing}</>
    ) : aiUsed ? (
      <><Check className="w-4 h-4" /> {t.aiEnhanced}</>
    ) : (
      <><Sparkles className="w-4 h-4" /> {t.aiEnhance}</>
    )}
  </Button>
</div>
```

### 6. Step 2 Complete Rewrite (SMART Milestones)

Replace milestone rendering with:

- Simple mode: just title + dates
- SMART mode: title + dates + measurable field
- Timeline visualization showing chronological milestones
- AI generate button
- Date validation (ensure chronological order)

### 7. Step 3 Restructure

Replace career-first with:

```tsx
{
  /* Life Aspects Multi-select */
}
<div className="space-y-2 border rounded-lg p-4">
  <Label className="text-base font-semibold">{t.lifeAspectsTitle}</Label>
  <p className="text-sm text-muted-foreground mb-3">{t.lifeAspectsSubtitle}</p>

  <div className="grid grid-cols-2 gap-2">
    {LIFE_ASPECTS.map((aspect) => (
      <div
        key={aspect.value}
        className="flex items-center space-x-2 p-2 rounded border"
      >
        <Checkbox
          id={`aspect-${aspect.value}`}
          checked={formData.lifeAspects.includes(aspect.value)}
          onCheckedChange={(checked) => {
            if (checked) {
              setFormData((prev) => ({
                ...prev,
                lifeAspects: [...prev.lifeAspects, aspect.value],
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                lifeAspects: prev.lifeAspects.filter((v) => v !== aspect.value),
              }));
            }
          }}
        />
        <label
          htmlFor={`aspect-${aspect.value}`}
          className="flex-1 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{aspect.icon}</span>
            <div>
              <div className="font-medium text-sm">{aspect.label}</div>
              <div className="text-xs text-muted-foreground">
                {aspect.description}
              </div>
            </div>
          </div>
        </label>
      </div>
    ))}
  </div>
</div>;

{
  /* SDG Goals - Conditional for Business/Impact */
}
{
  formData.lifeAspects.includes("contribution") && (
    <div className="space-y-2 border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
      <Label className="text-base font-semibold">{t.sdgTitle}</Label>
      <p className="text-sm text-muted-foreground mb-3">{t.sdgForBusiness}</p>
      {/* Existing SDG checkboxes */}
    </div>
  );
}
```

### 8. Update handleSubmit

Change milestone creation to include SMART data:

```typescript
const project = await createJourneyProject({
  title: milestone.title,
  description: `Step ${i + 1} towards: ${formData.title}`,
  project_type: formData.lifeAspects[0] || "learning", // Use primary life aspect
  status: "not_started",
  linked_north_star_id: northStar.id,
  icon: "🎯",
  color: "#3b82f6",
  metadata: {
    milestone_index: i,
    from_north_star_wizard: true,
    north_star_title: formData.title,
    start_date: milestone.startDate,
    due_date: milestone.dueDate,
    measurable: milestone.measurable,
  },
});
```

Save life aspects to North Star:

```typescript
const northStar = await createNorthStar({
  // ... existing fields
  metadata: {
    starConfig: validatedConfig,
    life_aspects: formData.lifeAspects, // NEW
  },
});
```

## Implementation Steps

1. ✅ Create `constants/life-aspects.ts`
2. ✅ Create `lib/ai/north-star-enhancer.ts`
3. ✅ Fix StarGenerator label
4. ✅ Update CreateNorthStarDialog imports and interfaces
5. ✅ Update CreateNorthStarDialog state
6. ⏳ Add translations for new features
7. ⏳ Add AI handler functions
8. ⏳ Update Step 1 UI with AI button
9. ⏳ Rewrite Step 2 with SMART milestones + timeline
10. ⏳ Restructure Step 3 with life aspects
11. ⏳ Update handleSubmit to save SMART data

## Testing Checklist

- [ ] AI enhancement works (vision text improved)
- [ ] AI generation creates 5-7 milestones with dates
- [ ] AI limit enforced (1 use per dialog session)
- [ ] Date validation prevents chronological errors
- [ ] Timeline visualization shows milestones clearly
- [ ] Life aspects save to metadata
- [ ] SDG only shows for "contribution" aspect
- [ ] SMART data saves to project metadata
- [ ] Projects created with correct types from life aspects
- [ ] Thai translations work correctly
