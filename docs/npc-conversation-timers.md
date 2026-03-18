# NPC Conversation Timers

## Overview

NPC Conversations support timed dialogue choices, similar to narrative games like Life is Strange, The Walking Dead, etc. When a timer is set on a question node, students must make their choice before time runs out, or a default choice will be automatically selected.

## Configuration

Timers are configured in the `metadata` field of conversation nodes:

```json
{
  "id": "urgent_question",
  "type": "question",
  "text": "Quick! The door is closing. What do you do?",
  "metadata": {
    "timer_seconds": 8,           // How long user has to choose (required)
    "default_choice_index": 0,    // Which choice to auto-select (optional, default: 0)
    "show_timer": true,           // Show countdown UI (optional, default: true)
    "emotion": "urgent"           // Standard emotion field
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `timer_seconds` | number | No | undefined | Number of seconds before auto-select. 0 or undefined = no timer. |
| `default_choice_index` | number | No | 0 | Index of the choice to auto-select when timer expires (0-based). |
| `show_timer` | boolean | No | true | Whether to show the countdown UI to the user. |

## UI Behavior

When a timer is active:

1. **Countdown Display**: Shows remaining seconds with a clock icon
2. **Progress Bar**: Visual progress bar that depletes as time runs out
3. **Color Coding**:
   - Blue: > 5 seconds remaining
   - Yellow: 3-5 seconds remaining
   - Red: ≤ 3 seconds (pulsing animation)
4. **Default Choice Indicator**: The default choice is highlighted with an orange ring and `[DEFAULT]` label
5. **Auto-Selection**: When time expires, the default choice is automatically selected and the conversation continues

## Timer Duration Guidelines

Recommended timer durations based on text length:

| Text Length | Recommended Time | Example |
|-------------|------------------|---------|
| Short (< 20 words) | 5-8 seconds | "Yes or no?" |
| Medium (20-50 words) | 8-12 seconds | "What do you think about this situation?" |
| Long (50-100 words) | 12-20 seconds | Detailed question with context |
| Very Long (> 100 words) | 20-30 seconds | Complex scenarios |

**Formula**: Approximately 2-3 seconds per choice option + 1 second per 10 words of question text.

## Best Practices

### When to Use Timers

✅ **Good Use Cases:**
- Urgent decision moments
- Simulating pressure in real-world scenarios
- Testing instinctive reactions
- Building tension in narrative
- Preventing overthinking

❌ **Avoid Timers For:**
- Complex analytical questions
- First-time tutorials
- Accessibility-critical content
- Information-heavy decisions

### Accessibility Considerations

1. **Always provide a reasonable default**: Choose a default that won't negatively impact the user experience
2. **Make timers optional in settings**: Consider adding a "disable timers" option
3. **Visual + Text indicators**: Use both color and text to indicate urgency
4. **Adequate time**: Ensure all users can read and comprehend the question

### Design Tips

1. **Preview before deploying**: Test timers with real users to ensure adequate time
2. **Consider text length**: Longer questions need more time
3. **Set meaningful defaults**: The default choice should be safe/neutral when possible
4. **Use sparingly**: Too many timed questions can be stressful
5. **Match emotion to urgency**: Use `"emotion": "urgent"` or `"angry"` for timed questions

## Examples

### Example 1: Quick Yes/No (Short Timer)

```json
{
  "id": "emergency",
  "type": "question",
  "text": "The alarm is blaring! Do you evacuate?",
  "metadata": {
    "timer_seconds": 6,
    "default_choice_index": 0,
    "emotion": "urgent"
  }
}
```

Choices:
- 0 (Default): "Yes, evacuate immediately"
- 1: "No, stay and investigate"

### Example 2: Social Interaction (Medium Timer)

```json
{
  "id": "awkward_moment",
  "type": "question",
  "text": "Your friend just made an awkward joke. The silence is getting uncomfortable. How do you respond?",
  "metadata": {
    "timer_seconds": 10,
    "default_choice_index": 2,
    "emotion": "neutral",
    "show_timer": true
  }
}
```

Choices:
- 0: "Laugh loudly to break the tension"
- 1: "Change the subject quickly"
- 2 (Default): "Give a polite smile and say nothing"
- 3: "Call out how awkward it was"

### Example 3: Professional Decision (Longer Timer)

```json
{
  "id": "client_meeting",
  "type": "question",
  "text": "The client just asked an unexpected question about your company's environmental policy. You don't have all the details. The room is waiting for your response.",
  "metadata": {
    "timer_seconds": 15,
    "default_choice_index": 1,
    "emotion": "thoughtful"
  }
}
```

Choices:
- 0: "Make up an answer on the spot"
- 1 (Default): "Admit you don't know and offer to follow up"
- 2: "Deflect to another team member"
- 3: "Give a vague response and move on"

### Example 4: No Timer (For Comparison)

```json
{
  "id": "reflective_question",
  "type": "question",
  "text": "Looking back on your choices, which approach felt most authentic to you?",
  "metadata": {
    "emotion": "thoughtful"
  }
}
```

No timer - user can take as long as they need to reflect.

## Technical Details

### Implementation

- Timers use JavaScript `setInterval` with 1-second intervals
- Countdown starts immediately when the question node is displayed
- Selecting any choice manually clears the timer
- Auto-selection triggers the same API call as manual selection
- Timer state is not persisted (refreshing resets the timer)

### Future Enhancements

Potential future features:
- Pause/resume functionality
- Custom timer UI themes
- Sound effects for timer warnings
- Analytics on average response times
- Adaptive timers based on user reading speed
