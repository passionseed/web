# SHIFT High Island: the bot nudges by default

Status: built on `feat/shift-nudge`, 2026-11-25. Migration
`20261126100000_shift_quest_nudges_on.sql` (schema 24) is **not applied**: it
waits for the founder's go, and is applied before the bot that reads it
deploys. Thai copy is DRAFT for the three-model review in the root
`AGENTS.md`.

## The ask

The founder (2026-11-25), after Season 1 went quiet: "they need nudging ...
need discord bot nudging", then "safeguarding too much it killed a product...
be creative not scared of the safeguarding. we do ethical work".

**Who:** every SHIFT High student. **When:** the moment a mentor answers their
work or a teammate invites them, and after a few days away. **What next:**
they open the island, which shows their next step. **The number:** teams with
milestone 3 approved (the season metric).

## What Season 1 showed

- **A ping for everyone is a ping for no one.** The 18:50 campfire call pinged
  the student role every night of the season's second week, and activity
  still faded.
- **Opt-in DMs reached nobody.** No student turned on the update DM, and the
  come-back DM was switched off and asked for consent inside the island's team
  sheet, which a student who had stopped visiting never opened.
- **The DMs said nothing.** Even an opted-in student would have read "something
  new, see /inbox" (a Discord command the bot no longer leads with) or "the
  island is always open".

Totals are in the brain, not here (public repo).

## What changes

1. **On by default.** Both DMs are on for every student unless they turn them
   off: Discord `/settings`, or ตั้งค่า on the island. The migration sets the
   column defaults to true and turns both on once for every student who never
   chose. A student who chose keeps their choice. `/start` on the web and in
   Discord now passes no choice (null), so a second start never changes one.
2. **The update DM says what happened.** "Your work passed: **X** passed, the
   team's tree grew a stage", "A mentor answered: they'd like a bit more on
   **X**", "**X** didn't pass this round: see what to add", "**Y** invited you
   to **Z**". The database passes the notice kind and a whitelist of fields
   (`shift_quest__notify`: title, milestone, stage, inviter, project, item).
3. **The come-back DM names your next quest**, read from the student's own
   board at send time (`outbox.ts` `awayNext`): the open quest to carry on, or
   the first main quest to start. It starts after 3 days away instead of 7.
4. **Every DM carries the island's link button** and says how to turn it off.
5. **The parent notice tells the truth:** the DMs are on by default, name the
   quest and its result, and can be turned off any time
   (`ISLAND_CONSENT_VERSION` bumped to `island-2026-11-25`; the bump cancels no
   consent on file).

## The lines that stay

- **No private adult-to-student channel.** A mentor's own words (feedback,
  notes, reasons) never go into a DM. They stay on the island, where a second
  adult can see them. The DM says a mentor answered and sends the student
  there.
- **The bot never converses.** It asks nothing and reads no reply (safeguarding
  section 4).
- **No student data in this repo.**

## Builder's calls

| # | Call | Why |
|---|---|---|
| 1 | On by default, off in one place each side | Replaces the founder's own "ask for consent first" of 2026-11-21, by the founder's instruction of 2026-11-25. |
| 2 | The DM names the quest and the result, never the mentor's words | Says what happened without making the DM an adult's private channel. |
| 3 | Three days to the come-back DM | A two-week season cannot wait a week. Only replaces the old default of 7, never an admin's own choice. |
| 4 | The 🔔 consent button from the first draft is gone | Nothing to ask for any more, and one button fewer on the campfire call. |
| 5 | No public @mention nudges yet | Next step: public momentum (who started what, who sent work) in the celebrate channel, inside the server. |

## Rollout (each step needs the founder's go)

1. Thai review of the DM lines (`bot/src/quests/copy.ts` `NUDGE_DM`,
   `AWAY_DM`) and the notice row.
2. `supabase db push` (schema 24), then deploy the web and the bot.
3. `/admin feature away` on.
4. A week later, read the totals: students with each DM on, DMs sent and
   refused, and students who wrote within two days of a DM.

## Not in this branch

- Public momentum posts (above).
- A nudge to mentors when a review waits (the core-loop doc's B3). Season 1's
  submissions that waited a week show it matters as much.
