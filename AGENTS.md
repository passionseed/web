# AGENTS.md

This file provides guidance to Codex (Codex.ai/code), Cursor, Claude, Antigravity, and other AI agents working with code in this repository.

## 🧠 Company Brain & Internal Knowledge Base (`../internal`)

`passionseed/web` (this repo) is the **public application repository**.
`passionseed/internal` (`https://github.com/passionseed/internal`) is the private **Source of Truth & Company Brain** (Product Strategy, Curricula, Research, Specs, and Design Docs).

When designing features, writing copy, or modifying product logic, **treat `../internal` like a local RAG / NotebookLM knowledge base**:

### 1. Where to Look

| Directory | What's Inside | Use When |
| :--- | :--- | :--- |
| `../internal/docs/project/` | Strategy, Safeguarding, Business Canvas | Aligning on core business and product rules |
| `../internal/docs/plans/` & `../internal/docs/superpowers/` | Technical PRDs, Sprint Plans, Specs | Implementing or refactoring major features |
| `../internal/curriculum/` | Course outlines, PathLab exercises | Creating or updating learning content |
| `../internal/research/` | User interviews, B2B market intelligence | Designing user flows and marketing copy |
| `../internal/scripts/` | Ops scripts, one-off backfills | Looking for reference data migration logic |

### 2. Agent Retrieval Protocol (RAG Workflow)
1. **Search before Coding**: Before building any new feature or changing domain behavior, search `../internal` for existing PRDs or specs (`grep` or file search in `../internal`).
2. **Grounding & Citations**: Ground your architecture in internal docs (e.g., cite `Ref: ../internal/docs/plans/xyz.md`).
3. **Public Boundary**: Never commit confidential docs, customer data, or student PII back into the public `web` repo.

## 🧭 Core Philosophy & Product Architecture

### 1. The Core Philosophy: Self-Determination
At the heart of PassionSeed is **Self-Determination**: the conviction that young people must author their own futures, rather than being passively steered by parental anxiety, tutor hype, or school pressure.

Traditional Thai education is cram-and-forget, pay-to-win, and overrun by passive certificate camps ("ค่ายนั่งฟังสะสมพอร์ต"). PassionSeed directly opposes this by anchoring on the three core pillars of Self-Determination Theory:
- **Autonomy**: The student chooses the problem, defines the hypothesis, and makes the call to pivot. Mentors guide; they never spoon-feed, dictate, or ghostwrite.
- **Competence**: Built through collision with reality, not arbitrary grades. An ugly working prototype tested by real humans beats a polished slide deck every single time. Failure data and pivot logs are celebrated as authentic learning assets.
- **Relatedness**: Surrounded by peers and alumni who treat self-directed building as normal, not exceptional.

### 2. The Strategy: The Trojan Horse Value Proposition
We operate with a deliberate **Trojan Horse** strategy:

- **The External Horse (The Commercial Wedge / What Gets Us in the Door)**:
  - **What parents buy**: Immediate relief from admissions panic, standing out in TCAS Round 1, and a verifiable, uncheatable portfolio asset that beats thousands of generic certificate holders.
  - **What students buy**: A fast, exciting 7-day sprint to ship a live project with a cool prototype and a 1-page case study without sitting through boring lecture camps.
  - *Core Copy Rule*: Never sell abstract philosophy to the market. Parents and students do not pay for "Self-Determination Theory". They pay for an urgent, high-stakes admission outcome.
- **The Internal Payload (The Authentic Transformation)**:
  - **What is smuggled inside**: **Self-determination, agency, and trajectory shift**.
  - Once inside the sandbox, students cannot passively spectate or outsource the work. They are forced into direct collision with reality: locking an atomic scope, shipping an ugly MVP to real external users, absorbing failure data, and defending their pivots.
  - They enroll to get a TCAS portfolio project; they graduate as self-directed builders who own their decisions.

### 3. The Current Product Ladder: TechSeed → SHIFT
*(Note: ProjectSeed is paused for now. All focus is strictly on the sequence below.)*

1. **Stage 1: TechSeed (The Spark & Builder Foundation)**
   - Hands-on immersion where students experience the shift from passive consumer to active creator.
   - Proves personal agency and trajectory change. Alumni from TechSeed naturally return to mentor subsequent cohorts.

2. **Stage 2: SHIFT (The 7-Day Proof-of-Work Sandbox)**
   - Target surface: `/shift`
   - Pricing: **2x the price** (~฿1,980 - ฿2,000, up from the early ฿990 exploratory tier). The higher price establishes a genuine commitment filter, validates willingness-to-pay, and sustains authentic mentor attention.
   - Cadence & Deliverables:
     - Day 1: Scope Lock & Atomic Hypothesis (cut 80% of unnecessary features, lock 1 page).
     - Day 3-5: The Ugly Ship & Pivot Check (zero-code or hardware prototype tested with external users; capture failure data).
     - Day 7: Reality Collision & 1-Page Case Study (includes an uncheatable Pivot Log for university portfolio/TCAS).
   - Core Hook: "เลิกสะสมใบเซอร์ค่ายนั่งฟัง แล้วมาสร้าง Live Project พร้อม Pivot Log และ 1-Page TCAS Case Study." Replaces passive attendance certificates with uncheatable evidence of self-authored problem solving.

