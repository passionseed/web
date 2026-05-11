# Product

## Register

product

## Users

**Primary: Students (Dawn theme)**
- Thai high school and university students exploring career paths
- Often uncertain, seeking direction, motivated by discovery rather than obligation
- Context: browsing on phones between classes, late-night deep dives, sharing with friends
- Job to be done: "I want to try a career before I commit years to it"

**Secondary: Experts (Dusk theme)**
- Working professionals willing to share their career stories
- Context: spare moments between meetings, evening reflection
- Job to be done: "I want to give back without a huge time commitment"

**Tertiary: Educators / Administrators**
- Teachers, mentors, hackathon organizers managing classrooms and teams
- Context: planning sessions, grading, team coordination
- Job to be done: "I need to guide and track student progress efficiently"

## Product Purpose

PassionSeed helps students discover their career path through immersive, real-world challenges designed by actual professionals. Instead of reading about careers, students experience them: 5-day hackathons, AI-guided expert interviews, interactive learning maps, and team collaborations.

Success looks like: a student who arrived uncertain leaves with a clear direction, a portfolio of work, and connections to mentors in that field.

## Brand Personality

**Warm, ambitious, playful**

- **Warm**: The interface feels like a mentor's encouragement, not a school's authority. Colors are atmospheric (sunrise/sunset), not institutional. Language is conversational, never condescending.
- **Ambitious**: We believe every student has extraordinary potential. The UI should feel expansive, like looking at a horizon. Big moments (completing a challenge, earning a badge) feel earned and significant.
- **Playful**: Career exploration is an adventure, not a chore. Game-like elements (maps, nodes, streaks, badges) are integrated thoughtfully, never childish. The tone is "let's figure this out together" not "you must complete this module."

## Anti-references

- **Corporate ed-tech**: Bright primary colors, stock illustrations of smiling students, rigid module-based layouts, progress bars that feel like compliance tracking. PassionSeed is not Khan Academy, not Coursera, not LinkedIn Learning.
- **Generic SaaS minimalism**: Gray-on-white, thin lines, no personality, everything looks like Notion or Linear. Our users are young and emotional; the interface should meet them there.
- **Gamification overload**: Points, leaderboards, and badges as the primary motivator. Our playfulness serves discovery, not addiction.
- **Parent-facing design**: Talking down to students or designing for the parent who pays. Students are the primary user.

## Design Principles

1. **Atmosphere over decoration**: Every animation, color, and gradient should feel like a moment in a sky (Dawn or Dusk). If it doesn't evoke a physical place, it doesn't belong.

2. **Show, don't tell**: Students learn by doing. The UI should demonstrate progress through tangible artifacts (completed maps, submitted work, earned badges) rather than abstract percentages.

3. **Earned warmth**: The interface is inviting by default, but the deepest warmth comes from accomplishment. Glow effects intensify with progress. The more you engage, the more the UI celebrates you.

4. **Dual identity, unified soul**: Dawn and Dusk look different but feel related. A student who becomes an expert should recognize the same heartbeat in a new palette.

5. **Respect the journey**: Career exploration is nonlinear. The UI must accommodate wandering, backtracking, and sudden clarity without judgment. No "you're falling behind" messaging.

## Accessibility & Inclusion

- **WCAG 2.1 AA** minimum for all text and interactive elements
- **Reduced motion**: All atmospheric animations respect `prefers-reduced-motion`; essential transitions (modal open, toast appear) remain but are instant
- **Color independence**: Status and progress are never communicated by color alone; icons, text labels, and patterns always accompany color
- **Thai language first**: All Thai text uses Bai Jamjuree or Kodchasan fonts; minimum 10px size; line height 1.5+ for body text
- **Mobile-first**: Primary usage is on phones; touch targets minimum 48x48px; no hover-only interactions without touch fallbacks
