# SHIFT High Island: the deep fire (กองไฟโฟกัส)

Status: built on `t3/deepwork-private-room`, 2026-11-20. Its migration
(`20261120120000_shift_quest_deep_fire.sql`, schema 22) is **not applied**
and waits for the founder's go, after schema 21 and after the bot deploy.
Thai copy is DRAFT and still needs the three-model review in the root
`AGENTS.md`.

## The moment

**Who:** a SHIFT High student with work to finish alone: building the
smallest piece for quest 4, running the loop, writing up what they learned,
or writing the evidence for a mentor. **When:** whenever they sit down to do
that work and want quiet, rather than the shared campfire's rounds and
company. **What they do next:** do the work, then come back to the island and
send it.

The founder's request (2026-11-20): "deep fire room in island and discord,
like for deepwork. Click it and you have a private room built for you to
deepwork. Locked: nobody else can enter." Then: "build it rn". Every call
below that the founder did not make is marked as the builder's.

## What a student sees

- **On the island:** a small one-person fire on the plaza, a short walk from
  the big campfire. No words or counts are drawn on the map. Tapping it opens
  a sheet: what it is, one button, จุดไฟ, and the fine print. The button opens
  the deep fire lobby in Discord. When the bot is not running (or cannot
  build rooms), the button is greyed and a line says to try again soon.
- **In Discord:** a voice channel such as "🔥 จุดกองไฟโฟกัส" (the lobby).
  Joining it builds a new voice channel just for them, "🔥 กองไฟโฟกัส", and
  moves them in. Nobody else can connect. When they leave, the room is
  deleted. Joining the lobby again while their room still exists moves them
  back into it.

## Decisions