### 4. Audience & Communication Principles
- **The Student (User)**: Must feel respected as an autonomous builder. Never talk down, lecture, or use corporate ed-tech jargon.
- **The Parent (Buyer)**: Needs evidence of real-world capability, practical problem-solving, and safety, rather than empty admissions hype.
- **Safeguarding**: Non-negotiable duty of care. No private 1:1 Discord DMs with minors; all work happens in visible group channels or forum threads.

## UI Design System — REQUIRED READING

**Before building or modifying any UI, read [`docs/ui-design-system.md`](docs/ui-design-system.md).**

Key rules (full details in the doc):
- PassionSeed uses **Dawn** (students) and **Dusk** (experts) atmospheric themes — not generic dark/light mode
- All glow animations must animate **clip-path + opacity + filter together** — never just one property
- Hover-in uses **keyframe animations** (values build gradually); hover-out uses short base transitions (snap back fast)
- Use `cubic-bezier(0.05, 0.7, 0.35, 0.99)` for tension animations
- Infinite pulse layers use **prime-number durations** to prevent visual sync
- Mobile touch devices: use `IntersectionObserver` + `@media (hover: none)` — never leave hover-only animations unhandled
- Reuse `.ei-card` and `.ei-button-dusk` CSS classes from `app/globals.css` — do not redefine them inline
- Marketing/landing pages use **Basecamp-style margin notes** (`.pathlab-note` in `app/globals.css`): short, warm, humane asides in a yellow highlighter set at a casual angle. One per section, never on headings or body copy. Each note says the quiet human thing formal copy cannot (e.g. "รุ่นพี่เขียนเองทุกคน ไม่ได้จ้างนะ"). Copy lives in the `NOTES` block of `lib/content/pathlab-page.ts`; full spec in `docs/ui-design-system.md`
- No em dashes (—) in user-facing copy. Use a comma, a colon, or rewrite the sentence

## PathLab Maps, Canonical Architecture

For new or modified PathLab work, the source of truth is the legacy learning-map
and node system. PathLab is a map of real work, not a separate seed/day content
runtime.

Use these tables and surfaces:

- `learning_maps` for the map record and public metadata
- `map_nodes` for each learner action or decision
- `node_content` for instructions, media, and reference material
- `node_assessments` and `quiz_questions` for evidence and checks
- `node_paths` for prerequisites and progression
- `user_map_enrollments` and `student_node_progress` for enrollment and progress
- `app/map/[id]/page.tsx` and `components/map/MapViewer.tsx` for the learner view

Do not create new PathLab content in `path_days`, `path_activities`, or other
seed/day activity tables. Existing `seeds`, `paths`, `path_days`, and
`path_activities` rows are compatibility data from the earlier implementation;
inspect actual imports before touching them, and do not treat them as the
canonical content model for new work. If a generator still emits `seed`,
`path`, or `days` fields, treat those as draft/editorial grouping metadata and
normalize the saved experience into map nodes and node paths.

