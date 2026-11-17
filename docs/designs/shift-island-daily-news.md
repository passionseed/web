# SHIFT High Island: the nightly island news (ข่าวเกาะคืนนี้)

Status: built on `feat/shift-island-news-daily`, 2026-11-18. The migration
(`20261118130000_shift_quest_island_news_daily.sql`, schema 19) is **not
applied**: it waits for the founder's go, after #325's schema 18 (applied).
Until it is applied and the bot redeployed, nothing changes. Thai copy is
DRAFT and needs the three-model review in the root `AGENTS.md`.

## The moment

**Who:** every SHIFT High student in the SHIFT Discord. **When:** every
evening at 20:00 Bangkok. **What they see:** one card in #island-news, the
announcement channel: the night island moving in its lantern light, with a
figure at the campfire for each person sitting there, then what the island
did in the last 24 hours, the Demo Day countdown, a line of island lore and a
door back to the island and the campfire. On nights when a team can be
featured, the same card also carries the AI story of each such team.

Something posts every night. The card needs only the bot, the quest database
and a news channel: not the website, not the cron, not the Anthropic key, not
the AI switch, not sharing.

## Decisions (founder, 2026-11-18, and the parent thread for the founder)

| # | Question | Answer |
|---|---|---|
| 1 | How often | A post every day in #island-news. |
| 2 | What it says | The AI island news when any team can be featured, otherwise a plain island bulletin. Built as one card every night: the totals always, plus the AI section when entries exist. |
| 3 | When | 20:00 Bangkok. A new card only before 22:30; a stalled one is recovered until midnight; never a "yesterday" card. The AI cron moves to 18:00 Bangkok so its summaries are usually in the first send. |
| 4 | Counting window | 20:00 yesterday to 20:00 today, so every event counts once. The totals freeze when the card is claimed. |
| 5 | Small numbers | People counts (check-ins, campfire rounds) of 1 or 2 show without a number. The campfire line counts rounds but is floored by the people who made them (`rounders`), so one or two students' rounds never show as a number (each focus round is 25 minutes, so a number would show their time). Approvals and stages grown always show their exact number. A 0 line is left out; nothing at all is the quiet line. |
| 6 | Campfire | Rounds started with an intention, never minutes: every focus round promises ไม่มีใครนับเวลาของคุณ. The campfire join button stays. |
| 7 | The picture on edits | An edit keeps the picture: the bot downloads the posted picture back from Discord's CDN and attaches the same bytes again. Only a privacy take-down may drop it, as the last fallback. |
| 8 | Kept from the plan | The 7-day re-check of the AI lines, the lore lines (DRAFT), no crosspost. |
| 9 | Hard lines | No student names (team names only under `shift_quest__name_visible`), AI summaries only for AI-consented teams (`shift_quest__digest_eligible`), totals only for the bulletin, never a DM between adults and students, never a crosspost. |

## Why it is shaped like this

- **It always posts.** The digest needed the cron, the key, credit and
  `digest_enabled`; on 2026-11-10 the key had no credit and nothing posted for
  14 days. The bulletin needs none of them, so the channel never goes quiet.
