# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Start Supabase locally
npx supabase start

# Push database changes
supabase db push --local
```

## Architecture Overview

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
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { /* implementation */ }
    }
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

**Team System**:
- Teams belong to classrooms
- Students can be in one team per classroom
- Team leaders have management permissions
- Teams can fork learning maps for collaboration

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