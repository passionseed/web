# PassionSeed UI Design System

> **Version 2.0** — Last updated: 2026-03-15
>
> This is a living document. If you add a new pattern, update this doc. If you can't explain it here, it doesn't belong in the codebase.

---

## Core Concept: Dawn & Dusk

PassionSeed uses two atmospheric themes tied to the user's role:

| Context | Theme | Meaning | Users |
|---------|-------|---------|-------|
| **Experts** | **Dusk** | The sun setting — experience, warmth, legacy, things earned over time | Professionals, mentors, industry partners |
| **Students** | **Dawn** | The sun rising — potential, possibility, new beginnings | High school students, university students, parents |

**Every UI surface should feel like a moment in that sky. Animations are atmospheric, not decorative.**

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography](#typography)
3. [Color & Theming](#color--theming)
4. [Animation Principles](#animation-principles)
5. [Component Library](#component-library)
6. [Composition Patterns](#composition-patterns)
7. [Accessibility](#accessibility)
8. [Mobile & Touch](#mobile--touch)

---

## Design Tokens

All values should be consumed via CSS custom properties or Tailwind config. **Do not hardcode values** in components.

### CSS Custom Properties (globals.css)

```css
:root {
  /* === DUSK THEME (Experts) === */
  --dusk-space-950: #06000f;
  --dusk-space-900: #1a0336;
  --dusk-purple-800: #3b0764;
  --dusk-purple-700: #4a1230;
  --dusk-amber: rgba(251, 146, 60, var(--tw-bg-opacity, 1));
  --dusk-ember-orange: #f97316;
  --dusk-ember-red: #ea580c;
  --dusk-pink: #be185d;

  /* === DAWN THEME (Students) === */
  --dawn-space-950: #020617;
  --dawn-space-900: #0f172a;
  --dawn-purple-800: #1e1b4b;
  --dawn-purple-700: #312e81;
  --dawn-gold: rgba(254, 217, 92, var(--tw-bg-opacity, 1));
  --dawn-blue: #3b82f6;
  --dawn-rose: #f472b6;
  --dawn-warm-white: #fef9e7;

  /* === ANIMATION === */
  --ease-tension: cubic-bezier(0.05, 0.7, 0.35, 0.99);
  --ease-snap: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-rise: 9000ms;
  --duration-pulse-a: 4231ms; /* prime */
  --duration-pulse-b: 5711ms; /* prime */
  --duration-snap: 160ms;

  /* === SPACING === */
  --space-card-radius: 12px;
  --space-glow-radius: 13px; /* 1px larger for inset overlap */

  /* === FOCUS === */
  --focus-ring-offset: 2px;
  --focus-ring-width: 3px;
  --focus-ring-color: rgba(251, 146, 60, 0.6); /* amber for dusk */
  --focus-ring-color-dawn: rgba(254, 217, 92, 0.6); /* gold for dawn */
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'bai-jamjuree': ['var(--font-bai-jamjuree)'],
        'kodchasan': ['var(--font-kodchasan)'],
        'libre-franklin': ['var(--font-libre-franklin)'],
        'space-mono': ['var(--font-space-mono)'],
      },
      keyframes: {
        'dusk-cloud-a': { /* ... */ },
        'ember-rise': { /* ... */ },
        'dawn-ray': { /* ... */ },
      },
      animation: {
        'cloud-slow': 'dusk-cloud-a 18s ease-in-out infinite',
        'ember-float': 'ember-rise 8s ease-in infinite',
      },
    },
  },
}
```

---

## Typography

### Font Families

| Font | Usage | Script |
|------|-------|--------|
| **Bai Jamjuree** | Thai body text, UI labels, buttons | Thai (primary) |
| **Kodchasan** | Thai headlines, display text | Thai (secondary) |
| **Libre Franklin** | Latin body text, UI labels | Latin (primary) |
| **Space Mono** | Code, technical labels, IDs | Latin (mono) |

**Rule:** Thai text always uses Bai Jamjuree or Kodchasan. Never default to system fonts.

### Type Scale (Thai)

```css
/* Headlines - Kodchasan */
.text-display-xl { font-family: var(--font-kodchasan); font-size: 64px; line-height: 1.0; font-weight: 700; }
.text-display-lg { font-family: var(--font-kodchasan); font-size: 48px; line-height: 1.1; font-weight: 700; }
.text-display-md { font-family: var(--font-kodchasan); font-size: 36px; line-height: 1.2; font-weight: 700; }
.text-display-sm { font-family: var(--font-kodchasan); font-size: 28px; line-height: 1.3; font-weight: 600; }

/* Body - Bai Jamjuree */
.text-body-lg { font-family: var(--font-bai-jamjuree); font-size: 18px; line-height: 1.6; font-weight: 400; }
.text-body-md { font-family: var(--font-bai-jamjuree); font-size: 16px; line-height: 1.6; font-weight: 400; }
.text-body-sm { font-family: var(--font-bai-jamjuree); font-size: 14px; line-height: 1.5; font-weight: 400; }

/* UI Labels - Bai Jamjuree */
.text-label-lg { font-family: var(--font-bai-jamjuree); font-size: 14px; line-height: 1.4; font-weight: 600; letter-spacing: 0.02em; }
.text-label-md { font-family: var(--font-bai-jamjuree); font-size: 12px; line-height: 1.4; font-weight: 600; letter-spacing: 0.04em; }
.text-label-sm { font-family: var(--font-bai-jamjuree); font-size: 10px; line-height: 1.4; font-weight: 600; letter-spacing: 0.08em; }
```

### Type Scale (Latin)

```css
/* Headlines - Libre Franklin */
.text-display-xl { font-family: var(--font-libre-franklin); font-size: 64px; line-height: 1.0; font-weight: 700; }
.text-display-lg { font-family: var(--font-libre-franklin); font-size: 48px; line-height: 1.1; font-weight: 700; }

/* Body - Libre Franklin */
.text-body-lg { font-family: var(--font-libre-franklin); font-size: 18px; line-height: 1.6; font-weight: 400; }
.text-body-md { font-family: var(--font-libre-franklin); font-size: 16px; line-height: 1.6; font-weight: 400; }

/* Mono - Space Mono */
.text-mono { font-family: var(--font-space-mono); font-size: 13px; line-height: 1.5; }
```

### Thai-Specific Rules

1. **Line height:** Thai script requires more vertical space. Minimum `1.5` for body, `1.6` preferred.
2. **Letter spacing:** Kodchasan headlines use `tracking-tight`. Bai Jamjuree body uses default spacing.
3. **Minimum size:** Never go below `10px` for Thai text — the complex glyphs become illegible.
4. **Font loading:** Use `font-display: swap` to prevent FOIT on Thai fonts.

---

## Color & Theming

### Dusk Theme (Experts)

```css
.dusk-theme {
  /* Background stack (render in order, all absolute) */
  --dusk-bg-gradient: linear-gradient(
    to bottom,
    #06000f 0%,
    #1a0336 28%,
    #3b0764 58%,
    #4a1230 82%,
    #2a0818 100%
  );

  /* Atmospheric layers */
  --dusk-cloud-a: radial-gradient(circle, rgba(107, 33, 168, 0.35) 0%, transparent 70%);
  --dusk-cloud-b: radial-gradient(circle, rgba(147, 51, 234, 0.28) 0%, transparent 70%);
  --dusk-cloud-c: radial-gradient(circle, rgba(190, 24, 93, 0.22) 0%, transparent 70%);
  --dusk-horizon-glow: linear-gradient(to top, rgba(251, 146, 60, 0.15) 0%, transparent 60%);
}
```

**Layer order (z-index, bottom to top):**
1. Background gradient (base)
2. Three cloud blobs (drifting, 14–22s cycles)
3. Horizon glow (48s cycle, blur 52px)
4. Ember particles (10 dots, rising)
5. Star dot-grid (SVG pattern, upper 50%, 7% opacity)

### Dawn Theme (Students)

```css
.dawn-theme {
  /* Background stack */
  --dawn-bg-gradient: linear-gradient(
    to bottom,
    #020617 0%,
    #0f172a 28%,
    #1e1b4b 58%,
    #312e81 82%,
    #1e3a5f 100%
  );

  /* Atmospheric layers */
  --dawn-cloud-a: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%);
  --dawn-cloud-b: radial-gradient(circle, rgba(99, 102, 241, 0.20) 0%, transparent 70%);
  --dawn-cloud-c: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%);
  --dawn-horizon-glow: linear-gradient(to top, rgba(254, 217, 92, 0.12) 0%, transparent 60%);
}
```

**Layer order (same as Dusk, different palette):**
1. Background gradient (deep blue-black → cool purple → soft rose)
2. Three cloud blobs (blue/lavender tints)
3. Horizon glow (pale gold, not amber)
4. Light particles (rising, like morning mist)
5. Star dot-grid (same as Dusk)

### Accent Colors

| Use Case | Dusk | Dawn |
|----------|------|------|
| Primary CTA | `#f97316` → `#ea580c` → `#be185d` | `#3b82f6` → `#6366f1` → `#a855f7` |
| Success | `#10b981` | `#10b981` (shared) |
| Warning | `#f59e0b` | `#f59e0b` (shared) |
| Error | `#ef4444` | `#ef4444` (shared) |
| Info | `#3b82f6` | `#60a5fa` (lighter) |

### Gradients: Minimum Stops

**Rule:** Never use flat colors on hero surfaces. Minimum 3 stops.

```css
/* BAD: flat color */
background: #3b0764;

/* GOOD: gradient with depth */
background: linear-gradient(135deg, #3b0764 0%, #4a1230 50%, #5c1a3d 100%);
```

---

## Animation Principles

### The Core Rule: Slow Tension

> Animations should build tension like physical heat or a rising sun. The sensation is: *something enormous is slowly becoming real.*

### Easing Functions

| Name | Value | Use Case |
|------|-------|----------|
| `--ease-tension` | `cubic-bezier(0.05, 0.7, 0.35, 0.99)` | Primary hover, glow reveals |
| `--ease-snap` | `cubic-bezier(0.4, 0, 0.2, 1)` | Fast exits, UI state changes |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Micro-interactions, buttons |

### Hover Pattern: Charge-In / Snap-Out

```css
/* Base element — fast snap-out on mouse-leave */
.component {
  transition: transform var(--duration-snap) var(--ease-snap),
              box-shadow var(--duration-snap) var(--ease-snap);
}

/* Hover — slow charge-in using keyframe animations */
.component:hover {
  animation: component-rise var(--duration-rise) var(--ease-tension) forwards;
}
```

**Never use a single `transition` for both directions.** Use keyframes for hover-in (values build gradually) and short transitions on the base element for snap-out.

### Layered Glow: Reveal + Opacity + Blur Together

All three properties must animate together. A glow that reveals but stays sharp looks fake.

```css
/* Start: hidden, misty, diffuse */
.glow-layer {
  clip-path: inset(100% 0 0 0 round var(--space-glow-radius));
  opacity: 0;
  filter: blur(18px);
  transition: clip-path var(--duration-snap) var(--ease-snap),
              opacity var(--duration-snap) var(--ease-snap),
              filter var(--duration-snap) var(--ease-snap);
}

/* Hover: revealed, bright, focused */
.parent:hover .glow-layer {
  clip-path: inset(0% 0 0 0 round var(--space-glow-radius));
  opacity: 1;
  filter: blur(3px);
  transition: clip-path var(--duration-rise) var(--ease-tension),
              opacity var(--duration-rise) var(--ease-tension),
              filter var(--duration-rise) var(--ease-tension);
}
```

### Clip-Path Directions

| Direction | Start | End | Gradient |
|-----------|-------|-----|----------|
| Bottom-to-top | `inset(100% 0 0 0)` | `inset(0 0 0 0)` | `to top` (bright at bottom) |
| Top-to-bottom | `inset(0 0 100% 0)` | `inset(0 0 0 0)` | `to bottom` (bright at top) |
| Left-to-right | `inset(0 100% 0 0)` | `inset(0 0 0 0)` | `to right` (bright at left) |

### Wave Chaos (Infinite Pulse After Rise)

Use two independent `::before` and `::after` layers with **prime-number durations** so they never sync:

```css
/* Layer A — tighter, yellower */
animation: rise 14000ms ease forwards,
           wave-a 4231ms ease-in-out 14350ms infinite;

/* Layer B — softer, more orange, offset start */
animation: rise-b 14000ms ease 900ms forwards,
           wave-b 5711ms ease-in-out 14900ms infinite;
```

4231 and 5711 are both prime → LCM ~24M ms → effectively never synchronise → natural variation every cycle.

---

## Component Library

### `.ei-card`

Dark glass card for the dusk theme.

```css
.ei-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--space-card-radius);
  box-shadow: 0 0 0 1px rgba(251, 146, 60, 0),
              0 4px 12px rgba(0, 0, 0, 0.3),
              0 0 40px rgba(251, 146, 60, 0);
  transition: transform var(--duration-snap) var(--ease-snap),
              box-shadow var(--duration-snap) var(--ease-snap);
  overflow: hidden;
}

.ei-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--space-glow-radius);
  background: linear-gradient(to top, rgba(251, 146, 60, 0.15) 0%, transparent 60%);
  clip-path: inset(100% 0 0 0 round var(--space-glow-radius));
  opacity: 0;
  filter: blur(18px);
  transition: clip-path var(--duration-snap) var(--ease-snap),
              opacity var(--duration-snap) var(--ease-snap),
              filter var(--duration-snap) var(--ease-snap);
  pointer-events: none;
}

.ei-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 0 1px rgba(251, 146, 60, 0.3),
              0 8px 24px rgba(0, 0, 0, 0.4),
              0 0 60px rgba(251, 146, 60, 0.15);
  animation: card-rise var(--duration-rise) var(--ease-tension) forwards;
}

.ei-card:hover::before {
  clip-path: inset(0% 0 0 0 round var(--space-glow-radius));
  opacity: 1;
  filter: blur(3px);
  transition: clip-path var(--duration-rise) var(--ease-tension),
              opacity var(--duration-rise) var(--ease-tension),
              filter var(--duration-rise) var(--ease-tension);
}

.ei-card > * {
  position: relative;
  z-index: 1;
}
```

**Usage:**
```tsx
<div className="ei-card p-6">
  <h3 className="text-white font-bold">Card Title</h3>
  <p className="text-slate-400">Card content goes here.</p>
</div>
```

---

### `.ei-button-dusk`

Primary CTA button for experts.

```css
.ei-button-dusk {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(180deg, #f97316 0%, #ea580c 45%, #be185d 100%);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 320ms var(--ease-spring);
}

.ei-button-dusk::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0%;
  background: linear-gradient(to top, rgba(254, 217, 92, 0.4) 0%, transparent 100%);
  transition: height 350ms ease, opacity 13000ms var(--ease-tension);
  opacity: 0;
}

.ei-button-dusk::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(251, 146, 60, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 400ms ease, transform 13000ms var(--ease-tension);
}

.ei-button-dusk:hover {
  transform: translateY(-3px);
}

.ei-button-dusk:hover::before {
  height: 100%;
  opacity: 1;
  animation: button-wave-a var(--duration-pulse-a) ease-in-out 14000ms infinite;
}

.ei-button-dusk:hover::after {
  opacity: 1;
  transform: scale(1.1);
  animation: button-wave-b var(--duration-pulse-b) ease-in-out 14500ms infinite;
}

.ei-button-dusk > * {
  position: relative;
  z-index: 1;
}
```

**Usage:**
```tsx
<Link href="/expert-interview" className="ei-button-dusk">
  Start the Interview
  <ArrowRight className="h-4 w-4" />
</Link>
```

---

### `.ei-button-dawn`

Primary CTA button for students.

```css
.ei-button-dawn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(180deg, #3b82f6 0%, #6366f1 45%, #a855f7 100%);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 320ms var(--ease-spring);
}

.ei-button-dawn::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0%;
  background: linear-gradient(to top, rgba(254, 217, 92, 0.35) 0%, transparent 100%);
  transition: height 350ms ease, opacity 13000ms var(--ease-tension);
  opacity: 0;
}

.ei-button-dawn::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 400ms ease, transform 13000ms var(--ease-tension);
}

.ei-button-dawn:hover {
  transform: translateY(-3px);
}

.ei-button-dawn:hover::before {
  height: 100%;
  opacity: 1;
  animation: button-wave-a var(--duration-pulse-a) ease-in-out 14000ms infinite;
}

.ei-button-dawn:hover::after {
  opacity: 1;
  transform: scale(1.1);
  animation: button-wave-b var(--duration-pulse-b) ease-in-out 14500ms infinite;
}

.ei-button-dawn > * {
  position: relative;
  z-index: 1;
}
```

---

### `.ei-input`

Text input field with theme-aware styling.

```css
.ei-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 0.875rem;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
  outline: none;
}

/* Dusk theme */
.dusk-theme .ei-input {
  color: #e2e8f0;
}

.dusk-theme .ei-input::placeholder {
  color: #64748b;
}

.dusk-theme .ei-input:hover {
  border-color: rgba(251, 146, 60, 0.3);
  background: rgba(255, 255, 255, 0.05);
}

.dusk-theme .ei-input:focus {
  border-color: rgba(251, 146, 60, 0.5);
  box-shadow: 0 0 0 var(--focus-ring-width) rgba(251, 146, 60, 0.15);
  background: rgba(255, 255, 255, 0.06);
}

/* Dawn theme */
.dawn-theme .ei-input {
  color: #e2e8f0;
}

.dawn-theme .ei-input::placeholder {
  color: #64748b;
}

.dawn-theme .ei-input:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(255, 255, 255, 0.05);
}

.dawn-theme .ei-input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 var(--focus-ring-width) rgba(99, 102, 241, 0.15);
  background: rgba(255, 255, 255, 0.06);
}
```

**Usage:**
```tsx
<div className="space-y-1.5">
  <Label htmlFor="email" className="text-label-md text-slate-400">
    Email Address
  </Label>
  <Input
    id="email"
    name="email"
    type="email"
    required
    placeholder="john@example.com"
    className="ei-input"
  />
</div>
```

---

### `.ei-select`

Dropdown select with custom arrow.

```css
.ei-select {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 0.875rem;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.25rem;
  transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
  outline: none;
  cursor: pointer;
}

/* Same hover/focus states as .ei-input */
```

**Usage:**
```tsx
<select
  id="grade"
  name="grade"
  required
  className="ei-select"
>
  <option value="" className="text-slate-500">Select grade</option>
  <option value="10">Grade 10</option>
  <option value="11">Grade 11</option>
  <option value="12">Grade 12</option>
</select>
```

---

### `.ei-modal`

Dialog/modal overlay and container.

```css
.ei-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  opacity: 0;
  transition: opacity 240ms var(--ease-snap);
}

.ei-modal-overlay.in-view {
  opacity: 1;
}

.ei-modal {
  position: relative;
  background: linear-gradient(145deg, rgba(15, 15, 20, 0.95) 0%, rgba(25, 25, 35, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 480px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.05);
  transform: scale(0.95) translateY(10px);
  opacity: 0;
  transition: transform 240ms var(--ease-spring), opacity 240ms var(--ease-snap);
}

.ei-modal-overlay.in-view .ei-modal {
  transform: scale(1) translateY(0);
  opacity: 1;
}

.ei-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 200ms ease, color 200ms ease;
}

.ei-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
```

**Usage:**
```tsx
// Shadcn Dialog wrapper with ei-modal classes
<Dialog>
  <DialogTrigger asChild>
    <Button className="ei-button-dusk">Open Modal</Button>
  </DialogTrigger>
  <DialogContent className="ei-modal">
    <DialogTitle className="text-display-sm text-white">Modal Title</DialogTitle>
    <DialogDescription className="text-body-md text-slate-400">
      Modal content goes here.
    </DialogDescription>
  </DialogContent>
</Dialog>
```

---

### `.ei-toast`

Notification toast (top-center positioning).

```css
.ei-toast {
  position: fixed;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
  min-width: 320px;
  max-width: 480px;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  border: 1px solid;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 0.875rem;
  opacity: 0;
  pointer-events: none;
  transition: transform 240ms var(--ease-spring), opacity 240ms var(--ease-snap);
  z-index: 100;
}

.ei-toast.in-view {
  transform: translateX(-50%) translateY(0) scale(1);
  opacity: 1;
  pointer-events: auto;
}

/* Variants */
.ei-toast--success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.ei-toast--error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.ei-toast--info {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.ei-toast-close {
  margin-left: auto;
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.ei-toast-close:hover {
  opacity: 1;
}
```

**Usage:**
```tsx
// Custom toast component
<div className={`ei-toast ei-toast--${type} ${toast ? 'in-view' : ''}`}>
  {type === 'success' && <CheckCircle2 className="w-5 h-5" />}
  {type === 'error' && <AlertCircle className="w-5 h-5" />}
  <span>{message}</span>
  <button onClick={() => setToast(null)} className="ei-toast-close">
    <X className="w-4 h-4" />
  </button>
</div>
```

---

### `.ei-skeleton`

Loading skeleton with shimmer animation.

```css
.ei-skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  border-radius: 8px;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Variants */
.ei-skeleton--text {
  height: 1rem;
  width: 100%;
}

.ei-skeleton--title {
  height: 1.5rem;
  width: 60%;
  margin-bottom: 0.75rem;
}

.ei-skeleton--card {
  height: 120px;
  border-radius: var(--space-card-radius);
}

.ei-skeleton--avatar {
  height: 48px;
  width: 48px;
  border-radius: 50%;
}
```

**Usage:**
```tsx
<div className="space-y-4">
  <div className="ei-skeleton ei-skeleton--title" />
  <div className="ei-skeleton ei-skeleton--text" />
  <div className="ei-skeleton ei-skeleton--text" style={{ width: '80%' }} />
</div>
```

---

### `.ei-badge`

Status badge/pill component.

```css
.ei-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 9999px;
  border: 1px solid;
}

/* Variants */
.ei-badge--dusk {
  background: rgba(251, 146, 60, 0.1);
  border-color: rgba(251, 146, 60, 0.3);
  color: #fb923c;
}

.ei-badge--dawn {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

.ei-badge--success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.ei-badge--dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.ei-badge--dusk .ei-badge--dot {
  background: #fb923c;
}

.ei-badge--dawn .ei-badge--dot {
  background: #818cf8;
}
```

**Usage:**
```tsx
<span className="ei-badge ei-badge--dusk">
  <span className="ei-badge--dot" />
  Beta Access
</span>
```

---

### `.ei-tabs`

Tab navigation component.

```css
.ei-tabs-list {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.25rem;
  gap: 0.25rem;
}

.ei-tabs-trigger {
  padding: 0.5rem 1rem;
  font-family: var(--font-bai-jamjuree);
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 200ms ease, background 200ms ease;
}

.ei-tabs-trigger:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.03);
}

.ei-tabs-trigger[aria-selected="true"] {
  color: white;
  background: rgba(251, 146, 60, 0.15); /* dusk */
}

.dawn-theme .ei-tabs-trigger[aria-selected="true"] {
  background: rgba(99, 102, 241, 0.15); /* dawn */
}

.ei-tabs-content {
  margin-top: 1rem;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 200ms var(--ease-snap), transform 200ms var(--ease-snap);
}

.ei-tabs-content[aria-hidden="false"] {
  opacity: 1;
  transform: translateY(0);
}
```

**Usage:**
```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="ei-tabs-list">
    <TabsTrigger value="tab1" className="ei-tabs-trigger">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2" className="ei-tabs-trigger">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" className="ei-tabs-content">
    Content 1
  </TabsContent>
  <TabsContent value="tab2" className="ei-tabs-content">
    Content 2
  </TabsContent>
</Tabs>
```

---

## Composition Patterns

### Hero Section with Atmospheric Background

The hero uses a multi-layered atmospheric design that creates a sunrise/sunset effect:

**Layer Stack (bottom to top):**
1. **Base gradient** - Deep purple → amber/gold (sunrise effect)
2. **Glow orbs** - Animated blur-3xl circles with floating motion
3. **Cloud masses** - Radial gradients opening toward center
4. **Radial glow** - Emanating from bottom center
5. **Top fade** - Gradient to deep space
6. **Shimmer overlay** - Animated diagonal gradient
7. **Grid texture** - Subtle dot pattern

```tsx
<section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
  {/* Base gradient - sunrise effect */}
  <div
    className="absolute inset-0"
    style={{
      background: `linear-gradient(
        180deg,
        #1a0a2e 0%,
        #2d1449 25%,
        #4a1d6b 45%,
        #6b2d5b 60%,
        #8b3a4a 70%,
        #c45c3a 85%,
        #e87a3a 95%,
        #fbbf24 100%
      )`,
    }}
  />

  {/* Animated glow orbs */}
  <motion.div
    className="absolute left-[-12%] top-[10%] h-[26rem] w-[26rem] bg-orange-400/18 rounded-full blur-3xl"
    animate={{ x: [0, 20, 0], y: [0, -10, 0], scale: [1, 1.08, 1] }}
    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
  />
  <motion.div
    className="absolute right-[-10%] top-[18%] h-[24rem] w-[24rem] bg-fuchsia-500/14 rounded-full blur-3xl"
    animate={{ x: [0, -18, 0], y: [0, 16, 0], scale: [1, 1.04, 1] }}
    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
  />

  {/* Left cloud - purple-violet mass */}
  <motion.div
    className="absolute left-0 top-[5%] w-[50%] h-[70%]"
    style={{
      background: `radial-gradient(ellipse 90% 80% at 0% 45%,
        rgba(160, 80, 220, 0.55) 0%,
        rgba(120, 50, 180, 0.30) 45%,
        transparent 80%)`,
      filter: "blur(36px)",
    }}
    animate={{ x: [0, 24, 0], y: [0, -14, 0], opacity: [0.75, 1, 0.75] }}
    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
  />

  {/* Right cloud - amber-rose mass */}
  <motion.div
    className="absolute right-0 top-[8%] w-[50%] h-[70%]"
    style={{
      background: `radial-gradient(ellipse 90% 80% at 100% 45%,
        rgba(220, 80, 60, 0.50) 0%,
        rgba(200, 100, 40, 0.28) 45%,
        transparent 80%)`,
      filter: "blur(36px)",
    }}
    animate={{ x: [0, -24, 0], y: [0, 16, 0], opacity: [0.70, 0.95, 0.70] }}
    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
  />

  {/* Radial glow from bottom center */}
  <div
    className="absolute inset-0"
    style={{
      background: `radial-gradient(
        ellipse 80% 50% at 50% 100%,
        rgba(255, 107, 74, 0.25) 0%,
        rgba(251, 191, 36, 0.15) 30%,
        transparent 70%
      )`,
    }}
  />

  {/* Top fade to deep space */}
  <div
    className="absolute inset-0"
    style={{
      background: `linear-gradient(180deg, rgba(26, 10, 46, 0.8) 0%, transparent 40%)`,
    }}
  />

  {/* Grid texture */}
  <div
    className="absolute inset-0 opacity-[0.06]"
    style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
      backgroundSize: "24px 24px",
    }}
  />

  {/* Content */}
  <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
    {/* Eyebrow */}
    <motion.span
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-sm font-medium text-orange-300 tracking-wide uppercase mb-6 inline-block"
    >
      Career exploration, reimagined
    </motion.span>

    {/* Headline */}
    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.05 }}
      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight drop-shadow-[0_2px_30px_rgba(255,107,74,0.3)]"
    >
      Try a career before you choose one.
    </motion.h1>

    {/* Subheadline */}
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="mt-6 text-base sm:text-lg md:text-xl text-amber-100/80 max-w-md mx-auto font-medium leading-relaxed"
    >
      5-day real-world challenges designed by working professionals.
    </motion.p>

    {/* CTA */}
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.25 }}
      className="mt-8"
    >
      <Link href="/login" className="ei-button-dusk">
        Start exploring
        <ArrowRight className="h-5 w-5" />
      </Link>
    </motion.div>
  </div>
</section>
```

### Feature Cards Section

```tsx
<section className="py-32 bg-[#0d0d0d] relative overflow-hidden border-t border-white/[0.03]">
  {/* Subtle ambient glow */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-950/10 rounded-full blur-[100px]" />
    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-950/10 rounded-full blur-[100px]" />
  </div>

  <div className="container px-4 relative z-10 max-w-5xl mx-auto">
    {/* Header */}
    <div className="text-center mb-20">
      <span className="text-xs font-medium text-purple-400 tracking-widest uppercase mb-4 inline-block">
        How It Works
      </span>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.05]">
        Career exploration that works.
      </h2>
      <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
        Three simple steps to discover your path.
      </p>
    </div>

    {/* Cards */}
    <div className="space-y-6">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
          className="ei-card group relative p-6 md:p-8 border border-orange-500/10 bg-gradient-to-br from-orange-500/20 to-orange-500/5"
        >
          <div className="flex items-start gap-4">
            <step.icon className="h-6 w-6 text-orange-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-gray-500">{step.number}</span>
                <h3 className="text-lg md:text-xl font-bold text-white">{step.title}</h3>
              </div>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                {step.description}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
</section>
```

### Hero Section with CTA (Simple)

```tsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden dusk-theme">
  {/* Background layers */}
  <div className="absolute inset-0" style={{ background: 'var(--dusk-bg-gradient)' }} />
  <div className="absolute inset-0">
    <div className="dusk-cloud-a" />
    <div className="dusk-cloud-b" />
    <div className="dusk-cloud-c" />
  </div>
  <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'var(--dusk-horizon-glow)' }} />

  {/* Content */}
  <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
    <span className="ei-badge ei-badge--dusk mb-8">
      <span className="ei-badge--dot" />
      For Professionals
    </span>
    <h1 className="text-display-lg text-white mb-6">
      Share your career with the next generation.
    </h1>
    <p className="text-body-lg text-slate-300 max-w-2xl mx-auto mb-12">
      Answer a 10-minute AI interview about your daily work.
    </p>
    <Link href="/expert-interview" className="ei-button-dusk">
      Start the Interview
      <ArrowRight className="h-5 w-5" />
    </Link>
  </div>
</section>
```

### Form Card

```tsx
<div className="ei-card p-8 max-w-md mx-auto">
  <h2 className="text-display-sm text-white mb-2">Registration Form</h2>
  <p className="text-body-sm text-slate-400 mb-6">Fill out your details to request an invitation.</p>

  <form className="space-y-5">
    <div className="space-y-1.5">
      <Label htmlFor="email" className="text-label-md text-slate-400">Email</Label>
      <Input id="email" name="email" type="email" className="ei-input" placeholder="john@example.com" />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="password" className="text-label-md text-slate-400">Password</Label>
      <Input id="password" name="password" type="password" className="ei-input" placeholder="••••••••" />
    </div>
    <Button type="submit" className="ei-button-dusk w-full">
      Continue
      <ArrowRight className="h-4 w-4" />
    </Button>
  </form>
</div>
```

### Stats Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  {[
    { icon: Clock, label: 'Time', value: '10 minutes' },
    { icon: Users, label: 'Participants', value: '100+ builders' },
    { icon: Trophy, label: 'Prizes', value: '$10k+' },
  ].map((stat, i) => (
    <div key={i} className="ei-card p-6 flex flex-col items-center text-center">
      <div className="p-3 rounded-full bg-white/5 border border-white/10 mb-4">
        <stat.icon className="h-6 w-6 text-amber-400" />
      </div>
      <p className="text-body-lg font-bold text-white">{stat.value}</p>
      <p className="text-label-sm text-slate-400 mt-1">{stat.label}</p>
    </div>
  ))}
</div>
```

---

## Accessibility

### Color Contrast

All text must meet **WCAG AA** minimum contrast ratios:

| Text Type | Minimum Ratio | Tool |
|-----------|---------------|------|
| Body text (under 18pt) | 4.5:1 | [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) |
| Large text (18pt+ or 14pt+ bold) | 3:1 | WebAIM Contrast Checker |
| UI components (icons, borders) | 3:1 | WebAIM Contrast Checker |

**Dusk theme verified colors:**
- `#e2e8f0` on `#06000f` → 12.5:1 ✓
- `#94a3b8` on `#06000f` → 7.2:1 ✓
- `#fb923c` on `#06000f` → 4.6:1 ✓

**Dawn theme verified colors:**
- `#e2e8f0` on `#020617` → 12.1:1 ✓
- `#94a3b8` on `#020617` → 6.9:1 ✓
- `#818cf8` on `#020617` → 4.8:1 ✓

### Reduced Motion

Respect `prefers-reduced-motion` for users who request minimal animation:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* Exception: opacity transitions are generally acceptable */
  .ei-toast,
  .ei-modal-overlay {
    transition: opacity 200ms ease !important;
    transition: transform 0.01ms !important;
  }
}
```

**In React components:**
```tsx
// Optional: detect reduced motion in JS
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};
```

### Focus States

All interactive elements must have visible focus indicators:

```css
/* Default focus ring (amber for dusk, gold for dawn) */
.ei-input:focus,
.ei-select:focus,
.ei-button-dusk:focus,
.ei-button-dawn:focus {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* High contrast mode */
@media (forced-colors: active) {
  .ei-input:focus,
  .ei-select:focus {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
}
```

**Keyboard navigation:**
- Tab order must follow visual order
- Skip links for main content
- Focus trap in modals
- Escape key closes modals/toasts

### Screen Reader Support

```tsx
// Decorative icons
<Sparkles className="w-4 h-4" aria-hidden="true" />

// Functional icons
<button aria-label="Close modal">
  <X className="w-5 h-5" />
</button>

// Live regions for toasts
<div role="status" aria-live="polite" aria-atomic="true">
  Registration successful!
</div>

// Form errors
<div role="alert" className="text-red-400 text-sm mt-1">
  Please enter a valid email address.
</div>
```

---

## Mobile & Touch

### IntersectionObserver for Touch Devices

On touch devices (no hover), trigger animations via `IntersectionObserver`:

```tsx
// In any client component with .ei-button-dusk or .ei-card
useEffect(() => {
  if (typeof window === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.5 } // Trigger when 50% visible
  );

  const elements = document.querySelectorAll('.ei-button-dusk, .ei-card');
  elements.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}, []); // Add dependencies if content changes
```

### CSS for Touch-Triggered Animations

```css
/* Base animation states (same as hover) */
.ei-button-dusk.in-view {
  transform: translateY(-3px);
}

.ei-button-dusk.in-view::before {
  height: 100%;
  opacity: 1;
  animation: button-wave-a var(--duration-pulse-a) ease-in-out 14000ms infinite;
}

/* Disable hover animations on touch-only devices */
@media (hover: none) {
  .ei-button-dusk:hover {
    animation: none;
  }

  .ei-button-dusk:hover::before,
  .ei-button-dusk:hover::after {
    display: none;
  }
}
```

### Touch Targets

Minimum touch target size: **44x44px** (iOS HIG) or **48x48px** (Material Design).

```css
/* Ensure buttons meet minimum touch target */
.ei-button-dusk,
.ei-button-dawn {
  min-height: 48px;
  min-width: 48px;
}

/* Icon-only buttons */
.icon-button {
  padding: 0.75rem; /* Ensures 48x48px minimum with typical icon sizes */
}
```

---

## Quick Reference

### Do's

- ✅ Use gradients with 3+ stops on hero surfaces
- ✅ Animate clip-path + opacity + filter together for glows
- ✅ Use prime numbers for infinite pulse durations
- ✅ Fast snap-out (100-200ms), slow charge-in (9000ms+)
- ✅ Handle touch devices with IntersectionObserver
- ✅ Use `z-index: 1` on content above glow layers

### Don'ts

- ❌ Use flat colors on hero surfaces
- ❌ Animate a single property for glow effects
- ❌ Use slow exits — they feel broken, not atmospheric
- ❌ Leave hover-only animations without touch fallbacks
- ❌ Forget `overflow: hidden` on elements with `translateY(100%)` children

---

## Contributing

1. **New component?** Add it to the Component Library section with full CSS and usage example.
2. **New color?** Add it to the Color & Theming section with both theme variants.
3. **Breaking change?** Update the version number at the top and add a changelog entry.

**Review checklist:**
- [ ] Works in both Dusk and Dawn themes
- [ ] Has touch device fallback
- [ ] Meets WCAG AA contrast requirements
- [ ] Respects `prefers-reduced-motion`
- [ ] Documented with CSS + usage example
