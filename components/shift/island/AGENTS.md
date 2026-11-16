# SHIFT High Island: rules for agents

Applies to the island game: `components/shift/island/`, `app/shift/island/`,
`lib/supabase/shift-quests/`, `bot/src/quests/` and the `*shift_quest*`
migrations. Before designing or changing a feature, the PassionSeed team uses
the internal `seedwork` skill and its island reference (the goal that breaks
ties, the season metric, the workflow), and everyone reads
[`docs/designs/shift-island-core-loop.md`](../../../docs/designs/shift-island-core-loop.md)
(the proposed design; the founder's decisions are recorded in its decision
table). These rules never bend:

- **Only a mentor grows the tree.** A tree's stage rises only when a mentor
  approves a main quest. Check-ins, reflections, roots, side quests, coins and
  gifts never change it, and copy never says they do.
- **No pressure mechanics.** No leaderboards, streaks, speed or volume rewards,
  random prizes, guilt, or "you missed" copy. Nothing ever wilts or is lost.
- **Minors.** No private channel between an adult and a student. A mentor's
  words never travel in a DM; bot DMs are content-free nudges. Evidence and
  forms never ask for a real name, phone number or address. A team's name
  shows on the shared map only with every member's consent.
- **The database holds the rules.** Every rule lives in a `shift_quest_*`
  function; the web and the bot stay thin. A new function the website calls
  needs a `GRANT` to `shift_quest_web` in a migration, plus the allowlists in
  `supabase/tests/shift_quests/run-local.sh` (`web_allow`) and `web_board.ts`.
- **Migrations hit production.** Additive and idempotent, applied with
  `supabase db push` only after the founder says go, and before the code that
  calls them deploys. Bot changes need their own deploy on the bot host.
- **Facts are read, never typed.** Season dates and bars come from the
  database; prizes, budgets, prices, counts and people from company-brain. This
  repo is public: no amounts, plans, student data or names in code or docs.
- **Copy.** Thai first, in `copy.ts` (web) or `bot/src/quests/copy.ts`. No em
  dashes, no น้องๆ, never talk down. Mark new strings `DRAFT` until the
  three-model Thai review in the root `AGENTS.md`.
- **Phones first.** Every screen works at 375px wide, respects
  `useReducedMotion`, and gives hover effects a touch equivalent.
- **Tests.** `pnpm jest components/shift/island lib/supabase/shift-quests`; for
  database rules, `supabase/tests/shift_quests/run-local.sh`.
