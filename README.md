<p align="center">
  <img src="public/passionseed-logo.svg" alt="PassionSeed" width="120" />
</p>

<h1 align="center">PassionSeed</h1>

<p align="center">
  <strong>Discover your passion. Ignite your potential.</strong>
</p>

<p align="center">
  <a href="https://www.passionseed.org">Website</a> ·
  <a href="https://www.passionseed.org/hackathon/gallery">Hackathon Gallery</a> ·
  <a href="docs/README.md">Docs</a>
</p>

---

Most career guidance tells students what jobs exist. PassionSeed lets them **try the work**.

Students don't pick a career from a list — they spend days inside simulated ones. They interview professionals (AI-facilitated, real humans behind the curriculum), build actual products in 5-day hackathons, and figure out what "I want to be a data scientist" actually feels like before they commit years to it.

Built in Thailand, for Thai students first. Bilingual throughout.

## What's inside

**Learning Maps** — Node-based learning paths with real content and assessments. Students unlock the next node by finishing the last, like a skill tree for a career.

**Hackathons** — Our flagship. 5-day team events where students build health-tech products that real judges score. Past teams shipped air-quality monitors, preventive-health tools, and more. [See what they built →](https://www.passionseed.org/hackathon/gallery)

**Expert Interviews** — Structured career conversations with professionals, guided by AI so every student gets a deep interview, not whoever raised their hand.

**Direction Finder** — An AI recommender that matches students to paths based on how they actually work, not a personality quiz.

**Classrooms** — Instructors get join codes, team management, and progress dashboards. Students get structure without babysitting.

## The design system

Students and experts see different skies:

- **Dawn** — student-facing. Cool blues warming into gold. Optimistic, exploratory.
- **Dusk** — expert-facing. Deep violets cooling into amber. Warm, authoritative.

Both share the same DNA: fluid, luminous components that respond like living things. Full spec in [docs/ui-design-system.md](docs/ui-design-system.md).

## Running it locally

You'll need Node.js 20+, [pnpm](https://pnpm.io/), and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
pnpm install                      # dependencies
./scripts/setup-local-secrets.sh  # creates .env.local from .env.example
npx supabase start                # local database
pnpm dev                          # dev server on :3000
```

| Command | What it does |
|---|---|
| `pnpm build` | Production build |
| `pnpm test` | Jest tests |
| `pnpm lint` | ESLint |

## Stack

Next.js 15 (App Router) · TypeScript · TailwindCSS + shadcn/ui · Supabase (Postgres, Auth, RLS) · React Flow · Vercel AI SDK · Deployed on Vercel

## For contributors

A few house rules that will save you a code review round-trip:

- **Auth:** we use `@supabase/ssr` with `getAll()`/`setAll()` cookie methods only. See `utils/supabase/server.ts` for the pattern — please copy it exactly.
- **Queries:** all database access goes through `lib/supabase/`. Don't query Supabase from components directly.
- **Migrations:** additive and idempotent only (`ADD COLUMN IF NOT EXISTS`, nullable columns). They apply straight to production.
- **Design:** Dawn is for students, Dusk is for experts, and glow animations animate `clip-path` + `opacity` + `filter` together. The rules live in `docs/ui-design-system.md` and `AGENTS.md`.

## Security

Found something? Please report it privately — see [SECURITY.md](SECURITY.md).

## License

All rights reserved — see [LICENSE](LICENSE). The code is public for transparency and education; if you want to reuse something, talk to us first: hi@passionseed.org
