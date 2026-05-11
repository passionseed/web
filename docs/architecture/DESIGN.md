---
name: PassionSeed
description: Career exploration platform with Dawn (students) and Dusk (experts) atmospheric themes
colors:
  dusk-space-950: "#06000f"
  dusk-space-900: "#1a0336"
  dusk-purple-800: "#3b0764"
  dusk-ember-orange: "#f97316"
  dusk-ember-red: "#ea580c"
  dusk-pink: "#be185d"
  dusk-amber: "#fb923c"
  dawn-space-950: "#020617"
  dawn-space-900: "#0f172a"
  dawn-purple-800: "#1e1b4b"
  dawn-blue: "#3b82f6"
  dawn-indigo: "#6366f1"
  dawn-violet: "#a855f7"
  dawn-gold: "#fed95c"
  neutral-text-primary: "#e2e8f0"
  neutral-text-secondary: "#94a3b8"
  neutral-text-muted: "#64748b"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
typography:
  display:
    fontFamily: "var(--font-kodchasan), var(--font-libre-franklin), sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-kodchasan), var(--font-libre-franklin), sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--font-bai-jamjuree), var(--font-libre-franklin), sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "var(--font-bai-jamjuree), var(--font-libre-franklin), sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "var(--font-bai-jamjuree), var(--font-libre-franklin), sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono:
    fontFamily: "var(--font-space-mono), monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "2.5rem"
components:
  button-dusk:
    backgroundColor: "linear-gradient(180deg, {colors.dusk-ember-orange} 0%, {colors.dusk-ember-red} 45%, {colors.dusk-pink} 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0.75rem 2rem"
  button-dawn:
    backgroundColor: "linear-gradient(180deg, {colors.dawn-blue} 0%, {colors.dawn-indigo} 45%, {colors.dawn-violet} 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0.75rem 2rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-text-primary}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1.5rem"
  card-dusk:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.neutral-text-primary}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  card-dawn:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.neutral-text-primary}"
    rounded: "16px"
    padding: "1.5rem"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.neutral-text-primary}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  badge-dusk:
    backgroundColor: "rgba(251, 146, 60, 0.1)"
    textColor: "{colors.dusk-amber}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  badge-dawn:
    backgroundColor: "rgba(99, 102, 241, 0.1)"
    textColor: "#818cf8"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
---

# Design System: PassionSeed

## 1. Overview

**Creative North Star: "The Sunrise Workshop"**

PassionSeed is a warm studio where potential is crafted into reality. The interface feels like walking into a maker space at dawn: the light is soft and golden, the tools are inviting, and everything hums with possibility. This is not a sterile classroom or a corporate dashboard. It is a place where young people come to build their future, guided by those who have already walked the path.

The visual system is built around two atmospheric themes — **Dawn** for students (rising sun, cool blues warming into gold) and **Dusk** for experts (setting sun, deep purples cooling into amber). Both share the same structural DNA: fluid, luminous components that glow and respond like living things. The difference is the emotional temperature — Dawn is hopeful and open, Dusk is warm and earned.

This system explicitly rejects corporate ed-tech aesthetics: no bright primary colors, no stock illustrations, no rigid module layouts. It also rejects generic SaaS minimalism — gray-on-white, thin lines, no personality. PassionSeed's users are young and emotional; the interface meets them there.

**Key Characteristics:**
- Atmospheric depth through glow, blur, and gradient stacks — never flat colors
- Dual-theme identity (Dawn/Dusk) with a unified structural language
- Components that feel fluid and luminous, responding to interaction with slow-building warmth
- Thai-first typography with Bai Jamjuree and Kodchasan
- Prime-number animation durations for organic, never-syncing pulse effects
- Mobile-first with touch fallbacks for all hover-driven animations

## 2. Colors

The palette is organized around two atmospheric gradients that serve as the emotional foundation of the interface.

### Primary (Dusk — Experts)
- **Deep Space Violet** (`#06000f`): The darkest background layer. Used for base surfaces in Dusk contexts.
- **Twilight Purple** (`#1a0336`): Secondary background depth. The transition zone between space and atmosphere.
- **Amber Horizon** (`#f97316` → `#ea580c` → `#be185d`): The Dusk accent gradient. Used for primary CTAs, active states, and glow effects. Represents the setting sun's warmth.
- **Ember Gold** (`#fb923c`): Supporting amber for badges, highlights, and secondary emphasis.

