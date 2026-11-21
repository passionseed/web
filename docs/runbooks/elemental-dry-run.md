# Elemental rehearsal checklist (Wed 2 Dec 2026)

The rehearsal runs in the **rehearsal server** (edition `elemental-dryrun`)
with 30 or more people, on the deployed container
`passionseed-discord-bot-elemental`, the production database and real
element boards made for the rehearsal. Nothing here touches the real server
or `elemental-2026`. Setup and every command are in
[`elemental-island.md`](elemental-island.md).

Write **P** (pass) or **F** (fail) in the Result column and a short note.
Every F goes on Thursday's fix list with its owner. The thresholds marked
"proposed" are a starting point; Big can change them before the rehearsal.

## Before 19:00 (Host)

- [ ] Rehearsal server seeded with `"2026-12-02": {"opening_at": "19:00", "call_at": "19:55", "card_at": "20:30"}` and a `team_create_opens_at` before 19:30 (runbook G).
- [ ] 40 rehearsal codes: `/el test-codes n:40` in the rehearsal server; one per person, handed out by staff.
- [ ] Rehearsal element boards exist (one per element at least) and their edit links are ready to post.
- [ ] Roles given by hand: Host, Helper, Mentor, Judge, Safety to the staff taking part. Anyone playing a student holds **no** staff role: the bot refuses staff in every team (create, invite, Accept, `/el team-create`, `/el team-move-member`).
- [ ] A stopwatch (phone) and a laptop with Chrome or Safari for the browser checks.

## The checklist

| # | Brain item | How to check | Pass when | Result (P/F) | Note |
|---|---|---|---|---|---|
| 1 | **Bot** | Big: `ssh <bot host> docker ps` at 18:55 and 21:00; everyone: every command below | Container `(healthy)` both times; no "The application did not respond" all evening; the SHIFT container's start time unchanged | | |
| 2 | `/join` and picker | Each person runs `/join code:` in `#start-here`, then presses an element button | Everyone gets Paid and exactly one element role, and sees the event channels; a code used twice is refused | | |
| 3 | Teams | Groups of 2 to 5 run `/team create`, teammates press Accept; Host makes one team with `/el team-create` | Each team gets a private `element-NN` channel with a pinned welcome; Judge and other teams cannot see it | | |
| 4 | Canvas link | Each team makes a canvas (**+ แคนวาสโปรเจกต์**, tags teammates with **ทีม**), runs `/canvas link url:` in its channel | Reply says linked; the link is pinned in the team channel | | |
| 5 | **`/tester` to three destinations** | Each team logs 3 testers with `/tester` (general words only) | For each entry: (a) the reply says counted n/10 and "canvas: written"; (b) the note is on the team's canvas in the Test zone; (c) the entry is in the element's thread in the staff channel, without the logger's name | | |
| 6 | Contacts refused | One person types a phone number or an email into a `/tester` field | Refused, naming the field; nothing counted; nothing in the mirror | | |
| 7 | Staff remove | A Helper presses Remove on one mirror post, gives a reason | The mirror post shows removed; the team's count drops by one; the note disappears from the canvas after a reload | | |
| 8 | **Time from `/tester` to note visible after a reload** | Stopwatch from pressing Submit to the note showing after reloading the board, 5 samples on different teams | Median under 30 s, worst under 60 s (proposed). Write the five times | | |
| 9 | **Excalidraw note renders in a real browser** (covers E03's fallback) | On the laptop (Chrome or Safari) and one phone: open a canvas with bot notes, reload, then drag one note and edit its text, reload again | Each note is a sticky with its text inside the Test zone; nothing overlaps; the drag and edit survive the reload; no error toast. Its index check runs in `scripts/elemental/excalidraw-roundtrip.ts`; this item is the look | | |
| 10 | **Whiteboard at 30 on one board** | 30 people on one element board at once for 10 minutes, each editing their own canvas, while testers are logged | No "couldn't save" or reload loops; edits show for others within a few seconds; the bot's notes still land (item 5) | | |
| 11 | **Plots with element and the legend** | At 19:55, look at the island picture in the campfire chat and the legend under it | One plot per live team with its element flag and plot number; the legend has one line per team, `NN · element · project`, matching the plot numbers; no names | | |
| 12 | **Campfire call** | At 19:55 in news | The call post with the campfire voice link arrives between 19:55:00 and 19:56:30, pinging nobody | | |
| 13 | **Card 20:30 ±1 min** | At 20:30 in news | The card (9:16 image) and caption arrive between 20:29 and 20:31; the numbers in the caption match `/el totals` | | |
| 14 | `/checkin` | One person per team runs `/checkin` in the team channel; a teammate runs it again | First: a line in the team channel; second: a private "already" | | |
| 15 | **`/report` reaches #reports only** | Two people run `/report` (one in `#start-here`, one in a team channel) | Each report appears once in `#reports`, pinging Safety; nowhere else; the reporter gets a private "received"; a Safety member's Handled button works | | |
| 16 | **Lesson** | Three people open the lesson (the lesson player if shipped; otherwise the YouTube clip and the Google Form) | It opens on a phone and the answer is recorded (lesson player: the badge shows; form: the row is in the sheet) | | |
| 17 | Missed-post note | Before 19:00 Big removes the bot's Send Messages in the rehearsal news channel, and puts it back at 19:20 | One note in the staff channel at about 19:15 pinging Host; after 19:20 the opening post goes by itself within a minute | | |
| 3b | **Staff never on a team** | A Mentor tries `/team create`; a student invites a Judge; the Judge presses Accept on an invite made before they got the role; Host runs `/el team-create` and `/el team-move-member` with a Helper among the people | Every one is refused, naming the staff member; no team, invite acceptance or channel is made for them; no team channel lists a staff member as a member | | |
| 18 | No DMs, no 1:1 space | Ask everyone: did the bot DM you? Check one team channel's member list | No DMs; every team channel has 2 or more students plus staff roles only | | |
| 19 | Cleanup | After the rehearsal, as Host: `/el dryrun-cleanup confirm:elemental-dryrun` in the rehearsal server | Teams archived, team channels deleted, the reply counts them; in the real server `/el totals` is unchanged | | |

## Afterwards

- [ ] Every F has an owner and a fix-by date (Thu 3 Dec).
- [ ] Item 8's times and item 10's experience decide the boards per element
      (runbook F: at most 15 teams per board); write the decision down.
- [ ] Remove the rehearsal roles from staff who will not be in the real event.
