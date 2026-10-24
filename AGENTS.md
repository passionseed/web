# AGENTS.md

Rules for every AI agent (Claude Code, Codex, Cursor, and others) and every
person working in this repo. `CLAUDE.md` only points here; edit this file.

## What this repo is

The public Next.js app behind passionseed.org: learning maps (PathLab), SHIFT,
hackathons, classrooms, and admin tools. It is a public repository, so treat
everything you commit as published.

Where facts live:

| Need | Source |
|---|---|
| Company facts: programs, prices, numbers, team, decisions | [passionseed/company-brain](https://github.com/passionseed/company-brain) (Claude: the `company-brain` skill). Never hardcode a price or count from memory. |
| Product doctrine, audiences, tone | [`PRODUCT.md`](PRODUCT.md) |
| UI and animation rules | [`docs/ui-design-system.md`](docs/ui-design-system.md) |
| Feature specs and plans | `docs/` (see [`docs/README.md`](docs/README.md)) |

## Making changes

`main` is protected and every merge to it deploys to production on Vercel.

1. **Never push to `main`.** Create a branch (`fix/...`, `feat/...`, `docs/...`) and open a pull request.
2. **CI must pass before merging.** The `build` check runs lint, tests, and `pnpm build`. Run `pnpm lint && pnpm test && pnpm build` locally before pushing.
3. **Check the Vercel preview** linked on the pull request for any UI change.
4. **Squash-merge.** The branch is deleted automatically after merging.
5. **Admin bypass is for emergencies only** (production down). Open a follow-up pull request explaining the bypass.

CI builds with placeholder Supabase env vars, so the build must never depend on
reaching a real service at build or prerender time.

## Commands

```bash
pnpm install
pnpm dev          # dev server on :3000, uses .env.local
pnpm dev:prod     # dev server against .env.production
pnpm lint
pnpm test         # Jest; pnpm test:watch for watch mode
pnpm build
supabase db push  # applies migrations to PRODUCTION, see below
```

## Hard rules

**Secrets and data.** Never hardcode keys, tokens, cookies, or connection
strings; read them from env vars and have scripts exit with a clear error when
one is missing. Never commit `.env*` files, cookie exports, MCP configs with
tokens, database dumps, confidential docs, or student PII. Audit staged changes
for secrets before every commit, and add any newly discovered sensitive pattern
to `.gitignore`.

**Auth.** Use `@supabase/ssr` only, with the `getAll()` / `setAll()` cookie
methods only. Never use individual cookie methods (`get`, `set`, `remove`) or
`@supabase/auth-helpers-nextjs`. Copy the clients in `utils/supabase/`
(`server.ts`, `client.ts`, `admin.ts`) instead of writing new ones. On the
server, check identity with `supabase.auth.getUser()`.

**Migrations.** There is no local database; migrations apply directly to
production, which is the first Postgres to parse them. Keep them additive and
idempotent (`ADD COLUMN IF NOT EXISTS`, nullable columns,
`CREATE INDEX IF NOT EXISTS`) and give every new table RLS policies.

**Safeguarding.** Students are minors. No feature may open private 1:1 channels
between adults and students; work happens in visible group spaces.

## Code map

- `app/`: App Router pages and `app/api/` route handlers. Fetch data in server components and pass it to client components as props; mutations go through API routes or server actions.
- `components/`: React components; `components/ui/` is shadcn/ui.
- `lib/supabase/`: all database access. Components never query Supabase directly.
- `utils/supabase/`: Supabase client setup. `proxy.ts` at the root (Next.js 16's middleware) refreshes sessions and guards routes through `utils/supabase/proxy.ts`.
- `supabase/migrations/`: schema migrations.
- `lib/supabase/__tests__/` and colocated `*.test.ts`: Jest tests.

Keep code modular: split large components and functions into small, named
pieces, and follow the patterns already in the neighbouring files.

## PathLab: maps and nodes are canonical

PathLab is a map of real work. New or changed PathLab content uses the
learning-map system:

- `learning_maps` for the map record and public metadata
- `map_nodes` for each learner action or decision
- `node_content` for instructions, media, and reference material
- `node_assessments` and `quiz_questions` for evidence and checks
- `node_paths` for prerequisites and progression
- `user_map_enrollments` and `student_node_progress` for enrollment and progress
- `app/map/[id]/page.tsx` and `components/map/MapViewer.tsx` for the learner view

Do not create new content in `seeds`, `paths`, `path_days`, `path_activities`,
or other seed/day tables. Existing rows there are compatibility data; inspect
real imports before touching them. If a generator emits `seed`, `path`, or
`days` fields, treat them as editorial grouping and save the result as map
nodes and node paths.

Before creating or publishing a short Micro PathLab, read
[`skills/create-micro-pathlab-map/SKILL.md`](skills/create-micro-pathlab-map/SKILL.md).

## UI and copy

Read [`docs/ui-design-system.md`](docs/ui-design-system.md) before building or
changing UI. The rules people most often break:

- Themes are **Dawn** (students) and **Dusk** (experts), not dark and light mode.
- Glow animations animate **clip-path, opacity, and filter together**. Hover-in uses keyframes that build gradually; hover-out snaps back with a short transition.
- Touch devices get `IntersectionObserver` + `@media (hover: none)` equivalents for every hover animation.
- Reuse `.ei-card` and `.ei-button-dusk` from `app/globals.css`; do not redefine them inline.
- Marketing pages use one `.pathlab-note` margin note per section: a short, warm aside, never on headings or body copy. Copy lives in the `NOTES` block of `lib/content/pathlab-page.ts`.

Copy rules (details in [`PRODUCT.md`](PRODUCT.md)):

- No em dashes in user-facing copy. Use a comma, a colon, or rewrite the sentence.
- Thai first for students, bilingual where it helps.
- Students are autonomous builders: never talk down, lecture, or use ed-tech jargon.
- Sell the outcome parents and students want (a real project and portfolio evidence), not the philosophy behind it.

Thai copy review: before shipping Thai marketing copy, have it checked by
several models, because each catches different problems. From a three-way
review of the awaken-grow carousel (October 2026):

| Reviewer | Use it for | Watch out for |
|---|---|---|
| Antigravity (Gemini) | Drafting and rewriting: the most natural, punchy Thai | Misses grammar slips; breaks house rules (wrote น้องๆ) |
| Cursor | Proofreading: the only one to catch missing particles and made-up words | Light on logic; stray non-Thai characters can leak into its output |
| Codex | Logic: ambiguous lines, terms that shift meaning, overclaims | Stiff, academic Thai; over-hedges until the hook is gone |

Lines that two or more reviewers flag are almost always real. Check every
suggestion against the copy rules above before applying it.

## Gotchas

- `@/components/map/MapViewer` resolves to `components/map/MapViewer.tsx`. `MapViewer.original.tsx`, `MapViewer.refactored.tsx`, and the `MapViewer/` folder are not what the pages import.
- When both `Foo.tsx` and `Foo/index.tsx` exist, grep the import statements to find which one is live before editing, and ask if it is still unclear.