### Primary (Dawn — Students)
- **Deep Dawn Blue** (`#020617`): The darkest background layer for Dawn contexts.
- **Morning Indigo** (`#0f172a`): Secondary background depth with a cooler tone.
- **Sunrise Spectrum** (`#3b82f6` → `#6366f1` → `#a855f7`): The Dawn accent gradient. Blue to violet represents the first light meeting the night sky.
- **Pale Gold** (`#fed95c`): Supporting gold for Dawn highlights and warm accents.

### Neutral
- **Cloud White** (`#e2e8f0`): Primary text on dark backgrounds. High contrast, slightly cool.
- **Mist Gray** (`#94a3b8`): Secondary text, labels, placeholders.
- **Shadow Gray** (`#64748b`): Muted text, disabled states, tertiary information.

### Semantic
- **Success Green** (`#10b981`): Positive states, completions, verified actions.
- **Warning Amber** (`#f59e0b`): Caution states, pending actions.
- **Error Red** (`#ef4444`): Destructive actions, validation errors.

### Named Rules
**The Gradient Minimum Rule.** Never use flat colors on hero surfaces or primary interactive elements. Minimum 3 gradient stops. A flat color is a dead color.

**The Atmosphere-First Rule.** Depth is created through layered gradients, glow effects, and blur — not through shadows or borders. Shadows are structural and rare; glow is emotional and primary.

## 3. Typography

**Display Font:** Kodchasan (Thai) / Libre Franklin (Latin)
**Body Font:** Bai Jamjuree (Thai) / Libre Franklin (Latin)
**Mono Font:** Space Mono

**Character:** The type pairing is warm and approachable with a clear hierarchy. Kodchasan headlines feel bold and optimistic — like a headline you'd see on a workshop poster. Bai Jamjuree body text is readable and friendly, with enough character to feel human. Space Mono adds technical precision for code, IDs, and data labels.

### Hierarchy
- **Display** (700, clamp(2.5rem, 6vw, 4rem), line-height 1.1): Hero headlines, landing page titles. Used sparingly — one per page maximum.
- **Headline** (700, clamp(1.75rem, 4vw, 2.25rem), line-height 1.2): Section titles, modal headers, map names.
- **Title** (600, 1.25rem, line-height 1.3): Card titles, node names, form section headers.
- **Body** (400, 1rem, line-height 1.6): Paragraphs, descriptions, form content. Max line length 65–75ch.
- **Label** (600, 0.875rem, letter-spacing 0.02em): UI labels, button text, badge text, uppercase for section labels.
- **Mono** (400, 0.8125rem, line-height 1.5): Code blocks, technical IDs, timestamps.

### Named Rules
**The Thai Space Rule.** Thai script requires more vertical breathing room. Minimum line-height 1.5 for body text, 1.6 preferred. Never go below 10px for Thai — complex glyphs become illegible.

**The One Voice Rule.** The display font (Kodchasan/Libre Franklin) is used for headlines only. Body and UI text always use Bai Jamjuree/Libre Franklin. Never mix display fonts into body text for emphasis.

## 4. Elevation

PassionSeed uses **atmospheric layering** to create depth. There are no drop shadows on cards or buttons at rest. Depth is conveyed through:

1. **Gradient stacks** — Backgrounds use 3–5 color stops to create implied depth
2. **Glow layers** — Interactive elements emit soft, colored light on hover
3. **Blur overlays** — Atmospheric clouds and orbs use heavy blur (18–52px) to push them back
4. **Inset shadows** — Subtle inner shadows on cards create surface tension

When shadows do appear, they are structural and minimal:
- **Ambient shadow** (`0 4px 12px rgba(0, 0, 0, 0.3)`): Card base shadow, barely visible
- **Elevated shadow** (`0 8px 24px rgba(0, 0, 0, 0.4)`): Card hover state, paired with glow

### Named Rules
**The Glow-Not-Shadow Rule.** Surfaces are flat at rest. Depth emerges through colored glow (amber for Dusk, gold/blue for Dawn) that builds slowly on interaction. A shadow says "this is above"; a glow says "this is alive."

## 5. Components

