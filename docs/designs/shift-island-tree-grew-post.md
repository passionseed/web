# SHIFT Island: the tree grew post

**Status (2026-11-18):** built and tested, in a draft pull request. Not
deployed and not applied. Decided by the founder on 2026-11-18.

Code: `supabase/migrations/20261118090000_shift_quest_tree_grew_post.sql`
(schema 16), `bot/src/quests/outbox.ts`, the `TREE_GREW` words in
`bot/src/quests/copy.ts`. Tests: `supabase/tests/shift_quests/tree_post.ts`
and the `tree_grew` block in `bot/src/quests/__tests__/outbox.test.ts`.

## The moment

A team's tree grows only when a mentor approves one of its main quests
(`components/shift/island/AGENTS.md`). That is the one moment worth cheering
in public. When it happens, the bot posts one short celebration in the
existing celebrate channel, adds 🎉 and 🌱 under it so others can pile on,
and links to the island.

## What the post says

DRAFT Thai, waiting for the three-model review in the root `AGENTS.md`. The
team below is made up.

A team that shows its name on the island (every active member chose to, and
each has consent on file):

```
### 🎉 ต้นไม้โตอีกขั้น
**ร้านขนมปังของเรา** · แปลง #4
ผ่านเควสต์หลักที่ 3 **ได้พันธมิตรคนแรก** แล้ว
🌿 ▰▰▰▱▱▱▱ ต้นอ่อน **3**/7
@member-one @member-two ยินดีด้วย! ต้นนี้โตจากงานจริงของทีม
[🌐 เปิดเกาะบนเว็บ]
```

A team that does not show its name:

```
### 🎉 ต้นไม้โตอีกขั้น
**ทีมปริศนา** · แปลง #4
ผ่านเควสต์หลักที่ 3 **ได้พันธมิตรคนแรก** แล้ว
🌿 ▰▰▰▱▱▱▱ ต้นอ่อน **3**/7
ยินดีด้วย! ต้นนี้โตจากงานจริงของทีม
-# อยากให้ชื่อทีมขึ้นแทนทีมปริศนาไหม ทุกคนในทีมเลือกโชว์ชื่อได้บนเกาะ ไม่บังคับ
[🌐 เปิดเกาะบนเว็บ]
```

The quest's title comes from its template (staff-written). The stage line
uses the island's own stage names and bar (`STAGE_NAMES`, `stageBar` in
`bot/src/quests/island/copy.ts`), with one emoji per stage.

## Decisions and why

| Decision | Why |
|---|---|
| Only an approval of a main quest that grows the tree a stage. No post for a start, a submission, a side quest, a retried approval, or a repeat of a milestone the tree already counts. | Only a mentor grows the tree, and copy never says anything else does. One post per real step keeps the channel worth reading and adds no volume or speed game. |
| Never "needs more" or "not passed", never a mentor's feedback. | No pressure and no public failure for minors. A mentor's words stay with the team (inbox and the web), never in a shared channel. |
| No student's name is written into the post or the queued row. | Students are minors. The one exception is the ping below: Discord shows a mention as the member's server name, which is why it sits behind a switch. |
| The team's name only while the team shows it (every active member opted in and has consent, `shift_quest__name_visible`), read when the post is sent. | Consent can change between the approval and the send; the post follows what the team says now. |
| A team that does not show its name is "ทีมปริศนา" with its plot number. | A playful handle reads as a cheer, a bare number reads as a log line. Still no name. |
| A named team's members are pinged, behind `PING_NAMED_TEAMS` in `outbox.ts` (on). | **Founder's call.** The ping tells people the cheer is for them, in a group channel of the SHIFT server. It also shows who is in the team, which is why it is a switch. Never a DM, never a role or everyone. |
| A mystery team's post ends with a light invitation to show its name (`TREE_GREW.showName`). | An invitation, not a nudge: it says "ไม่บังคับ" (optional) and appears once per post. Set it to `""` to drop it. Flagged for the founder. |
| The bot adds 🎉 and 🌱 itself. | Others pile on with one tap. A failed reaction is logged and never fails the post, since a retry would post the cheer twice. |
| Held while sharing is off. | Unchanged outbox rule (`shift_quest_outbox_claim`): every celebrate post waits while the `sharing` switch is off and goes out when it is turned on. |

**A trade-off to look at.** For a team that does not show its name, the
post says that plot #4 reached stage 3. The island map still draws that plot
plain (stage 0) for outsiders. The founder chose the plot number; if that is
too much, the stage line can be left out for mystery teams.

## How it works

1. `shift_quest_review_decide` (unchanged) calls the hook
   `shift_quest__after_approval` after an approval, holding the quest, the
   plot and every member lock. The migration replaces that hook with the
   same body plus one call to `shift_quest__tree_grew`.
2. `shift_quest__tree_grew` queues the post when the quest's template has a
   milestone, the quest is on a project, and no other approved quest on that
   project counts for the same milestone. The plot lock makes approvals on
   one project take turns, so the stage is exact. Params are ids and numbers
   only: `{project_id, instance_id, milestone, stage}`. Dedupe key
   `tree:<project>:<milestone>`: at most one post per project and milestone,
   ever.
3. The bot claims it like any channel post (every 10 seconds). At send time
   it calls `shift_quest_tree_post(project, instance)` (bot-only), which
   returns the plot, the title, and the name and members' Discord ids only
   while the team shows its name. A project that is gone fails the post
   permanently.

## Deploy order

Both steps only on the founder's go.

1. **The bot first** (`bot/deploy.sh`). A bot without `tree_grew` drops an
   unknown kind for good. The new bot works against today's database: it
   calls `shift_quest_tree_post` only for a `tree_grew` row, and none exist
   until step 2.
2. **Then the migration** (`supabase db push`). From then on approvals queue
   the post. `shift_quest_schema_version()` returns 16; the bot still needs 2
   and the website 6.
3. In Discord, give the bot **Add Reactions** and **Read Message History** in
   the celebrate channel, next to View Channel and Send Messages. Without
   them the post still goes out, just without the bot's reactions.

To turn parts off: `PING_NAMED_TEAMS = false` (names stay, no pings),
`TREE_GREW.showName = ""` (no invitation), or `/admin feature sharing off`
(every celebrate post waits).
