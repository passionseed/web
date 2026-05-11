# PassionSeed Documentation

Documentation index. Files are organized by purpose, not by date.

---

## 📁 `project/` — Product & Project Definition

| File | Purpose |
|------|---------|
| [PRODUCT.md](project/PRODUCT.md) | Product purpose, user segments, JTBD |

## 📁 `architecture/` — Design, Schema & System Architecture

| File | Purpose |
|------|---------|
| [DESIGN.md](architecture/DESIGN.md) | Design system: colors, typography, spacing, tokens |
| [system-prompt.md](architecture/system-prompt.md) | Supabase Auth SSR implementation rules (AI guidance) |
| [gemini.md](architecture/gemini.md) | Supabase data access patterns & architecture standards |
| [map-db.md](architecture/map-db.md) | Learning Map database schema |
| [map-plan.md](architecture/map-plan.md) | Learning Map feature plan & core concepts |
| [classroom-system-plan.md](architecture/classroom-system-plan.md) | Classroom system implementation plan |
| [classroom_teams_design.md](architecture/classroom_teams_design.md) | Classroom teams schema design |
| [EXTERNAL_APP_INTEGRATION.md](architecture/EXTERNAL_APP_INTEGRATION.md) | Guide for building external apps that connect to PSeed |
| [MODULAR_REFACTORING.md](architecture/MODULAR_REFACTORING.md) | North Star wizard modular refactoring |
| [NORTH_STAR_ENHANCEMENTS.md](architecture/NORTH_STAR_ENHANCEMENTS.md) | North Star wizard enhancements guide |

## 📁 `features/` — Feature-Specific Documentation

| File | Purpose |
|------|---------|
| [END_NODE_FEATURE.md](features/END_NODE_FEATURE.md) | End Node completion tracking & congratulations modal |
| [IMPACT_PAGE_README.md](features/IMPACT_PAGE_README.md) | Impact landing page design documentation |
| [GROUP_INTEGRATION_GUIDE.md](features/GROUP_INTEGRATION_GUIDE.md) | Assignment Groups integration guide |
| [MAP_EDIT_SECURITY.md](features/MAP_EDIT_SECURITY.md) | Map editing authorization & security layers |
| [DIRECTION_FINDER_SETUP.md](features/DIRECTION_FINDER_SETUP.md) | Direction Finder background jobs *(deprecated)* |
| [walkthrough_floating_north_star.md](features/walkthrough_floating_north_star.md) | Floating North Star UI implementation |
| [PERFORMANCE.md](features/PERFORMANCE.md) | Performance optimizations: bundle, images, caching |

## 📁 `hackathon/` — Hackathon Documentation

| File | Purpose |
|------|---------|
| [hackathon-context.md](hackathon/hackathon-context.md) | Hackathon codebase overview & architecture |
| [TNDH-AI-Context.md](hackathon/TNDH-AI-Context.md) | The Next Decade Hackathon 2026 — comprehensive context |
| [hackathon-support-email-thai.md](hackathon/hackathon-support-email-thai.md) | Thai support email template for participants |
| [EPIC_SPRINT_README.md](hackathon/EPIC_SPRINT_README.md) | Epic Sprint report documentation |

## 📁 `operations/` — Setup, Deployment & Maintenance

| File | Purpose |
|------|---------|
| [DEPLOYMENT_SETUP.md](operations/DEPLOYMENT_SETUP.md) | Vercel deployment optimization & resource limits |
| [B2_CORS_SETUP.md](operations/B2_CORS_SETUP.md) | Backblaze B2 CORS configuration |
| [DISCORD_BOT_SETUP.md](operations/DISCORD_BOT_SETUP.md) | Discord bot setup for mentor notifications |
| [CLEANUP_SUMMARY.md](operations/CLEANUP_SUMMARY.md) | Post-cleanup migration guide (test mode & cron removal) |
| [FIXES.md](operations/FIXES.md) | Direction Finder schema validation fixes |
| [DREAM_STATE_ANALYSIS.md](operations/DREAM_STATE_ANALYSIS.md) | 12-month roadmap gap analysis |
| [debug.md](operations/debug.md) | Browser console error logs *(raw debugging output)* |

## 📁 `testing/` — Testing Guides & QA

| File | Purpose |
|------|---------|
| [JOURNEY_MAP_TESTING.md](testing/JOURNEY_MAP_TESTING.md) | Journey Map feature testing guide |
| [TEST_END_NODE.md](testing/TEST_END_NODE.md) | End Node feature testing steps |
| [AI_QUIZ_GENERATION_PROMPT.md](testing/AI_QUIZ_GENERATION_PROMPT.md) | Quiz question generation prompt spec |
| [TESTING_CONCURRENT_JOBS.md](testing/TESTING_CONCURRENT_JOBS.md) | Concurrent job testing *(deprecated)* |
| [TEST_STATUS.md](testing/TEST_STATUS.md) | Test setup status *(deprecated)* |
| [QUICK_TEST_GUIDE.md](testing/QUICK_TEST_GUIDE.md) | Quick 10-user test *(deprecated)* |

## 📁 `reference/` — Historical & Generated Reference

| File | Purpose |
|------|---------|
| [all_migrations.md](reference/all_migrations.md) | All SQL migrations combined *(auto-generated)* |
| [note.md](reference/note.md) | Random notes *(angpao IDs)* |
| [plan.md](reference/plan.md) | Old performance optimization plan |

---

## Files in Repository Root

These files stay in the repository root because they are read by AI coding tools (Codex, Claude Code) that look for them at the project root:

- `AGENTS.md` — Codex AI guidance
- `CLAUDE.md` — Claude Code AI guidance
- `README.md` — Project overview & getting started