### Buttons
- **Shape:** Generously rounded (12px radius), substantial padding (0.75rem 2rem), minimum 48px touch target
- **Primary (Dusk):** Gradient from `#f97316` → `#ea580c` → `#be185d`, white text, subtle inner shadow. On hover: slow rise animation (10s), dual glow layers with prime-number wave cycles (4231ms, 5711ms)
- **Primary (Dawn):** Gradient from `#3b82f6` → `#6366f1` → `#a855f7`, white text, same interaction pattern with blue-violet glow
- **Outline:** Transparent background, `rgba(255,255,255,0.15)` border, hover shifts border to theme accent with subtle background tint
- **Disabled:** 50% opacity, `not-allowed` cursor, all animations disabled

### Cards
- **Shape:** 12px radius, subtle gradient background (`rgba(255,255,255,0.065)` → `rgba(255,255,255,0.018)`)
- **Border:** 1px `rgba(255,255,255,0.09)` with subtle colored edge glow
- **Hover:** Bottom-to-top glow reveal via `clip-path` + `opacity` + `filter` animation (9s charge-in, 200ms snap-out). Card lifts 3px.
- **Variants:** `ei-card--static` (no hover effects), `ei-card--lit` (permanently glowing, for featured/selected states)

### Inputs
- **Shape:** 10px radius, `rgba(255,255,255,0.03)` background, 1px `rgba(255,255,255,0.08)` border
- **Focus:** Border shifts to theme accent (amber for Dusk, indigo for Dawn), 3px glow ring at 15% opacity
- **Placeholder:** `rgba(100,116,139)` — visible but subordinate
- **Error state:** Border shifts to error red with subtle red glow ring

### Badges
- **Shape:** Pill (full radius), compact padding (0.25rem 0.75rem), uppercase text with 0.05em tracking
- **Dusk variant:** Amber tint background, amber text, optional pulsing dot
- **Dawn variant:** Indigo tint background, indigo text, optional pulsing dot
- **Success variant:** Green tint background, green text

### Navigation
- **Style:** Minimal, transparent background over atmospheric gradients
- **Typography:** Label style, medium weight
- **Active state:** Subtle background tint in theme accent at 15% opacity
- **Mobile:** Full-screen overlay with atmospheric background maintained

### Toasts
- **Shape:** 14px radius, top-center positioning, min-width 320px
- **Animation:** Slide in from top with spring easing (240ms), fade out on dismiss
- **Variants:** Success (green tint), Error (red tint), Info (blue tint)

## 6. Do's and Don'ts

### Do:
- **Do** use gradient backgrounds with 3+ stops on all hero and atmospheric surfaces
- **Do** animate `clip-path` + `opacity` + `filter` together for all glow effects
- **Do** use prime-number durations (4127ms, 4231ms, 5503ms, 5711ms) for infinite pulse layers
- **Do** use `cubic-bezier(0.05, 0.7, 0.35, 0.99)` for tension animations and `cubic-bezier(0.4, 0, 0.2, 1)` for snap transitions
- **Do** provide `IntersectionObserver` + `.in-view` class fallbacks for all hover animations on touch devices
- **Do** respect `prefers-reduced-motion` — disable atmospheric animations, keep essential state transitions
- **Do** use Thai fonts (Bai Jamjuree, Kodchasan) for all Thai text
- **Do** maintain a minimum 48x48px touch target for all interactive elements

### Don't:
- **Don't** use flat colors on hero surfaces or primary interactive elements. Every surface should have gradient depth.
- **Don't** animate a single property for glow effects. A glow that reveals but stays sharp looks fake.
- **Don't** use slow exit animations. Fast snap-out (100–200ms) on mouse-leave; slow charge-in (9s+) on hover.
- **Don't** leave hover-only animations without touch fallbacks. Always handle `@media (hover: none)`.
- **Don't** use border-left or border-right greater than 1px as a colored accent on cards or list items.
- **Don't** use gradient text (`background-clip: text`). Use a single solid color with weight or size for emphasis.
- **Don't** use glassmorphism decoratively. Blur and transparency are purposeful, never default.
- **Don't** use the hero-metric template (big number, small label, supporting stats, gradient accent).
- **Don't** create identical card grids with icon + heading + text repeated endlessly.
- **Don't** use modals as a first thought. Exhaust inline and progressive alternatives first.
- **Don't** design like corporate ed-tech: bright primary colors, stock illustrations, rigid module layouts, progress bars that feel like compliance tracking.
- **Don't** design like generic SaaS: gray-on-white, thin lines, no personality, everything looks like Notion or Linear.
