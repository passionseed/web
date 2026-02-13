# AI Chat Mobile Layout Redesign

**Date:** 2026-02-12
**Component:** `components/journey/NewNorthStarFlow.tsx` and `components/education/direction-finder/AIConversation.tsx`
**Status:** Approved

## Problem Statement

The AI chat step in the North Star flow has poor mobile UX:
1. **Double scrolling** - both the page AND the chat messages scroll separately
2. **Input scrolls out of view** - text box disappears when scrolling through messages
3. **Janky behavior** - inconsistent scroll containers and layout shifts

## User Requirements

- WhatsApp/iMessage-like experience on mobile
- Fixed header (always visible)
- Scrollable messages area (only this scrolls)
- Fixed input at bottom (never scrolls away)
- Full screen on mobile, card-style on desktop

## Solution: CSS-only Flex Structure Fix

### Approach

Use proper flex column layout with dynamic viewport height and a single scroll container.

**Why this approach:**
- Minimal code changes
- Pure CSS solution (best performance)
- No JavaScript changes needed
- Fixes both core issues (double scroll + input scrolling)
- Maintainable and simple

### Architecture

#### Layout Structure

```
Card (h-[100dvh] on mobile, fixed height container)
├── CardHeader (flex-shrink-0, fixed at top)
├── CardContent (flex-1, overflow-hidden wrapper)
│   └── Messages Container (h-full, overflow-y-auto) ← ONLY scroll here
│       └── Messages list with padding
└── Input Form (flex-shrink-0, fixed at bottom)
```

#### Key Changes

1. **NewNorthStarFlow.tsx**
   - Change `h-screen` → `h-[100dvh]` in AIConversation className
   - `dvh` units account for mobile browser UI (address bar)

2. **AIConversation.tsx Card**
   - Keep `flex flex-col`
   - Add `overflow-hidden` to prevent outer scrolling

3. **CardHeader**
   - Remove `sticky` positioning
   - Already fixed by being `flex-shrink-0` in flex column

4. **CardContent**
   - Remove `overflow-y-auto`
   - Change to just a flex-1 wrapper with `overflow-hidden`

5. **Messages Container (NEW)**
   - Single `div` with `h-full overflow-y-auto`
   - This is the ONLY element that scrolls
   - Wraps all messages and typing indicator

6. **Input Section**
   - Keep as `flex-shrink-0` (already correct)

### Scroll Behavior

#### Auto-scroll Logic

Current code tries to find `[data-radix-scroll-area-viewport]` which doesn't exist. Simplify to:

```typescript
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [messages, isTyping, currentOptions]);
```

#### Scroll Container Properties

- `overflow-y-auto` - vertical scrolling
- `overscroll-behavior-contain` - prevents iOS bounce affecting parent
- Native touch scrolling works automatically

### Responsive Patterns

#### Mobile (default to `sm:`)
- `h-[100dvh]` - Full dynamic viewport height
- `w-screen` - Full width
- `rounded-none border-0` - Edge-to-edge
- `p-3` - Tighter mobile spacing

#### Desktop (`sm:` and above)
- `h-[700px]` - Fixed comfortable height
- `max-w-4xl mx-auto` - Centered with max width
- `rounded-xl border` - Card appearance
- `p-4` - Comfortable desktop spacing

**No layout structure changes** between mobile/desktop - just visual styling.

### Touch Interactions

#### Input Box
- `flex-shrink-0` keeps it fixed at bottom
- No manual positioning needed

#### Textarea
- `min-h-[44px]` - iOS touch target minimum (44px)
- `max-h-[120px]` - Prevents taking over screen
- `resize-none` - No awkward resize handles
- `text-base` - Prevents iOS auto-zoom on focus

#### Keyboard Behavior
- Messages container shrinks when keyboard opens (flex-1)
- Input stays visible above keyboard (native behavior)
- Auto-scroll keeps latest message visible
- No manual viewport adjustments needed

## Implementation Checklist

- [ ] Update NewNorthStarFlow.tsx: `h-screen` → `h-[100dvh]`
- [ ] Update AIConversation Card: add `overflow-hidden`
- [ ] Update CardHeader: remove `sticky top-0`
- [ ] Update CardContent: remove `overflow-y-auto`, add `overflow-hidden`
- [ ] Create new messages container div with scroll
- [ ] Update scrollRef logic to target new container
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test keyboard behavior
- [ ] Test auto-scroll to bottom
- [ ] Verify desktop layout unchanged

## Success Criteria

- ✅ Only messages area scrolls (no page scroll)
- ✅ Input always visible at bottom
- ✅ Header always visible at top
- ✅ Smooth scrolling on all mobile devices
- ✅ Keyboard doesn't break layout
- ✅ Desktop layout unaffected

## Technical Notes

- `dvh` = dynamic viewport height (accounts for browser chrome)
- Single scroll container eliminates double-scroll
- Flex column naturally creates fixed header/footer
- No JavaScript changes needed for core fix
- Existing auto-scroll just needs simplified selector