| # | Question | Answer |
|---|---|---|
| 1 | How a room is made | **Join to create** (builder's call). Staff make one lobby voice channel inside a category and set it with `/admin channel kind:deepfire`. The island button and Discord both lead to that one lobby, so "click it and you get a room" works the same from either side, and the web needs no new way to ask the bot for anything. |
| 2 | Locked, but secret? | **Locked but visible** (builder's call). The room copies the lobby's role overwrites, so everyone who can see the lobby can see the room and who sits in it. Connect is denied to every role and to @everyone; only the owner and the bot may connect; the user limit is 1. The rules card's "ไม่มีห้องลับ" stays true: the room is closed, never hidden. |
| 3 | Who is kept out | **Everyone except the owner, adults included** (builder's call, from the safeguarding rule). Discord Administrators and the server owner ignore channel locks, and moderators with Move Members can drag people in. So the bot is the real lock: anyone other than the owner (and the bot) who ends up in a room is disconnected at once. When Discord will not disconnect them, the bot deletes the room, which disconnects everyone in it (fail closed), and it never moves an owner back into a room someone else is in. An adult and a student can never stay alone in a locked room. |
| 4 | Text chat | **Off** for everyone, the owner included (builder's call). The room's text-in-voice chat denies sending, threads, voice messages, polls and reactions, so it can never become a written channel between an adult and a student, and it stays quiet. |
| 5 | What is kept | **Nothing per person** (builder's call). No table of rooms, no times, no member or Discord ids. The bot recognises its rooms from the rooms themselves (see "How the bot knows its rooms"). The database keeps only the lobby setting and one heartbeat row (guild, lobby, ready, beat time). |
| 6 | Rounds, chimes, guest | **None.** The room is silent: no focus rounds, chime, music or bot messages. It does not count for the 19:25 evening guest; the guest stays the shared fire's. |
| 7 | How many at once | **At most 40 rooms** (builder's call; Discord allows 50 channels per category). At the cap, a newcomer stays in the lobby. |
| 8 | Cohort weeks | **Open.** In SHIFT cohort weeks the separate shift-voice tracker records voice time in every voice channel, these rooms included. The island's fine print says so only in those weeks, and nothing anywhere claims "nobody counts your time" for the deep fire. |
| 9 | Where on the island | **A small place of its own on the plaza** (builder's call), the founder's "places live in the world": a tiny fire with one log seat, drawn in the campfire's palette so it reads as the same fire, only small. |
| 10 | Name | กองไฟโฟกัส (DRAFT, builder's call). Avoids โคม (no lantern belongs to one person), ถ้ำ (the building-alone pitfall) and มอด (the fire is over). Needs the three-model review. |

## How it works

### Discord (bot/src/quests/deepfire.ts, deepfire-state.ts)

- **Lobby.** `/admin channel kind:deepfire` accepts only a voice channel in a
  category where the bot holds View Channel, Connect, Manage Channels and
  Move Members, on the channel and on the category. On the category it also
  needs every permission a room's overwrites set (Speak, Video, Use Voice
  Activity, Send Messages, Send Messages in Threads, Create Public Threads,
  Create Private Threads, Send Voice Messages, Create Polls, Add Reactions):
  Discord lets a bot allow or deny in a new channel only what it holds
  there, so without them every room would fail. Unknown counts as no, and a
  database below schema 22 is refused too. Students must be able to see and
  join the lobby (View Channel and Connect, checked like the coworking
  channel): rooms copy the lobby's visibility, so a lobby students cannot
  see would build rooms only staff see, and the island's button would lead
  nowhere. The lobby is never the campfire's coworking channel, and
  `kind:coworking` refuses the lobby, either way round.
- **Heartbeat.** Every 60 seconds, from schema 22 on (re-read every tick, so
  applying the migration needs no restart), the bot calls
  `shift_quest_deepfire_beat(guild, ready)`. `ready` is true only when the
  gateway is connected, the lobby is a cached voice channel in a category,
  the bot has the four permissions on both (and the room permissions on
  the category), and Discord has not refused a room since the last beat.
  The answer is the lobby's id; a changed lobby is checked at once and
  beaten again when its readiness differs. The heartbeat runs beside the
  work on the rooms, never in front of it, and gives up on a database that
  does not answer within 20 seconds: a slow database never holds up the
  lock.
- **A join into the lobby** gives that person their room: their existing
  one, or a new one if under the cap. The new room sits in the lobby's
  category, copies the lobby's role overwrites (only their View Channel
  allow or deny; nothing else, such as a role's Move Members, carries over)
  with Connect and chat denied, and adds two member overwrites: the owner (view, connect, speak, stream,
  voice activity) and the bot (view, connect, manage channels, move
  members). One promise chain plus a per-person in-flight guard keeps double
  events from building two rooms. At most 5 rooms are built per pass; the
  next pass checks every room again before it builds more.
- **Anyone else in a room** is disconnected (never moved somewhere else),
  other bots included: straight from their voice update, without waiting
  behind a build or the heartbeat, and again on every reconcile. If Discord
  will not disconnect them, the room is deleted in the same pass (deleting a
  voice channel disconnects everyone in it, and the bot can always do that
  through its own overwrite); if even that fails, it tries again 5 seconds
  later. An owner is never moved back into a room someone else is still in.
- **A room with nobody in it** is deleted. If the owner leaves while someone
  else is still inside, that person is disconnected and the room deleted.
- **Never pulled from elsewhere.** Every move and disconnect checks the
  voice cache first: someone who left the lobby (or the room) meanwhile is
  never pulled out of, or disconnected from, wherever they went. A room
  built for someone who left before it was ready is deleted again.
- **Reconcile** on ready, resume, a lobby change and every 5 minutes, from
  the gateway caches only (no new intents). Every room in the server is
  guarded, wherever it sits, even while no lobby is set or the lobby has
  not been read yet.
- **Fail closed.** Without the permissions, nothing is built and the
  heartbeat says `ready = false`; people who join the lobby just sit in an
  ordinary shared voice channel. A missing-permissions error from Discord
  stops building, and the next heartbeat sends `ready = false`, then checks
  again. A move back into a room that keeps failing is tried again once a
  heartbeat, never in a loop.
- **Stop** leaves occupied rooms alone; the next start picks them up. It
  waits at most 8 seconds for running work and 3 for its last heartbeat, so
  the other quest modules still stop in time.
- **Logs** hold counts and short codes only.

### How the bot knows its rooms

A room is a plain voice channel, in any category or none, never a lobby,
with user limit 1, a member overwrite for the bot's own user that allows
exactly View Channel, Connect, Manage Channels and Move Members and denies
nothing, and an `@everyone` overwrite that denies Connect. Its owner is the
room's one other member overwrite that allows Connect. This survives
restarts with nothing stored, and does not depend on where the lobby is: a
room stays guarded after the lobby moves to another category, is changed or
is cleared. Only rooms in the lobby's category take anyone in; the others
are guarded until they are empty, then deleted. A lobby this process has
seen is never treated as a room.

### Database (schema 22)

- `shift_quest_settings.deepfire_channel_id`, set through
  `shift_quest_admin_set(actor, 'deepfire_channel', id)` and shown by
  `shift_quest_admin_status`.
- `shift_quest_deepfire_state`: one row (guild, lobby, ready, beat time).
  RLS on, no policies, service role only, like every island table.
- `shift_quest_deepfire_beat(guild, ready)`: bot only.
- `shift_quest_deepfire(actor)`: the web's read. Refuses students who have
  not started, like the campfire. Returns the lobby, the guild and `live`:
  the setting is set, the bot's last beat named that lobby, was ready, and is
  under 3 minutes old.

### Island (web)

- `deepfireOf` (lib/supabase/shift-quests/deepfire.ts) builds the lobby link
  the same way the campfire does and fails soft: before the migration the
  place simply does not appear.
- The plaza draws the small fire and its tap spot only when the lobby is
  set. It stands on the grass just off the plaza's front-right edge, under
  the teammates' row (ring at +45,+56 and flame at +48,+50 px from the
  plaza centre), clear of every tap target, path, lamp and pin on every
  island size; the ground keeps that spot clear whether a lobby is set or
  not, so nothing shifts when it appears.
- Lit (the bot is ready): the ring with embers and a small flame animated
  like the campfire's, a small warm pool of light at night, and the flame
  and embers stay warm in the night atlas. Asleep (not ready): the same ring
  cold, no flame, no light; still tappable, so the sheet can say why.
- The sheet is `DeepFireSheet`; copy is the `DEEPFIRE` block in
  `components/shift/island/copy.ts`. The live state comes with the page
  (refreshed with it), not a poll. The cohort-week line shows only when the
  server loader's `cohortWeek` (`roundsInSession().size > 0`) is true.

## Safeguarding

- Root `AGENTS.md`: no private 1:1 channel between adults and students. The
  room has one person in it, ever: the bot disconnects anyone else,
  Administrators included, and the chat is closed. A disconnect that fails
  closes the room.
- Rules card line 5, "ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ": the room is
  visible to everyone who sees the lobby, with who is in it, and nobody talks
  in it. It is closed, not secret.
- The room's name never carries the student's name (shift-voice stores
  channel names in cohort weeks, and Discord's audit log keeps them).

## Setup (staff, once)

1. In the SHIFT server, make a category (or use an existing one with free
   slots) and a voice channel in it, e.g. "🔥 จุดกองไฟโฟกัส", visible and
   joinable by students (the command refuses it otherwise), and not the
   campfire's coworking channel.
2. Give the quest bot's role **Manage Channels** and **Move Members** on that
   category (plus View Channel and Connect), and on the category also every
   permission a room sets: Speak, Video, Use Voice Activity, Send Messages,
   Send Messages in Threads, Create Public Threads, Create Private Threads,
   Send Voice Messages, Create Polls and Add Reactions. The lobby itself
   needs View Channel, Connect, Manage Channels and Move Members.
3. Run `/admin channel kind:deepfire channel:<the lobby>`.

## Deploy order

1. Merge. 2. Deploy the bot (`bot/deploy.sh`); below schema 22 the module
idles. 3. On the founder's go, after schema 21 is in production, apply
`20261120120000_shift_quest_deep_fire.sql`. 4. Run the setup above.

## Known limits

- **Disconnect comes after the join.** An Administrator who walks in is in
  the room for the moment it takes the bot to see the voice update and
  Discord to answer (normally well under a second) before being
  disconnected. The disconnect is sent straight from the voice update, so a
  room being built for someone else or a slow database does not hold it up.
- **The bot offline.** No new rooms are built (the lobby is then a normal
  shared voice channel) and nobody is disconnected from existing rooms until
  it returns; the overwrites still keep ordinary members out. The island
  greys the button within 3 minutes.
- **The server owner.** Whether Move Members can disconnect the server owner
  needs a check on the real server. If it cannot, the bot deletes the room
  instead, which also disconnects the room's owner.
- **Lost events.** Anything the gateway drops is fixed by the 5-minute
  reconcile.
- **Staff can unmark a room.** Someone with Manage Channels who changes a
  room's user limit, the bot's overwrite or `@everyone`'s Connect deny
  makes it an ordinary channel the bot no longer guards (moving it to
  another category does not). Its overwrites still keep ordinary members
  out, unless `@everyone` was allowed in.
- **An earlier lobby marked like a room.** After a restart the bot no longer
  knows which channels were lobbies. A former lobby that carries every mark
  of a room (user limit 1, the bot's overwrite with exactly a room's
  permissions, `@everyone` denied Connect) would be treated as a room and
  deleted once empty. An ordinary lobby has none of these.
- **A reconnect greys the button briefly.** A heartbeat sent while the
  gateway reconnects says not ready, so the island can show the fire asleep
  for about a minute.
- **Removed adults are not recorded.** Logs keep counts only. If the
  Safeguarding Lead wants a record of who was removed, that is a new
  decision.
