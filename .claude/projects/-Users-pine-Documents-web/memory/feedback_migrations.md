---
name: Migration workflow
description: How to handle database migrations in this project
type: feedback
---

Never use mcp__supabase__apply_migration to run migrations directly. Instead, create the .sql migration file in /Users/pine/Documents/web/supabase/migrations/ and tell the user to push it themselves.

**Why:** User wants to review and push migrations manually.
**How to apply:** Always write migration as a .sql file, never auto-apply it.