Before creating or publishing a short Micro PathLab, read
[`skills/create-micro-pathlab-map/SKILL.md`](skills/create-micro-pathlab-map/SKILL.md).
Micro PathLabs use the same map/node contract and render through
`app/map/[id]/page.tsx`; do not route them through a new seed/day runtime.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Push database changes (applies to production — see note below)
supabase db push
```

**The local Supabase database is no longer used.** Migrations are applied
directly to production. Since production is the first Postgres to parse a new
migration, keep migrations additive and idempotent: `ADD COLUMN IF NOT
EXISTS`, nullable columns, `CREATE INDEX IF NOT EXISTS` so a prod-first
apply cannot break existing rows.

## Architecture Overview

**Very important**: Every code must follow the patterns and conventions defined in this document. Do not write big chunks of code without breaking them down into smaller, reusable functions or components. Make sure the code is deep, modular and easy to read. Follow best software engineering practices.

### Tech Stack

- **Framework**: Next.js 15.4.5 with App Router
- **Styling**: TailwindCSS with Shadcn/ui components
- **Database**: Supabase with PostgreSQL
- **Authentication**: Supabase Auth with SSR patterns
- **State Management**: React hooks + Zustand (implied by patterns)
- **Testing**: Jest with React Testing Library

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable React components
- `components/ui/` - Shadcn/ui component library
- `lib/supabase/` - Supabase database operations and utilities
- `types/` - TypeScript type definitions
- `utils/supabase/` - Supabase client configuration
- `supabase/migrations/` - Database schema migrations

### Authentication Pattern

**CRITICAL**: Follow the Supabase SSR pattern exactly as defined in `system-prompt.md`:

- Use `@supabase/ssr` package only
- Use `getAll()` and `setAll()` cookie methods only
- NEVER use individual cookie methods (`get`, `set`, `remove`)
- NEVER use `@supabase/auth-helpers-nextjs`

Server client pattern (`utils/supabase/server.ts`):

```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        /* implementation */
      },
    },
  }
);
```

### Data Flow

1. **Server Components**: Fetch data in `app/` page components using server clients
2. **Client Components**: Receive data as props, use client clients for mutations
3. **API Routes**: Handle form submissions and mutations in `app/api/` routes

### Database Schema Highlights

**Core Entities**:

- `classrooms` - Learning environments with join codes
- `classroom_memberships` - User enrollment in classrooms
- `classroom_teams` - Student collaboration groups
- `learning_maps` - Interactive learning content
- `map_nodes` - Individual learning nodes
- `team_memberships` - Team participant relationships
- `user_map_enrollments` - User enrollment in learning maps
- `student_node_progress` - User progress on individual map nodes

**Team System**:

- Teams belong to classrooms
- Students can be in one team per classroom
- Team leaders have management permissions
- Teams can fork learning maps for collaboration

**Learning Map System**:

- Maps contain nodes that represent learning activities
- Nodes can have prerequisites (via `node_paths`)
- Progress tracking: `not_started`, `in_progress`, `submitted`, `passed`, `failed`
- Users can enroll in multiple maps simultaneously
- The `getNextNodesToComplete()` function finds unlocked, incomplete nodes across all enrolled maps

### Testing Approach

- Manual integration tests in `lib/supabase/__tests__/`
- Jest configured for component testing
- Focus on Supabase operation validation

### Styling Guidelines

- Use TailwindCSS utility classes
- Follow Shadcn/ui component patterns
- Maintain consistent spacing and typography
- Use existing color palette from Tailwind config

### Environment Variables

Required Supabase environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Key Components

**UserPortal (`components/user-portal.tsx`)**:
- Main dashboard component for authenticated users
- Shows personalized content: reflections, workshops, communities
- **Next Steps Card**: Displays up to 5 upcoming nodes from enrolled learning maps
  - Prioritizes "in_progress" nodes over "not_started" nodes
  - Shows map title, node title, and progress status
  - Links directly to the map view
  - Empty state encourages users to browse and enroll in maps
- Fetches data client-side using `getNextNodesToComplete()` from `lib/supabase/enrollment.ts`

### Common Patterns

**Data Fetching in Server Components**:

```typescript
export default async function Page() {
  const supabase = createClient();
  const { data } = await supabase.from('table').select();
  return <Component data={data} />;
}
```

**Authentication Checking**:

```typescript
const { data } = await supabase.auth.getUser();
if (!data?.user) redirect("/login");
```

**Error Handling**:

```typescript
try {
  // Supabase operations
} catch (error) {
  console.error("Operation failed:", error);
  // Handle gracefully
}
```

### File Naming Conventions

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `PascalCase.ts`
- API routes: `route.ts`
- Pages: `page.tsx`

### Middleware

Authentication middleware in `middleware.ts` handles:

- Session management
- Route protection
- Admin route validation

### Supabase Features Used

- Row Level Security (RLS) policies
- Database triggers
- PostgreSQL functions
- Real-time subscriptions
- Storage buckets

### Performance Considerations

- Use server components for data fetching
- Implement proper loading states
- Optimize database queries with indexes
- Use Supabase's real-time features sparingly

### Security Practices

- Always implement RLS policies
- Validate user input in API routes
- Use proper error handling to avoid information leakage
- Follow Supabase authentication best practices

### Secret Management — CRITICAL

**NEVER hardcode secrets, API keys, tokens, or credentials in any source file.** This includes:
- Supabase anon keys, service role keys, or JWT tokens
- Resend API keys (`re_*`)
- MCP server access tokens
- Session cookies, auth tokens, or refresh tokens
- Database connection strings with embedded passwords

**Always use environment variables.** Scripts must validate required env vars and exit gracefully if missing:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}
```

**Never commit credential dump files.** This includes:
- Browser cookie exports (e.g., `outlook-chula.json`)
- MCP server configurations with tokens (e.g., `.cursor/mcp.json`)
- Local database dumps containing user data
- `.env.local` or any `.env*` files

**Add sensitive patterns to `.gitignore` immediately** when discovered:
```
.cursor/
outlook-chula.json
scripts/*-local.js
scripts/*-local.mjs
```

Before staging changes, always audit for accidental secret inclusion.

## Module Resolution Rules
- When working with components that have both `Component.tsx` and `Component/index.tsx`:
  1. ALWAYS check which version is imported in the consuming files
  2. Use grep/search to find actual import statements
  3. Ask for clarification if unclear
## Known Duplicate Components
- MapViewer: Two versions exist. Check imports before editing
