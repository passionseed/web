# SHIFT High island: production rollout

A checklist for putting the SHIFT High island live: the quest database,
the two database logins, the website (`/shift/island`) and the Discord bot.
Do the steps in order and tick each box. Every step says what to run, what
you should see and what to do when you see something else.

Background: [`docs/features/shift-high-quests.md`](../features/shift-high-quests.md)
(the rules and the grants), [`docs/designs/shift-high-island-web.md`](../designs/shift-high-island-web.md)
(the website) and [`bot/README.md`](../../bot/README.md) (the bot host).

Season 1 runs **Saturday 14 Nov 2026 to Saturday 28 Nov 2026**. Aim to finish
this by the evening before.

**Safe at every point.** Until step E the website shows "closed for
maintenance" (`SHIFT_QUEST_DATABASE_URL` unset), and until step F the bot
does not run the quest module. Each step can be stopped and resumed later.

## Before you start

- [ ] A terminal on your own machine, in a checkout of this repo, with
      `pnpm install` done. Never paste secrets into this repo, a commit, an
      issue or a chat.
- [ ] Logged in: `supabase` (linked to the production project: if
      `supabase migration list` says it is not linked, run
      `supabase link --project-ref <project ref>`), `vercel` (`vercel whoami`),
      and `ssh <bot host>` works.
- [ ] A password manager entry ready for two new passwords (step D).
- [ ] Supabase dashboard open on the project, **Connect** panel: you need the
      **Session pooler** and **Transaction pooler** hosts from it
      (`aws-0-<region>.pooler.supabase.com`) and the project ref.

Never paste a secret on a command line: it stays in your shell history.
Read it into a variable instead, which prints nothing:

```bash
read -rs NAME && export NAME     # paste, press Enter
```

## A. Merge

- [ ] **The island PR** (`feat/shift-island-web`, with this rollout branch
      merged in) is green: the `build` check (lint, tests, `pnpm build`) and
      `shift-quests-db`. Check the Vercel preview: `/shift/island` shows the
      closed-for-maintenance screen there (no database on previews), which is
      expected.
- [ ] Squash-merge it into `main`. Production redeploys by itself; the island
      still says closed, nothing else changes.
