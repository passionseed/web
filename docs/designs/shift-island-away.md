# SHIFT High Island: the come-back DM and the return card

Status: built on `feat/shift-away-checkin`, 2026-11-21. Its migration
(`20261121090000_shift_quest_away.sql`, schema 23) is **not applied** and
waits for the founder's go. The feature switch (`/admin feature away`) stays
off until the Thai copy has had the three-model review in the root
`AGENTS.md`. Code name: `away` (`quiet` already means a team hidden from the
public view).

## The ask

The founder (2026-11-21): "bot should be able to dm and ask why haven't u
updated or checked in. Cuz we need improvement. But ask for consent first."

**Who:** every SHIFT High student. **When:** after a stretch away from the
island. **What we want to learn:** why students go quiet, so the island and
the program get better.

## The hard limit, and the shape that keeps it

Safeguarding section 4 (`docs/project/PROJECTSEED-SAFEGUARDING.md:274-288`):
bot DMs are "broadcast only, never conversational. The bot must not ask a
student a question or invite a reply, and must not collect anything a student
types." Consent is not an exception. Students are taught that any account
that chats with them privately is not us; that is how they spot copycats.

So the DM is only a pointer, and the question is asked on the island:

1. **Consent first.** Once, on the island, a one-line strip: may the bot send
   one short DM if I am away for N days? ส่งได้ / ไม่ต้อง. Changeable in the
   island's ตั้งค่า and in Discord `/settings`. Never asked in a DM.
2. **The DM.** Content-free and guilt-free: a title, one line, one link
   button to the island (a link, not an interaction), and a note that it was
   sent because they turned it on. No question, no day count, no project.
3. **The return card.** When any student comes back after N days, a sheet
   opens once on arrival: "ช่วยเราปรับเกาะหน่อย", six one-tap reasons (busy,
   stuck, unclear next step, waiting on my team, the island is hard to use,
   just a break), an optional short line, one Send. Closing it is a skip; it
   never reopens for that stretch.
4. **Who reads it.** Admins: counts by reason and the short lines without
   names, by week. Mentors never see answers. Nobody replies. "Stuck" offers
   the existing group help. The card says, right where the line is typed,
   that an admin can see who wrote a line if they are worried about someone's
   safety, and that every look is recorded: it never promises secrecy
   (safeguarding section 7.3).

## Decisions

| # | Question | Answer |
|---|---|---|
| 1 | The DM asks why? | **No: a link DM, and the island asks** (founder, 2026-11-21). The policy stays as written. |
| 2 | Who gets the return card | **Every returning student** (founder). Optional, one-tap skip, once per stretch. A card only for DM opt-ins would ask the students least likely to leave. |
| 3 | An optional text line, and names | **A line, read without names** (founder). Lines are cleared after 90 days. Only an audited admin action reveals who wrote one, for a safeguarding concern under policy section 7. |
| 4 | N, the hour, the cooldown | 7 days, 17:00 Bangkok, at most one DM per stretch and per 14 days (builder's call; database settings, 3 to 21 days and 9 to 19 o'clock). |
| 5 | What counts as activity | A write: a check-in tap, a note, an intention or reflection, a quest started, a submission, a work session, a help request, an evidence photo, a peer check (builder's call). The end of a hold also starts a fresh stretch: a mentor's decision (or a withdrawal) on work the student or their team waited on, and the end of a rest (a quest resumed or archived), so time spent waiting on us or resting never counts as time away. A stretch never starts before the day before the active season began. Browsing, voice and the deep fire leave no record and do not count. Computed at read time; no history of days away is stored. |
| 6 | Never to | Staff, students who paused (resting), students waiting on a mentor's review of their own quest or their team's milestone (a delay we cause is never theirs to explain), on the day such a hold ends, between seasons (no active season covering today: no card, no DM), outside 09:00 to 19:59 Bangkok (builder's call). |
| 7 | Consent alone, or a parent | The student consents alone, like `/settings` DMs and reminders; parents are told through the island notice, whose version is bumped (builder's call; the bump cancels no consent). |
| 8 | Off switch | `/admin feature away`, off by default. Off hides the strip, the settings line and the card, and the bot sends nothing. One exception: a student who said yes still sees the settings line (island ตั้งค่า and Discord `/settings`, which then offers only "off"), so a yes can always be taken back, as the notice promises. |

## Why it is shaped like this

- **The DM asks nothing**, so the rule students rely on to spot fake accounts
  stays true, and a DM can never become a private channel.
- **The island asks in the student's own space**, and reaches students who
  closed server DMs, as onboarding tells them to.
- **No guilt.** No day counts, no "you missed", no streaks; the card asks
  what took their time, to help us, and is skippable.
- **The database holds the rules**: eligibility, caps, hours, consent, the
  switch and retention are `shift_quest_*` functions (schema 23).
- **Not a mentor list.** The alumni board's mentor page shows who has been
  quiet for 3+ days (company-brain `alumni.md:70`); that is a different
  surface for mentors. This feature names nobody to anyone.

## Rollout

1. Read live aggregates, read-only, no names: DM and reminder opt-in counts;
   students by days since their last write (0, 1-2, 3-6, 7+); resting;
   waiting on review.
2. On the founder's go, apply schema 23; deploy the web, then the bot.
3. Three-model Thai review of the new copy.
4. The founder turns on `/admin feature away`.
5. Read the same aggregates after a week, plus the return answers.
