# PassionSeed UI Design System

## Core Concept: Dawn & Dusk

PassionSeed uses two atmospheric themes tied to the user's role:

| Context | Theme | Meaning |
|---------|-------|---------|
| **Experts** | **Dusk** | The sun setting — experience, warmth, legacy, things earned over time |
| **Students** | **Dawn** | The sun rising — potential, possibility, new beginnings |

Every UI surface should feel like a moment in that sky. Animations are atmospheric, not decorative.

---

## Dusk Theme (Experts)

### Background Gradient
```css
background: linear-gradient(
  to bottom,
  #06000f 0%,
  #1a0336 28%,
  #3b0764 58%,
  #4a1230 82%,
  #2a0818 100%
);
```

### Palette
- **Deep space**: `#06000f` → `#1a0336`
- **Dusk purple**: `#3b0764` → `#4a1230`
- **Horizon amber**: `rgba(251, 146, 60, …)` — the focal glow color
- **Ember orange**: `#f97316`, `#ea580c`
- **Dusk pink**: `#be185d`

### Atmospheric Layers (in order, all `position: absolute`)
1. **Three cloud blobs** — large radial gradients in purple/pink, animated with `dusk-cloud-a/b/c` keyframes (60–70px drift, 14–22s cycles, opacity 0.28–0.62)
2. **Horizon glow** — `sun-rise` keyframe, starts as thin compressed sliver at bottom and slowly expands into a warm amber dome (48s cycle, `blur(52px)`)
3. **Ember particles** — 10 small dots rising with `ember-rise` keyframe, each with randomised size/delay/duration
4. **Star dot-grid** — SVG `<pattern>` of 1px circles at 7% opacity, covering upper 50% of sky

---

## Animation Principles

### The Core Rule: Slow Tension
Animations should build tension like physical heat or a rising sun. The sensation is: *something enormous is slowly becoming real.*

### Easing
```
cubic-bezier(0.05, 0.7, 0.35, 0.99)
```
- **0.05** initial velocity → almost imperceptible start
- **0.7** fast middle → quick burst of visible movement
- **0.35, 0.99** → dramatic deceleration, crawl to a stop
- Effect: immediate proof of life, then slow dramatic build

### Hover Pattern: Charge-In / Snap-Out
```css
/* Base element — fast snap-out on mouse-leave */
.component {
  transition: property 160ms ease-out;
}

/* Hover — slow charge-in using keyframe animations */
.component:hover {
  animation: component-rise 10000ms cubic-bezier(0.05, 0.7, 0.35, 0.99) forwards;
}
```
Never use a single `transition` for both directions. Use **keyframes for hover-in** (so values can build gradually from small to large) and **short transitions on the base element** for snap-out.

### Layered Glow: Reveal + Opacity + Blur Together
All three properties must animate together. A glow that reveals but stays sharp looks fake.

```css
/* Start: hidden, misty, diffuse */
.glow-layer {
  clip-path: inset(100% 0 0 0 round 13px); /* or translateY(100%) for overflow:hidden */
  opacity: 0;
  filter: blur(18px);
  transition: clip-path 200ms ease-out, opacity 200ms ease-out, filter 200ms ease-out;
}

/* Hover: revealed, bright, focused */
.parent:hover .glow-layer {
  clip-path: inset(0% 0 0 0 round 13px);
  opacity: 1;
  filter: blur(3px);
  transition:
    clip-path 9000ms cubic-bezier(0.05, 0.7, 0.35, 0.99),
    opacity   9000ms cubic-bezier(0.05, 0.7, 0.35, 0.99),
    filter    9000ms cubic-bezier(0.05, 0.7, 0.35, 0.99);
}
```

### Clip-Path Directions
- **Bottom-to-top reveal**: `inset(100% 0 0 0)` → `inset(0% 0 0 0)` + gradient `to top` (bright at bottom)
- **Top-to-bottom reveal**: `inset(0 0 100% 0)` → `inset(0 0 0% 0)` + gradient `to bottom` (bright at top)

### Wave Chaos (Infinite Pulse After Rise)
Use two independent `::before` and `::after` layers with **prime-number durations** so they never sync:

```css
/* Layer A — tighter, yellower */
animation: rise 14000ms ease forwards, wave-a 4231ms ease-in-out 14350ms infinite;

/* Layer B — softer, more orange, offset start */
animation: rise-b 14000ms ease 900ms forwards, wave-b 5711ms ease-in-out 14900ms infinite;
```

4231 and 5711 are both prime → LCM ~24M ms → effectively never synchronise → natural variation every cycle.

---

## Component Classes

### `.ei-card`
Dark glass card for the dusk theme. Defined in `app/globals.css`.

**Structure:**
- Base: glassmorphism background + subtle ring shadow
- `::before`: blurred amber glow layer, revealed bottom-to-top on hover
- `> *`: `position: relative; z-index: 1` to sit above the glow

**Key values:**
- Border radius: `12px` (card), `13px` (glow layer, 1px larger for inset overlap)
- Hover: border glows amber, floats up `-3px`, glow rises over 9000ms

### `.ei-button-dusk`
Primary CTA button for experts. Orange→pink gradient with animated inner heat.

**Structure:**
- Base: `linear-gradient(180deg, #f97316 0%, #ea580c 45%, #be185d 100%)`
- `::before`: yellow-gold heat layer, rises bottom-to-top
- `::after`: amber-orange second wave layer, independent timing
- `> *`: `z-index: 1`

**Hover sequence:**
1. Immediate nudge up (`translateY(-3px)`, 320ms springy)
2. After 350ms: inner heat begins rising (14000ms)
3. After 400ms: outer glow begins building (13000ms)
4. After 14s: both layers enter infinite wave pulsing with prime-number timing

---

## Mobile: Touch Device Animations

On touch devices (no hover), use `IntersectionObserver` + `@media (hover: none)`:

```typescript
// In any client component with .ei-button-dusk or .ei-card
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in-view");
    }),
    { threshold: 0.5 }
  );
  document.querySelectorAll(".ei-button-dusk, .ei-card").forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}, []);
```

```css
@media (hover: none) {
  .ei-button-dusk.in-view {
    /* same animations as :hover */
  }
}
```

Trigger when **50% of the element** is in the viewport. Re-run the observer when content changes (pass relevant state to the `useEffect` dependency array).

---

## Dawn Theme (Students)

> Not yet fully implemented. Mirror of dusk — same animation principles, different palette.

- Background: deep blue-black → cool purple → soft blue-pink near horizon
- Accent color: soft gold/warm white (first light) instead of amber
- Clouds: cooler blue-lavender tints
- Horizon glow: pale gold, not amber-orange
- Button: `linear-gradient` from deep blue → violet → rose (inverse of dusk)

---

## General Rules

1. **Never use flat colours** on hero surfaces. Use gradients with at least 3 stops.
2. **Never animate a single property** for a glow effect. Always move clip/transform + opacity + filter together.
3. **Snap-out must be fast** (100–200ms). Slow exits feel broken, not atmospheric.
4. **Use prime numbers** for any infinite loop durations to prevent visual sync.
5. **Always handle mobile** — if an animation is hover-driven, provide an `IntersectionObserver` equivalent for `@media (hover: none)`.
6. **Overflow: hidden** is required on any element that uses `translateY(100%)` to hide a child layer.
7. **`z-index: 1` on `> *`** whenever `::before`/`::after` are used as background glow layers.