- [ ] **The invite PR (#271)** is independent and can merge before or after.
      **Before it merges, its migration needs a new version number:**
      `20261111120000_shift_island_rsvps.sql` has the same version as
      `20261111120000_whiteboard_quest_reviewers.sql`, already on `main`.
      Two files with one version cannot both be applied. Rename it to an
      unused later version (e.g. `20261111130000_shift_island_rsvps.sql`) in
      that PR first.
- [ ] `git checkout main && git pull` locally. Every step below runs from an
      up-to-date `main`.

## B. Migrations (production)

`supabase db push` applies to **production**, the first Postgres to parse
these files. The migrations are additive and idempotent.

- [ ] Restore the one migration production has that `main` does not
      (`20261022130000_meta_marketing_sync`, applied from another branch).
      Without it in the folder `db push` refuses to run. It is **not**
      re-applied; it only has to exist locally:

      ```bash
      git show a3908e55:supabase/migrations/20261022130000_meta_marketing_sync.sql \
        > supabase/migrations/20261022130000_meta_marketing_sync.sql
      ```

- [ ] Compare local and remote:

      ```bash
      supabase migration list
      ```

      Expect: every row that has a Remote version also has a Local one. The
      rows with Local only are what will be applied. They must be the 14
      SHIFT quest files, `20261111090000_shift_quests_schema` to
      `20261111093000_shift_quest_campfire` (plus the renamed island RSVP
      file if #271 is merged). **Anything else Local-only, or any
      Remote-only row: stop** and find out where it comes from before
      pushing (restore it from git like the file above if it was applied
      from another branch).

- [ ] Dry run:

      ```bash
      supabase db push --dry-run
      ```

      If it says local migrations would be inserted before the last remote
      one (the quest files are dated 09:00 to 09:30 on 11 Nov, and
      `20261111120000_whiteboard_quest_reviewers` from `main` may already be
      applied), add `--include-all` to both commands. With or without it,
      the list it prints must be exactly the files you expected above.

- [ ] Push (production, after your explicit go):

      ```bash
      supabase db push            # or: supabase db push --include-all
      ```

      Expect it to finish without an error. If one migration fails, the
      push stops there and later files are not applied; read the error,
      fix forward in a new migration and push again. Nothing to undo: every
      file is idempotent.

- [ ] Remove the restored file again (it belongs to its own branch; do not
      commit it here) and check the tree is clean:

      ```bash
      rm supabase/migrations/20261022130000_meta_marketing_sync.sql
      git status --short     # expect nothing
      ```

## C. Check the database (read-only)

- [ ] Run the checks file. Every row it returns is a problem:

      ```bash
      supabase db query --linked -o table -f docs/runbooks/shift-high-island-checks.sql
      ```

      Expect **no rows**. It checks: `shift_quest_schema_version()` is 7;
      both logins exist, `NOINHERIT`, connection limits 5 (bot) and 20
      (web), a `statement_timeout`, member of no role; the Data API (`anon`,
      `authenticated`) can run no `shift_quest_*` function; the bot can run
      every entry point and no helper or website-only function; the website
      can run exactly its allowlist; every quest table has row level
      security and no grant; and neither login can reach a definer function
      or a table in `public` outside `shift_quest_*` through `PUBLIC`.

- [ ] Rows starting with `exposed:` are functions or tables other features
      left open to `PUBLIC`. They are not quest bugs, but the logins could use
      them once they can log in. **Stop here.** Fix them in a separate,
      additive migration PR: for each function,
      `REVOKE EXECUTE ON FUNCTION public.<fn>(<args>) FROM PUBLIC;` then
      `GRANT EXECUTE ... TO anon, authenticated, service_role;` for whichever
      of those the app uses today (revoking from `PUBLIC` alone breaks
      callers that relied on it). Merge, push, rerun the checks. Any other
      row: stop and compare with `supabase/tests/shift_quests/run-local.sh`
      (`check_privileges`).

## D. Give the logins a password

Both roles are created `NOLOGIN`. `pnpm shift:role-passwords`
(`scripts/shift-quests-set-role-passwords.ts`) gives them `LOGIN` and a
password. It sends Postgres a SCRAM-SHA-256 verifier, never the password,
prints nothing secret, refuses while step C would still show `exposed:` rows,
then logs in as each role to prove it works.

- [ ] Make two new passwords and save both in the password manager now,
      labelled `shift_quest_bot` and `shift_quest_web` (64 hex characters
      each, safe in a URL as is):

      ```bash
      openssl rand -hex 32     # once for the bot, once for the web
      ```

- [ ] Load the admin URL and both passwords without echoing them. The admin
      URL is the **Session pooler** string from the Connect panel with the
      database password filled in
      (`postgresql://postgres.<project ref>:<db password>@aws-0-<region>.pooler.supabase.com:5432/postgres`):

      ```bash
      read -rs SHIFT_QUEST_ADMIN_DATABASE_URL && export SHIFT_QUEST_ADMIN_DATABASE_URL
      read -rs SHIFT_QUEST_BOT_PASSWORD && export SHIFT_QUEST_BOT_PASSWORD
      read -rs SHIFT_QUEST_WEB_PASSWORD && export SHIFT_QUEST_WEB_PASSWORD
      ```

- [ ] Look first (changes nothing):

      ```bash
      pnpm shift:role-passwords --check
      ```

      Expect: `quest schema: 7`, `exposure ...: none`, both roles
      `LOGIN off`, and "Check found problems" (LOGIN is off: that is what the
      next command fixes).

- [ ] Set both:

      ```bash
      pnpm shift:role-passwords
      ```

      Expect two `LOGIN on, new password set` lines, then
      `login ok as shift_quest_bot` and `login ok as shift_quest_web`, then
      `Done.` A `login FAILED` right after setting: the pooler can take a
      minute to pick up a new password; wait and run `--check`.

- [ ] Check again, then clear the variables:

      ```bash
      pnpm shift:role-passwords --check     # expect "Check passed."
      unset SHIFT_QUEST_ADMIN_DATABASE_URL SHIFT_QUEST_BOT_PASSWORD SHIFT_QUEST_WEB_PASSWORD
      ```

To rotate one password later: `pnpm shift:role-passwords --only web` (or
`bot`), then update its URL (step E or F). `--help` lists the options.

## E. Website env vars (Vercel, Production only)

Never set the quest database URL on Preview or Development: previews would
then read and write students' real quest data.

- [ ] See what is already there (names only):

      ```bash
      vercel env ls production | grep -E 'SHIFT|DISCORD|ANTHROPIC'
      ```

- [ ] `SHIFT_QUEST_DATABASE_URL`: the **Transaction pooler** (port
      **6543**), user `shift_quest_web.<project ref>`, the web password from
      step D, no `?sslmode=` (TLS is always verified against Supabase's CA):

      ```
      postgresql://shift_quest_web.<project ref>:<web password>@aws-0-<region>.pooler.supabase.com:6543/postgres
      ```

      ```bash
      vercel env add SHIFT_QUEST_DATABASE_URL production    # paste at the prompt
      ```

      Mark it **Sensitive** in the dashboard (Settings, Environment
      Variables). The app refuses any login other than `shift_quest_web`, and
      logs a warning if the pooler port is not 6543 (5432 is session mode,
      which ties up one database connection per open function instance).
- [ ] `DISCORD_SHIFT_BOT_TOKEN` (or `DISCORD_BOT_TOKEN`, its fallback) and
      `DISCORD_SHIFT_GUILD_ID`: the island reads members' roles in the SHIFT
      server with them. They are probably already set for the SHIFT Discord
      join; add them if `vercel env ls` did not list them.
- [ ] `DISCORD_SHIFT_INVITE_URL` (optional): the invite link shown to
      students who are not in the server yet.
- [ ] The AI key for the digest feature (not on this branch yet): SHIFT's
      Claude features use `ANTHROPIC_API_KEY` (`lib/shift/canvas-claude.ts`).
      If the digest lands with a different variable, set that one instead.
      Nothing in this rollout reads it.
- [ ] Fluid Compute is on for the project (Settings, Functions; the default
      for new projects). The quest pool relies on it to close idle
      connections before an instance sleeps (`attachDatabasePool`).
- [ ] Redeploy production so the new variables load (env changes do not
      apply to a running deployment):

      ```bash
      vercel redeploy <current production deployment URL>
      ```

      or Deployments, the latest production one, Redeploy.

## F. The bot (SHIFT quests module)

The bot runs on its own host (`bot/deploy.sh`), not on Vercel.

- [ ] Edit `~/passionseed/discord-bot/bot.env` **on the host** (`ssh <bot host>`,
      then an editor; the file is `chmod 600`, never in the repo):

      ```
      BOT_MODULES=<the modules already listed>,shift-quests
      SHIFT_QUEST_DATABASE_URL=postgresql://shift_quest_bot.<project ref>:<bot password>@aws-0-<region>.pooler.supabase.com:5432/postgres
      SHIFT_ISLAND_URL=https://www.passionseed.org/shift/island
      ```

      The bot is one long-running process with a pool of 2, so it uses the
      **session** pooler (port 5432) like `SHIFT_VOICE_DATABASE_URL`. No
      `?sslmode=`. Never set `SHIFT_ISLAND_URL_ALLOW_HTTP` in production.
      `DISCORD_SHIFT_BOT_TOKEN` and `DISCORD_SHIFT_GUILD_ID` are already there
      for shift-voice. If `projectseed` is in `BOT_MODULES` too, check
      `DISCORD_GUILD_ID` is **not** the SHIFT server's ID (see `bot/README.md`:
      its registration would delete the SHIFT commands).
- [ ] Deploy from an up-to-date `main` on your machine:

      ```bash
      bot/deploy.sh <bot host>
      ```

      Expect `Smoke check (no network)`, then
      `Running <rev>, healthy. Previous: <old rev>`. A missing variable stops
      the deploy before the swap, and the old container keeps running.
- [ ] Check the module started against the right schema:

      ```bash
      ssh <bot host> docker logs --tail 50 passionseed-discord-bot | grep shift-quests
      ```

      Expect `[shift-quests] database schema 7 (bot needs 2)`.
- [ ] Register the slash commands (REST calls only; it never starts a second
      bot):

      ```bash
      ssh <bot host> docker exec passionseed-discord-bot node --import tsx bot/src/index.ts --register-commands
      ```

      Expect the 15 SHIFT High commands to appear in the SHIFT server
      (Discord can take a minute; restart the Discord app if not).

## G. Set up the island in Discord

- [ ] Make yourself the first admin, once (nothing in `/admin` works until
      someone is):

      ```bash
      supabase db query --linked "select public.shift_quest_bootstrap_admin('<your Discord user id>', '<your name>');"
      ```

      (Discord: Settings, Advanced, Developer Mode on; then right-click your
      name, Copy User ID.) Everything below is in the SHIFT server, as you.
- [ ] Students: `/admin student-role action:add role:@SHIFT high`. Until a
      student role is set the island is closed to students.
- [ ] Channels, one `/admin channel` each. The bot needs View Channel and
      Send Messages in each:
      - `kind:help` the group help channel
      - `kind:staff` the mentors' channel
      - `kind:celebrate` where approved work and the weekly island are posted
      - `kind:coworking` the coworking **voice** channel (it lights the
        island's campfire; the bot only needs View Channel there, it never
        joins voice)
      - **live** and **suggest**: `/admin channel` has no such kind on this
        branch (it takes help, staff, celebrate, coworking). Create the
        channels in Discord now if you want them for the season; the bot does
        not use them yet.
      Every channel is a group space. The bot never opens a private channel
      between a mentor and a student.
- [ ] Reviewers: `/admin role user:@<mentor> role:reviewer action:grant` for
      each mentor; `role:admin` for each co-founder who runs the island.
      Server admin rights give nothing in the app by themselves.
- [ ] Season:

      ```
      /admin season name:<season name> starts:2026-11-14 ends:2026-11-28 demo_day:<Demo Day, YYYY-MM-DD> activate:true
      ```

      Take the name and the Demo Day date from the company brain, not from
      memory. Optional: `goal_milestone`, `goal_target`, `goal_deadline`,
      `goal_unlock` for the island goal; `table_bar` and `stage_bar` default
      to 2 and 3.
- [ ] `/admin status`: read what it says is still missing and fix each item.
      Leave coins and redemption off unless the amounts, budget and stock
      are decided (they stay off by default).
- [ ] Side quests stay drafts until their Thai copy has had the multi-model
      review (`AGENTS.md`). Then publish one slug at a time:
      `/admin template template:<slug> publish:true`.

## H. Smoke test

With a test student account (a Discord account with the `SHIFT high` role
that is not yours: you cannot approve your own work):

- [ ] Website: `curl -sI https://www.passionseed.org/shift/island | head -1`
      gives `HTTP/2 200`. Signed in with Discord, the island loads (not
      "closed for maintenance").
- [ ] As the student in Discord: `/start`, then `/island`. The card shows
      the island and a "🌐 เปิดเกาะบนเว็บ" button that opens the website
      island.
- [ ] On the website as the student: start the first main quest, submit
      it. As a reviewer: `/review queue` shows it; approve it; the tree grows
      on both the card and the website.
- [ ] Join the coworking voice channel: the campfire lights on the island
      shortly (the bot reports presence on its heartbeat).
- [ ] Vercel logs show no `[shift-island]` errors:

      ```bash
      vercel logs <production deployment URL> | grep shift-island
      ```

      `quest schema ... is older than 6` means step B did not finish;
      `must log in as shift_quest_web` means the URL in step E is wrong;
      `database connection error` or a TLS error means the host, port or
      password is wrong.
- [ ] Connections stay small (read-only):

      ```bash
      supabase db query --linked -o table "select usename, state, count(*) from pg_stat_activity where usename like 'shift_quest_%' group by 1, 2 order by 1, 2;"
      ```

      Expect a handful at most, never near the limits (5 bot, 20 web).
- [ ] Erase the test student when done: `/admin data` (the request queue)
      or `shift_quest_admin_erase`, as in the feature doc.

## Rollback

Migrations are additive, so the database never needs undoing: rolling back
means running the previous code against the newer schema, which works (the
bot needs schema 2, the website 6).

- **Website, quick off switch:** remove `SHIFT_QUEST_DATABASE_URL` from
  Production (`vercel env rm SHIFT_QUEST_DATABASE_URL production`) and
  redeploy. The island shows "closed for maintenance"; nothing else changes.
- **Website, bad deploy:** promote the previous production deployment
  (Vercel dashboard, Deployments, Promote; or `vercel rollback`).
- **Bot:** `bot/deploy.sh <bot host> --rollback` starts the previous image
  (run it again to return). To turn only the quests off, take `shift-quests`
  out of `BOT_MODULES` in `bot.env` and redeploy.
- **Cut a login off at once** (leaked password, misuse), in the SQL editor:

  ```sql
  ALTER ROLE shift_quest_web NOLOGIN;   -- or shift_quest_bot
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'shift_quest_web';
  ```

  Then rotate with `pnpm shift:role-passwords --only web` (step D) and update
  its URL. A leaked password means rotating it, not just switching LOGIN off.
