# AI Chat Mobile Layout Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix double-scroll and input visibility issues on mobile by restructuring the chat layout with proper flex container and single scroll area.

**Architecture:** Pure CSS solution using flex column layout with dynamic viewport height (`dvh`). Single scroll container for messages, fixed header/footer. Minimal JavaScript changes.

**Tech Stack:** React, Next.js, TailwindCSS

---

## Task 1: Update NewNorthStarFlow.tsx Container Height

**Files:**
- Modify: `components/journey/NewNorthStarFlow.tsx:311`

**Step 1: Change h-screen to h-[100dvh] for mobile**

Update the className prop passed to AIConversation component:

```tsx
// Line 311 - Change from:
className="h-screen w-screen sm:h-[700px] sm:w-auto..."

// To:
className="h-[100dvh] w-screen sm:h-[700px] sm:w-auto..."
```

**Explanation:** `dvh` (dynamic viewport height) accounts for mobile browser UI (address bar) that can hide/show.

**Step 2: Verify the change**

```bash
grep -n "h-\[100dvh\]" components/journey/NewNorthStarFlow.tsx
```

Expected: Should show line 311 with the updated className

**Step 3: Commit**

```bash
git add components/journey/NewNorthStarFlow.tsx
git commit -m "fix(chat): use dvh units for mobile viewport

Replace h-screen with h-[100dvh] to properly account for mobile
browser chrome and prevent layout shifts.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update AIConversation Card Structure

**Files:**
- Modify: `components/education/direction-finder/AIConversation.tsx:646-650`

**Step 1: Add overflow-hidden to Card**

```tsx
// Line 646-650 - Add overflow-hidden to className
"flex flex-col bg-slate-900 border-slate-700 relative h-full overflow-hidden"
```

**Step 2: Commit**

```bash
git add components/education/direction-finder/AIConversation.tsx
git commit -m "fix(chat): prevent outer card from scrolling

Add overflow-hidden to Card to ensure only messages area scrolls.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update CardHeader Positioning

**Files:**
- Modify: `components/education/direction-finder/AIConversation.tsx:652`

**Step 1: Remove sticky positioning**

Remove `sticky top-0` from CardHeader className. Keep everything else.

**Step 2: Commit**

```bash
git add components/education/direction-finder/AIConversation.tsx
git commit -m "fix(chat): remove sticky positioning from header

Header is naturally fixed with flex-shrink-0 in flex column.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Restructure Messages Scroll Container

**Files:**
- Modify: `components/education/direction-finder/AIConversation.tsx:829-960`

**Step 1: Update CardContent structure**

Change from:
```tsx
<CardContent className="flex-1 flex flex-col p-0 overflow-y-auto overscroll-contain">
  <div className="p-3 md:p-4" ref={scrollRef as any}>
    <div className="space-y-4 pb-4">
```

To:
```tsx
<CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
  <div ref={scrollRef as any} className="h-full overflow-y-auto overscroll-contain">
    <div className="p-3 md:p-4 space-y-4 pb-4">
```

**Explanation:**
- CardContent: remove scroll, add `overflow-hidden`
- Inner div (with ref): add `h-full overflow-y-auto` - this is the ONLY scroll container
- Messages div: move `space-y-4 pb-4` up one level

**Step 2: Commit**

```bash
git add components/education/direction-finder/AIConversation.tsx
git commit -m "fix(chat): restructure scroll container hierarchy

- CardContent becomes overflow-hidden wrapper
- Create dedicated scroll container with scrollRef
- Establishes single, clear scroll hierarchy

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Simplify Auto-Scroll Logic

**Files:**
- Modify: `components/education/direction-finder/AIConversation.tsx:200-210`

**Step 1: Update auto-scroll useEffect**

Change from:
```tsx
useEffect(() => {
  if (scrollRef.current) {
    const scrollElement = scrollRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }
}, [messages, isTyping, currentOptions]);
```

To:
```tsx
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [messages, isTyping, currentOptions]);
```

**Step 2: Commit**

```bash
git add components/education/direction-finder/AIConversation.tsx
git commit -m "fix(chat): simplify auto-scroll logic

Remove querySelector - scrollRef now points directly to scroll container.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Testing

**Manual Testing Checklist:**

### Mobile Testing
1. Start dev server: `pnpm dev`
2. Open on mobile device or simulator
3. Navigate to North Star chat
4. Verify:
   - ✅ Only messages scroll (not page)
   - ✅ Header fixed at top
   - ✅ Input fixed at bottom
   - ✅ Keyboard doesn't break layout
   - ✅ Auto-scroll works

### Desktop Testing
1. Open at >640px width
2. Verify:
   - ✅ Card appearance correct
   - ✅ Centered layout
   - ✅ No visual regressions

---

## Success Criteria

- ✅ Only messages area scrolls
- ✅ Input always visible at bottom
- ✅ Header always visible at top
- ✅ Smooth mobile scrolling
- ✅ Keyboard doesn't break layout
- ✅ Desktop layout unaffected
