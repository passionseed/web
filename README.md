# Passion Seed :fire:

Discover Your Passion, Ignite Your Potential

## Usage

- To install package

```bash
pnpm install
```

- To start development

```bash
pnpm dev
```

- Run Supabase Locally

```bash
npx supabase start
```

- To start production

```bash
pnpm build
pnpm start
```

Key Directories
app/ – Next.js routes and pages. Examples include authentication flows (app/auth/_), the main dashboard (app/me/_), community pages, and workshop listings.

components/ – Reusable UI and feature components (e.g., login-form.tsx, user-portal.tsx, community/ components).

components/ui/ – Shadcn-styled UI primitives (50+ components).

lib/ – Application logic, such as Supabase API wrappers (lib/supabase/reflection.ts, lib/api/community.ts), and small hooks (lib/hooks/use-multi-step-form.ts).

utils/ – Supabase client helpers for browser and server usage. The server client follows the pattern prescribed in system-prompt.md.

types/ – Shared TypeScript types for reflections, projects, communities, etc.

supabase/ – Database migrations and config. schema.sql defines the schema for passions, reflections, workshops, and more.

styles/ – Tailwind setup (globals.css) and configuration (tailwind.config.ts shows custom fonts and color tokens).

Authentication & Middleware
system-prompt.md contains strict rules for implementing Supabase Auth with SSR, emphasizing the use of cookie getAll/setAll and forbidding deprecated APIs. The project’s middleware.ts imports updateSession from utils/supabase/middleware.ts, applying these rules to every request path except static assets.

Styling Guidelines
The .trae/rules/project_rules.md file outlines aesthetic choices—fonts, color palette, layout guidelines, and animation cues—to maintain a cohesive look.

Example Component
A typical component like LoginForm performs Discord OAuth using the Supabase client and displays a styled form card with Tailwind classes.

Data Access
The lib/supabase/reflection.ts module includes functions for creating reflections and aggregating dashboard data. For instance, getUserDashboardData pulls projects, reflections, and workshops, then computes the user’s reflection streak.

Next Steps & Learning Pointers
Understand the Supabase SSR pattern – Review utils/supabase/\* and the detailed instructions in system-prompt.md to ensure all server and client requests handle cookies correctly.

Explore the schema – supabase/migrations/ and schema.sql illustrate how tables such as projects, reflections, tags, and communities are structured. Familiarity with this schema is key for adding new features.

Study the UI/UX guidelines – The style rules and Tailwind configuration define the design language of the application.

Check out major pages – app/me/\* (user dashboard and reflection workflow), app/communities/, and app/workshops/ showcase how data is fetched from Supabase and presented with the Shadcn component library.

Review programmatic API wrappers – Files in lib/api/ and lib/supabase/ demonstrate how to encapsulate database operations, which will be helpful when adding new CRUD endpoints or features.

Overall, the codebase is organized around Next.js conventions: routes in app/, reusable components in components/, and utilities in lib and utils. Supabase handles both authentication and database operations, and styling is done with TailwindCSS following the project’s design guidelines. To become comfortable with this codebase, focus on the Supabase helpers, the project types, and the key pages in app/ that orchestrate the user flows.
