# The Next Decade Hackathon Design System

> **Version 1.0**
>
> This document outlines the design patterns and UI conventions for the Hackathon section of the PassionSeed platform. The hackathon uses a distinct, independent theme separate from the main PassionSeed Dawn/Dusk system.

---

## Core Concept: Bioluminescent Ocean

While the main platform uses sky-based themes (Dawn/Dusk), the Hackathon is an immersive, cinematic **underwater, bioluminescent experience**. 

The sensation is: *diving into the unknown, guided by organic, glowing light.*

**Key Characteristics:**
- **Deep, dark backgrounds** representing the ocean depths (`#03050a`)
- **Bioluminescent glows** using vibrant cyans, blues, and purples
- **Organic, fluid motion** with floating elements, jellyfish, and continuous wave animations
- **Glassmorphism** to represent looking through water or high-tech aquatic visors

---

## 1. Design Tokens (Color Palette)

The hackathon uses a highly specific subset of colors. Avoid using the standard Tailwind grays or neutral colors unless deeply tinted with blue.

### Primary Colors (Bioluminescent Glows)
| Token Concept | Hex Code | Usage |
|---------------|----------|-------|
| `hack-cyan` | `#91C4E3` | Primary accent, primary glows, Track 1 theme |
| `hack-blue` | `#65ABFC` | Bright highlights, active states, text links |
| `hack-purple-light` | `#A594BA` | Secondary accent, Track 2 theme, contrasting glows |
| `hack-purple-muted` | `#9D81AC` | Primary CTA buttons, interactive highlights |

### Backgrounds & Surfaces (The Depths)
| Token Concept | Hex Code | Usage |
|---------------|----------|-------|
| `hack-bg-deep` | `#03050a` | Main page background (deepest ocean) |
| `hack-bg-card` | `#0d1219` | Base color for glass cards |
| `hack-bg-elevated` | `#1a2530` | Form inputs, elevated panels |

### Borders & Muted Elements
| Token Concept | Hex Code | Usage |
|---------------|----------|-------|
| `hack-border-light` | `#7aa4c4` | Active borders, focus rings |
| `hack-border-muted` | `#5a7a94` | Standard borders, muted icon colors |
| `hack-border-dark` | `#4a6b82` | Subtle borders, subtle dividers |

---

## 2. Typography

Typography in the hackathon section blends technical precision with organic legibility.

| Font Family | CSS Variable | Usage |
|-------------|--------------|-------|
| **Mitr** | `var(--font-mitr)` | Eyebrows, small uppercase labels, tracking-widest text |
| **Bai Jamjuree** | `var(--font-bai-jamjuree)` | English headings, button text, standard UI |
| **Reenie Beanie** | `var(--font-reenie-beanie)` | Handwritten-style accents and subheadings |
| **Space Mono** | `var(--font-space-mono)` | Team lobby codes, numbers, track IDs |

**Typographic Patterns:**
- **Eyebrows:** `text-xs tracking-[0.25em] uppercase text-[#91C4E3]/50 font-[family-name:var(--font-mitr)]`
- **Glowing Headings:** `text-shadow: '0 0 30px rgba(145,196,227,0.3)'`
- **Lobby Codes:** Large, monospaced, with extreme letter spacing (`tracking-[0.3em]`)

---

## 3. Component Patterns

### Glass Cards
Cards are the primary container for content. They use a backdrop blur, a gradient background that is highly transparent, and subtle borders that glow on hover.

**Base Classes:**
```css
bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80
backdrop-blur-md
border border-[#4a6b82]/30
rounded-3xl
shadow-[0_0_30px_rgba(74,107,130,0.15)]
```

**Hover State (Glowing Border):**
Cards often use a pseudo-element behind the card to create a glowing border effect on hover.
```css
/* Applied to a wrapper behind the card content */
absolute -inset-0.5 bg-gradient-to-br from-[#91C4E3] via-[#91C4E3]/50 to-transparent
rounded-3xl opacity-30 group-hover:opacity-50 blur-sm transition-opacity duration-500
```

### Buttons
Buttons should feel tactile but ethereal, utilizing glow and subtle scaling.

**Primary CTA:**
```css
bg-[#9D81AC] hover:bg-[#8a6f99] text-white
rounded-full px-12 py-6
shadow-[0_0_40px_rgba(157,129,172,0.6)]
hover:shadow-[0_0_60px_rgba(157,129,172,1)]
transition-all duration-300 transform hover:scale-105
```

**Secondary Action / Outline:**
```css
bg-white/5 hover:bg-white/10 text-white
border border-white/10 hover:border-[#91C4E3]/50
rounded-xl px-6 py-3
transition-all duration-300
```

### Form Inputs
Inputs use a slightly elevated, highly transparent background to stand out from the deep background, with glowing focus rings.

```css
bg-[#1a2530]/80 text-white placeholder:text-gray-500
border-2 border-[#5a7a94]/40
rounded-xl px-4 py-3
focus:border-[#7aa4c4] focus:outline-none
focus:shadow-[0_0_20px_rgba(106,154,196,0.3)]
transition-all duration-300
```

---

## 4. Animation Patterns

Animations are crucial to the hackathon's underwater theme. Motion should never be abrupt; it should feel like moving through water.

### CSS Keyframes
*Note: These are standard patterns used in the hackathon section.*

- **Continuous Float:** `animation: float 6s infinite ease-in-out` (Used for floating UI elements, jellyfish)
- **Twinkle:** `animation: twinkle 2-5s ease-in-out infinite` (Used for background starfield/particles)
- **Title Glow:** `animation: titleGlowUp 1.2s ease-out forwards` (Used for initial hero text entry)
- **Waves:** `animation: waveShift 11s linear infinite` (Used for multi-layered SVG waves)

### GSAP (GreenSock) Transitions
The hackathon uses GSAP for complex, orchestrated sequence animations, particularly page transitions.
- **The "Water Fill" Transition:** When navigating between major hackathon pages (e.g., from landing to register), a water element rises from `yPercent: 100` to `0` with `power3.inOut` easing over 0.9 seconds.

### Reveal & Stagger
When sections mount, they should float up and fade in:
```css
initial={{ opacity: 0, y: 30 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: "easeOut" }}
```

---

## 5. Backgrounds & Environments

### The Starfield / Particle Background
Most pages utilize a fixed, non-interactive background layer of white `div` elements with varying opacity and sizes (1px - 3px) that use a CSS `twinkle` animation.

### Ambient Glow Orbs
Large, highly blurred `div`s placed absolutely in the background to create bioluminescent hot spots.
```css
absolute w-[500px] h-[500px] rounded-full blur-[150px]
bg-[#91C4E3] opacity-5 /* or 10% for brighter areas */
```

### SVGs & Illustrations
Always use the specialized Hackathon SVGs (Jellyfish, Clione, custom icons) located in `public/hackathon/Creature/`. They should always have a slow `float` animation applied and a drop-shadow matching their predominant color to enhance the bioluminescent feel.