- **Consent decides who is featured, not whether the island speaks.** The
  totals are island-wide integers with no id, name, slot or time. While
  sharing is off they count only the teams that show their name (the live
  post's rule); while it is on, every team, as the tree_grew celebrations
  already announce each growth. A team's name appears only inside an AI line,
  and only for a team where every member opted in and has AI consent.
- **One message a day, without doubles.** Its own ledger
  (`shift_quest_news_posts`): claim, then send, then a compare-and-set mark.
  Not the digest's table: an older bot image after a rollback would rewrite
  those messages as "taken down".
- **The AI goes quiet elsewhere.** While a news channel is set,
  `shift_quest_digest_post_next` answers null, so AI news lands only in the
  card, never in the live channel, even under an older bot.
- **No pressure.** No comparisons, rankings, streaks or "you missed". A quiet
  night is "🌙 วันนี้เกาะได้พัก ตะเกียงยังจุดรอทุกคนอยู่".

## The copy (DRAFT)

| Piece | Thai |
|---|---|
| Title | 🗞️ ข่าวเกาะคืนนี้ |
| Check-ins | 👣 แวะมาเช็กอิน **12** คน · 1 or 2: 👣 มีเพื่อนแวะมาเช็กอินแล้ว |
| Approvals and growth | ✅ พี่เลี้ยงผ่านงาน **5** เควสต์ · 🌱 ต้นไม้โตขึ้น **3** ขั้น |
| Campfire | 🔥 ตั้งเป้าทำงานรอบกองไฟ **8** รอบ · 1 or 2 people (however many rounds): 🔥 มีคนมาตั้งเป้าทำงานที่กองไฟ |
| Quiet night | 🌙 วันนี้เกาะได้พัก ตะเกียงยังจุดรอทุกคนอยู่ |
| Demo Day | 🎤 Demo Day (the active season's date) · อีก **N** วัน (the live post's line, only during an active season) |
| Lore (one a night, by the day) | 🏮 ตะเกียงตามต้นไม้ติดไฟครบแล้ว เกาะยามค่ำสว่างกำลังดี · ⛵ เรือจอดนิ่งอยู่ที่ท่า คืนนี้ไม่มีใครต้องรีบไปไหน · 🪶 นกนางนวลกลับรังไปแล้ว เหลือแต่เสียงคลื่นรอบเกาะ · 🌊 คืนนี้คลื่นเบา ได้ยินเสียงทะเลชัดเลย · 🪣 บ่อน้ำกลางเกาะสะท้อนแสงจันทร์ · 🔥 กองไฟกลางลานยังอุ่นอยู่ อยากนั่งทำงานกับเพื่อน เข้ามาได้เลย · 🧭 ติดตรงไหน ถามในห้อง SHIFT High ได้ ไม่ต้องรอให้พร้อม |
| AI heading | 📣 เรื่องจากแปลง (สรุปโดย AI) · Sunday: 📣 สรุปสัปดาห์จากแปลง (สรุปโดย AI) |
| Fine print | ตัวเลขรวมทั้งเกาะ ตั้งแต่ 2 ทุ่มเมื่อวานถึง 2 ทุ่มคืนนี้ ไม่บอกว่าใครเป็นใคร · ฉบับ 18 พ.ย. 2569 |
| No picture | 🖼️ คืนนี้รูปเกาะวาดไม่ขึ้น |
| /admin | ✅ ข่าวเกาะคืนนี้: โพสต์ทุกคืนราว 2 ทุ่มในห้องข่าวเกาะ · 🤖 สรุป AI ที่เก็บไว้วันนี้: 3 ทีม |

## How it works

- **Database** (`supabase/migrations/20261118130000_shift_quest_island_news_daily.sql`):
  `news_channel_id` on the settings (`/admin channel kind:news`); the ledger
  `shift_quest_news_posts` (RLS on, no policy, no Data API); helpers
  `shift_quest__news_at`, `__news_due(day, now)`, `__news_totals(day)`,
  `__news_ai(day)` and `__news_next(now)` (no login runs them); the bot's
  `shift_quest_news_post_next`, `_claim`, `_mark` and `_post_current`; the
  digest guard; `/admin island` gains `today_summaries` and channel `news`.
  Tested in `supabase/tests/shift_quests/news.ts`.
- **Bot** (`bot/src/quests/news.ts`, copy in `newsCopy.ts`): a check every 5
  minutes, from schema 19 only (`NEWS_SCHEMA`). The picture is
  `shift_quest_live_post`'s outsider island drawn at night (GIF, else PNG,
  else none; a picture Discord refuses goes once more without it). The
  re-check always reads a card from Discord (`force: true`), never from
  discord.js's cache, which keeps the card as it was sent and its expiring
  picture links. Edits re-attach the downloaded picture with
  `attachments: []`; after a restart a card is fetched once and edited only
  if its text differs. Each card is re-checked on its own, and tonight's card
  and the re-check fail separately, so one failure never holds back a
  take-down. Tested in `bot/src/quests/__tests__/news.test.ts`.
- **Admin** (`handlers/admin.ts`): `kind:news` takes a text or announcement
  channel students can see and read the history of, where the bot can view,
  send, attach and read history; an announcement channel is refused for
  every other kind.

## Open questions

- Who reads #island-news: SHIFT High students only, or parents and adults in
  the wider server too? The default is never to crosspost.
- Approve the seven lore lines, or supply lines from
  `docs/designs/shift-high-island-lore.md`. With seven lines picked by the
  day, each line falls on the same weekday every week (the campfire line is
  always the same evening). Keep that, shift the pick each week, or add lines
  so the count is not 7?
- The campfire line counts every work session started with an intention,
  including `/work start` ("ทำที่ไหนก็ได้"), not only rounds aimed at the
  campfire: the table does not tell them apart. Keep "รอบกองไฟ" (the
  campfire is the island's word for coworking), or reword the line?
- Confirm on a test server that an edit with the re-attached picture shows the
  GIF and that a restart edits nothing.
