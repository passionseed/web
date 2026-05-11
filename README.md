# PassionSeed :fire:

> Discover Your Passion, Ignite Your Potential

PassionSeed is a Next.js learning platform where students explore career paths through immersive, real-world challenges designed by actual professionals. Features include interactive learning maps, AI-guided expert interviews, hackathon simulations, team collaboration, and classroom management.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: TailwindCSS + [Shadcn/ui](https://ui.shadcn.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Auth**: Supabase Auth with SSR cookie sessions
- **Maps**: [React Flow](https://reactflow.dev/) for interactive learning map visualization
- **AI**: Vercel AI SDK (OpenAI, Anthropic, Google, DeepSeek)
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation

```bash
# Install dependencies
pnpm install

# Set up local secrets (creates .env.local)
./scripts/setup-local-secrets.sh

# Start Supabase locally
npx supabase start

# Start the dev server (with Turbopack)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build |
| `pnpm build:analyze` | Build with bundle analyzer |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Jest tests |
| `pnpm test:watch` | Run Jest in watch mode |
| `pnpm optimize:images` | Convert PNGs to WebP |

---

## Architecture

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages and API routes |
| `components/` | Reusable React components |
| `components/ui/` | Shadcn/ui primitives (50+ components) |
| `lib/` | Application logic — Supabase wrappers, hooks, AI services |
| `lib/supabase/` | Database operations and queries |
| `lib/ai/` | AI generation services (direction finder, quiz, etc.) |
| `utils/supabase/` | Browser + server Supabase client configuration |
| `types/` | Shared TypeScript type definitions |
| `supabase/migrations/` | Database schema migrations |
| `docs/` | Project documentation (see [docs/README.md](docs/README.md)) |
| `scripts/` | Utility scripts (SQL imports, debug, etc.) |

### Core Domains

1. **Learning Maps** — Gamified node-based learning paths with content, assessments, and progress tracking. Students unlock nodes as they complete prerequisites.
2. **Expert Interviews** — AI-facilitated career exploration through structured conversations with professionals.
3. **Hackathons** — 5-day simulation events with team formation, challenges, submissions, and AI-assisted grading.
4. **Classrooms** — Instructor-created environments with join codes, assignments, team management, and progress dashboards.
5. **Direction Finder** — AI-powered career recommendation system based on student profiles.

### Authentication

Supabase Auth with SSR. Uses `@supabase/ssr` with `getAll()`/`setAll()` cookie methods only. See `utils/supabase/server.ts` and `utils/supabase/client.ts` for implementation patterns.

### Design System

PassionSeed uses two atmospheric themes:

- **Dawn** — Student-facing. Cool blues warming into gold. Optimistic, exploratory.
- **Dusk** — Expert-facing. Deep purples cooling into amber. Warm, authoritative.

Both share the same structural DNA: fluid, luminous components that glow and respond like living things. See [docs/architecture/DESIGN.md](docs/architecture/DESIGN.md) for the full design system specification.

---

## Database

Local development uses the Supabase CLI. Migrations live in `supabase/migrations/` and are applied with:

```bash
npx supabase db push --local
```

The `supabase/schema.sql` file contains the complete schema for reference.

---

## Documentation

All documentation is organized in `docs/`:

| Category | Path |
|----------|------|
| Product & Project | [docs/project/](docs/project/) |
| Architecture & Schema | [docs/architecture/](docs/architecture/) |
| Feature Guides | [docs/features/](docs/features/) |
| Hackathon | [docs/hackathon/](docs/hackathon/) |
| Operations & Deployment | [docs/operations/](docs/operations/) |
| Testing | [docs/testing/](docs/testing/) |
| Reference | [docs/reference/](docs/reference/) |

See [docs/README.md](docs/README.md) for the full index.

---

## AI Assistant Guidelines

When working in this codebase:

- **Follow the Supabase SSR pattern** in `utils/supabase/server.ts` — use `getAll()`/`setAll()` only, never individual cookie methods
- **Use `lib/supabase/` for all database queries** — don't query Supabase directly from components
- **Respect the design system** — Dawn for students, Dusk for experts. See `docs/architecture/DESIGN.md`
- **Read `AGENTS.md`** for Codex-specific guidance
- **Read `CLAUDE.md`** for Claude Code-specific guidance

---

## License

Private. All rights reserved.
