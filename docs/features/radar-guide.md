# Radar Guide: implementation spec (final)

> **Superseded in part (2026-11-11).** Sections 2.1-2.6, 3.1, 6.1, 7.1 and 7.2 are superseded by [`radar-guides-in-code.md`](radar-guides-in-code.md): guides are typed code in `lib/radar-guides/<slug>/`, served at `/radar/<slug>/<page>`, with founder clips in a committed `clips.json`. The `radar_guide_chapters` table, the chapter editor, the script JSON push and pull, and the 7-chapter regrouping of the deck were removed before reaching production. The DB deck is now one plain scroll (`lib/radar/deck-sections.ts`). Attribution, visits, events, `/r` links, the IG "radar" campaign, DM fencing, reels and the funnel below still apply, with page keys in place of chapter keys.

Worktree: `/Users/bunyasit/dev/passionseed/web-radar-guide` (branch `feat/radar-guide`). All paths below are relative to it. This is Next.js 16.4.4: before writing route handlers, `after()`, `generateMetadata`, `opengraph-image` or caching code, read `node_modules/next/dist/docs/` (in particular `01-app/02-guides/caching-without-cache-components.md`).

This version merges the draft spec with three reviews (student UX, engineering, growth). Rejected review points are listed at the end with reasons.

Decisions already made, so engineers do not reopen them:
- The guide **is** the field page `/radar/[slug]`. The existing card deck is regrouped into 7 fixed chapters. There is no separate route, no modal, and no separate "guide mode": everything in this spec applies to every field page.
- Chapters, visits, events, requests, reels, links and DM logs are **new tables**. `radar_cards` and its kind CHECK are not touched. `radar_field_views` is left as it is.
- UTM capture is **client-side only**. The server never reads utm parameters, so the data cache stays effective.
- Videos are hosted on **Backblaze B2 behind cdn.passionseed.org**. No Supabase bucket is used.
- **Reels are not chapters.** A chapter is a section of the page. A reel is a social post with its own hook and angle that links to a chapter. Not every chapter needs a founder clip.
- Social masters follow the house **Dusk City** reel style (`company-brain/reels-style.md`: Kanit, cream subtitles on a plum strip, series tag). Our pipeline outputs a clean clip, a VTT and a cut list; it does not burn its own captions into social videos. The web player on the page uses the Radar deck's own look.
- Motion graphics reuse the **SHIFT reel engine** (Playwright plus ffmpeg). We do not adopt Remotion or HLS.
- Radar DMs use **fixed templates**, never Qwen, and never invite a 1:1 chat. Any thread a Radar DM opens is fenced off from the sales DM tooling (section 5.6).
- Our IG handle is `passion_seed.th` (`SELF_USERNAME` in `lib/meta/self-account.ts:18`, `CONTACT` in `lib/content/pathlab-page.ts:305`). Reuse `CONTACT`; do not add a second constant for it.
- The paid program named on the page is **not** "TechSeed รุ่น 6". company-brain (`glossary.md`, `history.md`) says TechSeed ran to #5 before the pivot to SHIFT. The outro's program line reads from `lib/content/radar-cta.ts`, which defaults to SHIFT and the open round from `lib/content/shift-cohort.ts`, and shows no price. The founder confirms this (section 9, open decision 2).
- Pilot scope is phased (section 8.0). Phase 1a is what must exist before the first reel posts.

---

## 1. Product flow end to end

### Instagram (primary)

1. **Reel.** One reel has one angle (`salary_reveal`, `myth_busted`, `ai_replace`, `portfolio_for_this_career`, `which_faculty`, `compare`, `day_in_life`, `overview`) and links to one chapter of one career, or to the hub for comparison reels. It is a founder clip cut in Dusk City style or a motion clip, with burned-in Thai captions. The end card (2.5s) carries two asks, as the house format requires (`company-brain/marketing.md`): "คอมเมนต์ RADAR รับลิงก์ทาง DM" and a send-to-a-friend line from the script, for example "ส่งให้เพื่อนที่ยังเลือกคณะไม่ได้". There is no follow ask in the reel. The first caption line is the hook stat. The reel's `media_id` is mapped in `radar_reels` (section 6) within an hour of posting.
2. **Comment.** The webhook stores the row in `ig_comments` as it does today. Two kinds of comment trigger a Radar DM:
   - the keyword `RADAR` or a Thai spelling (เรดาร์ and variants) on any post, or
   - an explicit link request (`ขอลิงก์`, `ส่งลิงก์`, `อยากได้ลิงก์`, `ขอข้อมูล`, `ขอ radar`) on a **mapped** Radar reel only.

   Vaguer comments on mapped reels ("ขอค่ะ", "อยากได้", "ขอด้วย") are not auto-sent. They show in the admin Radar queue with a one-click send of the same template.
3. **DM.** While `RADAR_COMMENT_DM_AUTO=on`, the webhook claims the comment and sends one private reply with the fixed template and a short link (`passionseed.org/r/<code>`). The pilot does not post a reel until auto-send has passed an end-to-end test (section 9, day 0). One public reply (with `@username`) goes out for every claimed comment, whether or not Graph reports the DM as delivered, because Instagram often accepts a private reply that the student never sees.
4. **Link.** `/r/<code>` resolves the reel's `radar_links` row and 302s to `https://passionseed.org/radar/<slug>?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=<slug>-<founder|motion>-<shortcode>#<chapter_key>`.
5. **Guide page.** The client:
   - captures utm parameters, referrer host and in-app browser (`ua_app`)
   - stores the last tagged touch in sessionStorage
   - removes utm parameters from the address bar with `history.replaceState`
   - reuses or creates a `visit_id` (sessionStorage per slug, 30 minutes), records the visit through an RPC
   - on a hash, scrolls to that chapter's **first card**, not its video. The student asked for "ข้อมูลเต็ม" and has just watched the clip. The arrived chapter's video is shown as a "ดูคลิปเต็มอีกครั้ง" chip on the chapter eyebrow, and autoplay starts no earlier than the next chapter.

   The student then scrolls through the chapters and fires guide events along the way.
6. **Mid-deck and outro.** After the `money` chapter (the point of peak value), one short card offers share and follow. The last screen offers, in order: the first step to try, "สนใจสายนี้" (intent), request the next career, share, follow, one line about the paid program, and "ดูอาชีพอื่น" (section 2.6).
7. **Measurement.** `analytics_radar_guide_funnel` reports per week, page (field or hub), channel and utm_content. `radar_reel_insights` reports reach, watch time, sends and saves per reel. Admins read both on `/admin/radar` (Phase 2 UI; in Phase 1 they query the views in Supabase).

### TikTok

TikTok has no DM API, and links in TikTok comments are not clickable. TikTok is treated as **reach only** in the pilot.
- The TikTok end card and caption show a **typeable** alias, for example `passionseed.org/r/cyber`, not "ลิงก์ในไบโอ". The pinned comment repeats it.
- If and when the account has a bio link (business account or 1k followers; check on day 0), the bio link is `passionseed.org/r/tt`.

### Bio links (IG and TikTok)

- `passionseed.org/r/ig` and `passionseed.org/r/tt` point at the **hub**, `/radar?utm_source=ig-bio|tiktok-bio&utm_medium=bio&utm_campaign=radar`, never at "the career currently being pushed". Someone who finds an older reel days later must not land on a different career.
- The hub shows a "จากคลิปไหน?" strip at the top: the last 6 mapped reels (career label, chapter title, poster when the chapter has one). Tapping one opens that career at that chapter.
- Stories use `/r/<alias>-story`.

### `/r/[code]` resolution

In order:
1. an active `radar_links` row
2. the alias pattern `<alias>` or `<alias>-(ig|tt|yt|story)`, with aliases `cyber`, `ai`, `data`, `dev`; published slugs are accepted directly
3. otherwise `/radar?utm_source=shortlink&utm_medium=unknown`

The route always returns a 302 with `Cache-Control: no-store`, logs the click in `after()` (failures swallowed), and never redirects to an arbitrary URL. It copies the pattern in `app/go/[source]/route.ts`.

### Safeguarding invariants (all units)

- We only message people who typed the keyword or an explicit link request on a Radar reel.
- Every automated message is one-off and fixed. There is no follow-up, no "ask me anything here", and no follow gate.
- A student who replies to a Radar DM gets, at most once, a fixed reply that points to public comments. Radar-origin threads never enter lead scoring, buckets, copilot drafts, Qwen personalisation or DM campaign broadcasts (section 5.6).
- Links carry no username or IGSID.
- The career request form rejects URLs, emails, @handles and long digit runs, and stores no contact details.
- Questions go to public comments.
- The CtaCard "นัดคุยกับรุ่นพี่" button (a paid 1:1 session through a LINE QR) is **always hidden** on the field page until the founder confirms it meets the AGENTS.md safeguarding rule. Its body copy ("มาลองคุยกับพวกเรารุ่นพี่") is rewritten so it does not invite a chat.

---

## 2. Page design: `/radar/[slug]`

**Look.** The page keeps the existing dark full-screen deck (`.radar-deck`, `bg-neutral-950`, per-career `--radar-accent` from `readableAccent`), its snap and touch-guard behaviour, its AI blackout and `.in-view` animations. New guide components use the deck's own typography (the families in `.market-section-heading`, `app/globals.css:53-70`: Instrument Serif for Latin display, Athiti for Thai) and `--radar-accent`. They do not introduce `--dawn-*` backgrounds or a second type system. Only captions use Bai Jamjuree 600, for legibility. A Dawn reskin of Radar is a separate project. Read `docs/ui-design-system.md` for the touch and animation rules, which still apply.

**Overlays.** The page is `fixed z-[100]` and mobile sections use `contain: content`, which clips fixed-position children. Every sheet and dialog (transcript, chapter list, sources) portals out and uses the `overlayClassName="!z-[190]"` / `className="!z-[200]"` overrides, as the existing CtaCard dialog does (`components/radar/RadarCards.tsx:1966`).

### 2.1 Fixed chapters (`lib/radar-guide/chapters.ts`, in this order)

| # | key (= URL hash) | title_th default | nav label | cards (kinds, in this order) | target length |
|---|---|---|---|---|---|
| 1 | `hook` | อาชีพนี้คืออะไร ทำไมต้องรู้ตอนนี้ | เปิดเรื่อง | `hook` | 15-25s |
| 2 | `reality` | ภาพในหัว กับ งานจริง | ความจริง | `fantasyReality` | 20-30s |
| 3 | `money` | เงินเดือนจริงในไทย | เงิน | `salaryProgression`, `careerSurvival` (synthetic score card), `marketThailand` | 25-35s |
| - | `share` | (no title) | - | `midShare` card (section 2.6) | - |
| 4 | `ai` | AI จะมาแทนไหม | AI | `aiImpact` (blackout unchanged) | 20-35s |
| 5 | `day` | หนึ่งวันทำอะไรบ้าง | หนึ่งวัน | `dayInLife`, `realPeople` (unless `is_hidden`), `risks` | 20-30s |
| 6 | `study` | เรียนอะไร เข้าคณะไหน | เรียนต่อ | `entryRoutes` | 20-30s |
| 7 | `start` | เริ่มลองได้เลยสัปดาห์นี้ | เริ่มเลย | the `RadarSkillExperience` rail (start options first), then the skills `text` card behind a "ดูทักษะทั้งหมด" expander | 20-35s |
| - | `outro` | ไปต่อ | ไปต่อ | GuideOutro (contains the intent button and the paid-program line) | - |
| - | `sources` | แหล่งข้อมูล | - | `sources` (last) | - |

Assignment rules:
- Filtered out, explicitly by kind or rule in `buildGuideSections` (not by relying on `is_hidden`): `reflection`, `jobs`, `growthCompare`, `list`, explore `text` cards (`isExploreCard`), the "ทางนี้คืออะไร" text card, and startCarousel `text` cards (`isStartCard`). startCarousel stays hidden as it is today (commit c8533443 hid it on purpose; it duplicates the start options in `RadarSkillExperience`). Ask that commit's author before bringing it back.
- `is_hidden` rows are still excluded upstream as today.
- A remaining card that matches no rule joins the chapter of the nearest preceding card by DB position.
- Within a chapter, cards follow the table order, then DB `position`.
- With `fromPlan` set: the outro and `cta` card are removed (as `isPlanReplacedCta` does today), `midShare` is removed, and `PlanDecisionBar` stays as it is.
- This replaces `radarCardDisplayOrder` and `sortRadarCardsForStory`, which fixes the bug where `realPeople` rendered after the CTA.

### 2.2 Section types

`buildGuideSections(cards, skills, chapters, { fromPlan, arrivedChapter })` is a pure function. It emits, for each chapter in order: `[chapterVideo?] [card... | skills]`, with `midShare` after `money`, then `outro`, then `sources`.

- A chapter with a published video row gets a `chapterVideo` section immediately before its first card, **except** the `arrivedChapter` (from the URL hash at mount), whose video is not emitted as a section. Its first card section carries `replayVideo: chapter` instead, which the eyebrow renders as a "ดูคลิปเต็มอีกครั้ง" chip that opens the video in a sheet.
- A chapter with no cards and no video is skipped. A chapter with a video but no cards still renders its video section.
- Each section carries `index` (its position in the deck), `chapterKey` and `isFirstInChapter`.

**Everything indexed by card in `RadarFieldPageClient.tsx` moves to sections.** Today several pieces assume one section per card (plus skills): the AI blackout (`cards.findIndex(aiImpact)` → `sectionRefs[aiIndex]`, line 518), `handleReflect`'s `goTo(idx+1)`, `progressItems.scrollIndex`, and the mark-tall and IntersectionObserver effects keyed on `[cards.length, initialSkills.length]`. All of them derive from `sections` and depend on `sections.length`. The stability test gains a fixture with a video section and a `midShare` section in place.

### 2.3 Header and chapter navigation

- The header always shows the current chapter as text: "3/7 · เงิน". Tapping it opens a bottom sheet listing all 7 chapter names in Thai (rows at least 48px tall); tapping a row calls `goTo` on that chapter's first section.
- The thin progress bar stays as a display only, grouped by chapter, with the active chapter's segment filling by scroll position (or by `currentTime / duration` while its video plays).
- The hash reflects the current chapter through `history.replaceState`.
- **Deep links on mobile.** Mobile sections use `content-visibility:auto` with `contain-intrinsic-size: auto 100dvh` (`app/globals.css:3435`), so the first `goTo` computes offsets from placeholder heights. On mount with a hash: scroll, then re-check the target's offset on the next two animation frames and with a ResizeObserver on the deck for up to 1s, correcting until the offset is stable. Test `#day` and `#start` on an iPhone.

### 2.4 Chapter eyebrow and sources chip

- The first card section of each chapter gets a `ChapterEyebrow` overlay, rendered by the section wrapper (card components are not modified): "3/7 · เงิน", plus a chip "อัปเดต <month year> · ที่มา" that opens a sheet with the sources cited by that chapter's cards (`source_refs` → `radar_sources`). The month comes from the newest `as_of` of those sources, or from `researched_at`.
- When the section carries `replayVideo`, the eyebrow also shows "ดูคลิปเต็มอีกครั้ง".

### 2.5 Chapter video section (`components/radar/guide/ChapterVideoSection.tsx`)

**Layout, mobile (at most 640px).**
- The section is one viewport tall (`min-height:100dvh`).
- The video box has a fixed `aspect-ratio:9/16`, `max-height: calc(100dvh - 112px)`, `object-fit:cover`, so its size is fixed before media loads.
- The eyebrow at the top reads "3/7 · เงิน". The controls row is at the bottom.
- "อ่านสิ่งที่พูด" opens a bottom-sheet dialog with the transcript (the cue texts from `captions_vtt`). It is a dialog so the section height never changes.

**Layout, desktop.** Two columns inside `max-w-6xl`: the video at `height:min(80dvh,720px)` on the left; on the right the eyebrow, `title_th`, `hook_th`, a short "ในบทนี้" list from the chapter definition, a "ดูข้อมูลบทนี้" button that scrolls to the next section, and the transcript toggle.

**Element.** `<video playsInline muted preload="none" poster=... disablePictureInPicture>`. No native `<track>`. `src` is set only once the section is within one viewport, using an IntersectionObserver with `rootMargin: "100% 0px"` attached to the **section**, not the video. Call `ReactDOM.preconnect("https://cdn.passionseed.org")` once.

**Encoding.** Web clips are 540x960, about 1.2 Mbps H.264 with AAC, faststart (about 4.5MB for 30s). Posters are webp under 60KB.

**Playback rules** (`usePlaybackManager`, one context per page). iOS rejects unmuted autoplay without a tap on that element, so the design assumes a tap per chapter:
1. **The first video in a visit** may autoplay muted when its section has been at least 60% visible for 700ms, with no `prefers-reduced-motion` and no `navigator.connection.saveData`. If `play()` rejects, show a large play button over the poster.
2. **Every later video** shows its poster with a large play button. If the student has turned sound on in this visit (`soundOn`, sessionStorage, in try/catch), the manager tries `play()` unmuted after the same 700ms dwell; if that rejects, it shows the play button. It never falls back to muted autoplay for later chapters.
3. Below 40% visible, pause. Only one video plays at a time; the manager pauses every other video.
4. Tapping a muted video unmutes it and sets `soundOn = true`. On the first unmute in a visit, `currentTime` goes back to 0. Fire `video_unmute`.
5. Tapping a video playing with sound toggles play and pause. Tapping the play button plays with sound.
6. When a video ends, show an overlay with "ดูข้อมูลจริงของบทนี้" (scrolls to the next section) and "ดูอีกครั้ง". The page never auto-scrolls.

**Captions.** `lib/radar-guide/vtt.ts` parses `captions_vtt` into cues. `CaptionOverlay` renders the active cue on `timeupdate`: Bai Jamjuree 600, 18px mobile and 20px desktop, white on `rgba(2,6,23,.72)` with 8px padding, at most 2 lines, 18% above the bottom of the video box. On by default with a CC toggle, visible from the first frame.

**Controls.** Play/pause, sound, CC and replay, plus a thin progress bar across the top of the video. No fullscreen button.

**Events** (through the `GuideTracker` prop): `video_play` (first play per visit and chapter, metadata `{muted}`), `video_unmute`, `video_progress` (`value_int` 25, 50, 75), `video_complete` (90% or more).

### 2.6 Without video (the default for most chapters, and the page must still be great)

No `chapterVideo` sections are emitted; eyebrows, chapter navigation and the hash work the same. The performance fixes in 2.9 make this page faster for IG visitors. There is no "coming soon" placeholder.

### 2.7 Interactive pieces

The page reuses `RadarCardView(kind, content)` unchanged in rendering. B1 adds an optional `onInteract?(target: string)` prop through to these interactions:

| target | fires on |
|---|---|
| `salary:level`, `salary:currency` | SalaryProgressionCard (level tap, currency toggle) |
| `fantasy:flip` | FantasyRealityCard |
| `ai:detail` | AiImpactCard |
| `skill:open` | RadarSkillExperience (start option opened) |
| `skills:expand` | "ดูทักษะทั้งหมด" expander |
| `sources:open` | eyebrow sources chip |
| `replay:open` | "ดูคลิปเต็มอีกครั้ง" chip |
| `chapters:open` | header chapter sheet |

Each is sent as `interactive_tap` with `target`. Each chapter's first section entering view sends `chapter_view` once per visit and chapter (scroll depth). Outro and CtaCard buttons send `cta_click` with target `intent`, `program`, `resource:<n>`, `first-step` or `plan`.

**Card ids.** The synthetic score card has id `"__score__"` (`app/radar/[slug]/page.tsx:74`). The tracker sends `cardId` only when it matches a UUID; otherwise it omits it, so the RPC never fails on the cast.

**Intents.** `RadarSkillExperience` start options already record `radar_interest_events` through `recordRadarStartOptionInterest`. They now pass `{ visit_id }` in metadata so the funnel can count them per visit.

### 2.8 Mid-deck share card and outro

**`midShare` (after the `money` chapter).** One short card: "ข้อมูลแบบนี้ มีเพื่อนที่ควรเห็นไหม" with the two share buttons below, and one follow line. No other asks.

**Outro (`components/radar/guide/GuideOutro.tsx`).** One section that grows with its content (mobile snap is already off, so there is no internal scroll). From top to bottom:
1. **"ลองอันนี้ก่อน"**: the first start option of the primary skill (same tile as the rail), firing `cta_click` `first-step`.
2. **"สนใจสายนี้"**: the intent button. It calls the same `recordInterested` path the CtaCard uses today (`radar_path_intents` plus the My Path intent), with `visit_id`, and never opens the LINE QR dialog. It replaces the hidden "นัดคุยกับรุ่นพี่" as the page's intent action, so the intents metric keeps working. Update `RadarFieldIntentWiring.test.tsx` and `RadarCtaCard.test.tsx` to assert it.
3. **Next career**: "อยากให้ทำอาชีพไหนต่อ?"
   - Input with `maxLength=80`, placeholder "เช่น นักบัญชี หมอฟัน นักออกแบบเกม", calling `tracker.submitCareerRequest(text)`.
   - It validates first with `validateCareerRequest` (`lib/radar-guide/career-request.ts`), the same rule as the SQL.
   - States: success "รับแล้ว ถ้ามีคนขอเยอะ เราจะทำเป็นตอนต่อไป"; rate-limited "ส่งเยอะไปหน่อย ลองใหม่อีกชั่วโมงนะ"; invalid "ขอแค่ชื่ออาชีพนะ ลองพิมพ์ใหม่อีกที".
   - Hint below: "หรือคอมเมนต์ชื่ออาชีพใต้คลิปใน IG ก็ได้".
4. **Share**: two 48px buttons, "ส่งใน LINE" (`https://line.me/R/share?text=` + encoded text and link) and "คัดลอกลิงก์" (shows "คัดลอกแล้ว", or on failure a selectable text field with the link). `navigator.share` replaces them only when `navigator.canShare?.()` is true and `ua_app !== "instagram"`. The link is the canonical URL plus `utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=<slug>`. Fires `share_click` with target `line`, `copy` or `native`.
5. **Follow**: platform-aware. TikTok visitors (`ua_app='tiktok'` or last touch `tiktok-*`) see "ติดตามใน TikTok" linking to `PASSIONSEED_TIKTOK_URL`; everyone else sees "ติดตาม @passion_seed.th จะได้ไม่พลาดอาชีพถัดไป" linking to `CONTACT.href`. If the TikTok constant is unset, TikTok visitors get the IG link. Fires `follow_click`, reported as "follow intent", not follows.
6. **Paid program line**: one short line and link from `lib/content/radar-cta.ts` (SHIFT and its open round by default; no price; nothing when no round is open). Fires `cta_click` `program`. The existing CtaCard resource links stay below it.
7. "ดูอาชีพอื่น" links to `/radar`.

### 2.9 Metadata, copy and performance (B1)

- `generateMetadata` in `app/radar/[slug]/page.tsx` uses `getCachedPublishedRadarField`.
  - title: `{ absolute: "${name_th} ทำงานอะไร เงินเดือนเท่าไร | Career Radar" }`. It must be `absolute`, because the root layout's `template: "%s | PassionSeed"` (`app/layout.tsx:133`) would add a second suffix.
  - description: `tagline_th` plus the hook stat, passed through a dash sanitiser (em and en dashes become a comma or a hyphen), so link previews never show an em dash even before the data sweep lands.
  - canonical: `/radar/<slug>`
- `app/radar/[slug]/opengraph-image.tsx` (ImageResponse, `lib/og/fonts/Kodchasan-Bold.ttf`) shows the career name and hook stat on the deck's dark background with the career accent, with `opengraph-image.alt.txt` beside it. It overrides the hub's `app/radar/opengraph-image.png` for field pages.
- Wrap `loadFieldSkills` in `unstable_cache` as `getCachedFieldSkills` in `lib/radar/server.ts`: key `["radar-field-skills-v1", String(isRadarPreview())]`, tags `published-radar-fields` and `radar-territories`, 300s. Bump the field key to `published-radar-field-v7` and update `lib/radar/__tests__/cache-preview.test.ts` (it asserts the v6 key and the number of `unstable_cache` calls).
- Move `getCareerCardVisual` to `lib/radar/card-visuals.ts`. `RadarPageClient` re-exports it; the field client imports it from lib.
- Load `OglTrendBackground` with `next/dynamic` (`ssr:false`).
- Drop `priority` on the decorative figure and use a webp variant of at most 60KB.
- Remove the render-blocking League Gothic `@import` from `app/globals.css:1`. Its only user is `components/map/MapCard.tsx:166`; load it there with `next/font/google`.
- Relabel "อัตราการจ้างจบใหม่" on careerSurvival (grep for it) to "คะแนนโอกาสงานจบใหม่ (ทีมเราประเมิน)", and the same wherever `job_access` or `ai_risk_score` are shown as statistics.
- Remove the em dashes in UI strings: `RadarCards.tsx:1906` (the TechSeed line, replaced by the program line) and `RadarFieldPageClient.tsx:910` (`PlanDecisionBar`).
- Translate leftover English to Thai: the signup toast ("Keep your Career Radar", "See why", "You reached the end..."), "No content yet for this field.", the `cardLabel` "Next Step", the reflection placeholder "Optional ... a sentence is fine" (which also has an em dash), and the back button aria-label.

---

## 3. Data model

Four migrations (Foundation, timestamps after `20261110160000`), all additive and idempotent, every new table with RLS. They run with `supabase db push`, which targets production. The `private` schema (`20260712133609_radar_data_foundation.sql`), `public.update_updated_at_column()` and `public.is_admin(uuid)` exist (checked). Admin reads of the existing analytics views keep working after the `security_invoker` change because each base table has an `is_admin(auth.uid())` SELECT policy.

Postgres regular expressions use `\y` for a word boundary; `\b` means backspace. Never write `\b` in SQL.

### 3.1 `supabase/migrations/20261111100000_radar_guide_chapters.sql`

```sql
CREATE TABLE IF NOT EXISTS public.radar_guide_chapters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id          uuid NOT NULL REFERENCES public.radar_fields(id) ON DELETE CASCADE,
  chapter_key       text NOT NULL CHECK (chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  position          integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','recorded','published','archived')),
  title_th          text NOT NULL CHECK (char_length(title_th) BETWEEN 1 AND 80),
  hook_th           text CHECK (hook_th IS NULL OR char_length(hook_th) <= 200),
  script            jsonb NOT NULL DEFAULT '{}'::jsonb
                    CHECK (jsonb_typeof(script) = 'object' AND pg_column_size(script) <= 16384),
  duration_target_s integer CHECK (duration_target_s IS NULL OR duration_target_s BETWEEN 10 AND 60),
  video_url         text CHECK (video_url IS NULL OR video_url ~ '^https://cdn\.passionseed\.org/radar/guide/[a-z0-9-]+/[a-z0-9_]+\.[0-9a-f]{8}\.mp4$'),
  poster_url        text CHECK (poster_url IS NULL OR poster_url ~ '^https://cdn\.passionseed\.org/radar/guide/[a-z0-9-]+/[a-z0-9_]+\.[0-9a-f]{8}\.webp$'),
  captions_vtt      text CHECK (captions_vtt IS NULL OR (char_length(captions_vtt) <= 20000 AND captions_vtt LIKE 'WEBVTT%')),
  duration_s        numeric(5,1) CHECK (duration_s IS NULL OR duration_s BETWEEN 1 AND 180),
  facts_checked_at  timestamptz,
  facts_checked_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at       timestamptz,
  published_at      timestamptz,
  updated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT radar_guide_chapters_field_key_uniq UNIQUE (field_id, chapter_key),
  CONSTRAINT radar_guide_chapters_publishable CHECK (
    status <> 'published' OR (video_url IS NOT NULL AND poster_url IS NOT NULL
      AND captions_vtt IS NOT NULL AND duration_s IS NOT NULL AND facts_checked_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS radar_guide_chapters_field_pos_idx ON public.radar_guide_chapters (field_id, position);

ALTER TABLE public.radar_guide_chapters ENABLE ROW LEVEL SECURITY;
-- Public reads come only from the anon client (radarReadClient), limited to published rows
-- and, through column grants, to the columns the page renders. Scripts and reviewer ids stay admin-only.
DROP POLICY IF EXISTS "read published guide chapters" ON public.radar_guide_chapters;
CREATE POLICY "read published guide chapters" ON public.radar_guide_chapters
  FOR SELECT TO anon USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.radar_fields f
      WHERE f.id = radar_guide_chapters.field_id AND f.is_published = true));
DROP POLICY IF EXISTS "admins manage guide chapters" ON public.radar_guide_chapters;
CREATE POLICY "admins manage guide chapters" ON public.radar_guide_chapters
  FOR ALL TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_guide_chapters FROM anon, authenticated;
GRANT SELECT (id, field_id, chapter_key, position, status, title_th, hook_th,
              video_url, poster_url, captions_vtt, duration_s, published_at)
  ON TABLE public.radar_guide_chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.radar_guide_chapters TO authenticated;

DROP TRIGGER IF EXISTS radar_guide_chapters_updated_at ON public.radar_guide_chapters;
CREATE TRIGGER radar_guide_chapters_updated_at BEFORE UPDATE ON public.radar_guide_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

With column grants, anon queries must name columns; `select=*` on this table fails for anon. `lib/radar/server.ts` selects the explicit list. The transcript comes from the VTT cue text, not from `script`.

### 3.2 `supabase/migrations/20261111100100_radar_visits.sql`

One visits table for both the hub and field pages. `radar_field_views` is not changed.

```sql
CREATE TABLE IF NOT EXISTS public.radar_visits (
  visit_id      uuid PRIMARY KEY,
  session_id    text NOT NULL CHECK (session_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_slug    text CHECK (field_slug IS NULL OR field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), -- NULL = /radar hub
  utm_source    text CHECK (utm_source    IS NULL OR utm_source    ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_medium    text CHECK (utm_medium    IS NULL OR utm_medium    ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_campaign  text CHECK (utm_campaign  IS NULL OR utm_campaign  ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_content   text CHECK (utm_content   IS NULL OR utm_content   ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$'),
  referrer_host text CHECK (referrer_host IS NULL OR referrer_host ~ '^[a-z0-9.-]{1,253}$'),
  ua_app        text CHECK (ua_app IS NULL OR ua_app IN ('instagram','tiktok','line','facebook','other')),
  created_at    timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_visits_created_idx ON public.radar_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS radar_visits_field_idx   ON public.radar_visits (field_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_visits_session_idx ON public.radar_visits (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_visits_source_idx  ON public.radar_visits (utm_source, created_at DESC) WHERE utm_source IS NOT NULL;
ALTER TABLE public.radar_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read radar visits" ON public.radar_visits;
CREATE POLICY "admins read radar visits" ON public.radar_visits
  FOR SELECT TO authenticated USING (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_visits FROM anon, authenticated;
GRANT SELECT ON TABLE public.radar_visits TO authenticated;

ALTER TABLE public.radar_path_intents ADD COLUMN IF NOT EXISTS visit_id uuid;
CREATE INDEX IF NOT EXISTS radar_path_intents_visit_idx ON public.radar_path_intents (visit_id) WHERE visit_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.radar_token(p text, p_case_sensitive boolean DEFAULT false)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_case_sensitive AND p ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$' THEN p
    WHEN NOT p_case_sensitive AND lower(p) ~ '^[a-z0-9][a-z0-9_.-]{0,63}$' THEN lower(p)
  END $$;

CREATE OR REPLACE FUNCTION private.record_radar_visit(
  p_session_id text, p_visit_id uuid, p_field_slug text DEFAULT NULL, p_attr jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := CASE WHEN coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN NULL ELSE auth.uid() END;
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9._:-]{8,128}$' OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'invalid radar session' USING ERRCODE = '22023'; END IF;
  IF p_attr IS NULL OR jsonb_typeof(p_attr) <> 'object' OR pg_column_size(p_attr) > 1024 THEN
    RAISE EXCEPTION 'invalid radar visit' USING ERRCODE = '22023'; END IF;
  IF p_field_slug IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM public.radar_fields WHERE slug = p_field_slug AND is_published) THEN
    RAISE EXCEPTION 'radar field not found' USING ERRCODE = 'P0002'; END IF;
  IF (SELECT count(*) FROM public.radar_visits
      WHERE session_id = p_session_id AND created_at >= now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'radar visit rate limit' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.radar_visits (visit_id, session_id, user_id, field_slug,
    utm_source, utm_medium, utm_campaign, utm_content, referrer_host, ua_app)
  VALUES (p_visit_id, p_session_id, v_uid, p_field_slug,
    private.radar_token(p_attr->>'utm_source'), private.radar_token(p_attr->>'utm_medium'),
    private.radar_token(p_attr->>'utm_campaign'), private.radar_token(p_attr->>'utm_content', true),
    CASE WHEN p_attr->>'referrer_host' ~ '^[a-z0-9.-]{1,253}$' THEN p_attr->>'referrer_host' END,
    CASE WHEN p_attr->>'ua_app' IN ('instagram','tiktok','line','facebook','other') THEN p_attr->>'ua_app' END)
  ON CONFLICT (visit_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.record_radar_visit(
  p_session_id text, p_visit_id uuid, p_field_slug text DEFAULT NULL, p_attr jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.record_radar_visit(p_session_id, p_visit_id, p_field_slug, p_attr) $$;
REVOKE ALL ON FUNCTION private.radar_token(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_radar_visit(text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_radar_visit(text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_radar_visit(text, uuid, text, jsonb) TO anon, authenticated;

-- Existing aggregate views were created without security_invoker, so anon can read them.
ALTER VIEW public.analytics_radar_engagement SET (security_invoker = true);
ALTER VIEW public.analytics_radar_totals     SET (security_invoker = true);
ALTER VIEW public.analytics_radar_interest   SET (security_invoker = true);
REVOKE ALL ON public.analytics_radar_engagement, public.analytics_radar_totals, public.analytics_radar_interest FROM anon;
GRANT SELECT ON public.analytics_radar_engagement, public.analytics_radar_totals, public.analytics_radar_interest TO authenticated;
```

### 3.3 `supabase/migrations/20261111100200_radar_guide_events.sql`

```sql
CREATE TABLE IF NOT EXISTS public.radar_guide_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL,
  session_id  text NOT NULL CHECK (session_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_slug  text CHECK (field_slug IS NULL OR field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  event_type  text NOT NULL CHECK (event_type IN ('chapter_view','video_play','video_unmute','video_progress',
                'video_complete','interactive_tap','cta_click','follow_click','share_click')),
  chapter_key text CHECK (chapter_key IS NULL OR chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  card_id     uuid REFERENCES public.radar_cards(id) ON DELETE SET NULL,
  target      text CHECK (target IS NULL OR target ~ '^[a-z0-9][a-z0-9_.:-]{0,63}$'),
  value_int   integer CHECK (value_int IS NULL OR value_int BETWEEN 0 AND 100000),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
              CHECK (jsonb_typeof(metadata) = 'object' AND pg_column_size(metadata) <= 1024),
  created_at  timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_guide_events_field_type_idx ON public.radar_guide_events (field_slug, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_guide_events_visit_idx ON public.radar_guide_events (visit_id);
CREATE INDEX IF NOT EXISTS radar_guide_events_session_idx ON public.radar_guide_events (session_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS radar_guide_events_once_uidx ON public.radar_guide_events
  (visit_id, event_type, (coalesce(chapter_key, '')), (coalesce(value_int, -1)))
  WHERE event_type IN ('chapter_view','video_play','video_unmute','video_progress','video_complete');
ALTER TABLE public.radar_guide_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read radar guide events" ON public.radar_guide_events;
CREATE POLICY "admins read radar guide events" ON public.radar_guide_events
  FOR SELECT TO authenticated USING (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_guide_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.radar_guide_events TO authenticated;

CREATE OR REPLACE FUNCTION private.record_radar_guide_event(
  p_session_id text, p_visit_id uuid, p_event_type text, p_field_slug text DEFAULT NULL,
  p_chapter_key text DEFAULT NULL, p_card_id uuid DEFAULT NULL, p_target text DEFAULT NULL,
  p_value_int integer DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_field_id uuid;
  v_uid uuid := CASE WHEN coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN NULL ELSE auth.uid() END;
BEGIN
  IF p_event_type IS NULL OR p_event_type NOT IN ('chapter_view','video_play','video_unmute','video_progress',
     'video_complete','interactive_tap','cta_click','follow_click','share_click') THEN
    RAISE EXCEPTION 'invalid radar guide event' USING ERRCODE = '22023'; END IF;
  IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9._:-]{8,128}$' OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'invalid radar session' USING ERRCODE = '22023'; END IF;
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' OR pg_column_size(p_metadata) > 1024 THEN
    RAISE EXCEPTION 'invalid radar guide metadata' USING ERRCODE = '22023'; END IF;
  IF p_field_slug IS NOT NULL THEN
    SELECT id INTO v_field_id FROM public.radar_fields WHERE slug = p_field_slug AND is_published;
    IF v_field_id IS NULL THEN RAISE EXCEPTION 'radar field not found' USING ERRCODE = 'P0002'; END IF;
  END IF;
  IF p_card_id IS NOT NULL AND (v_field_id IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.radar_cards c WHERE c.id = p_card_id AND c.field_id = v_field_id)) THEN
    RAISE EXCEPTION 'radar card not in field' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.radar_guide_events
      WHERE session_id = p_session_id AND created_at >= now() - interval '1 minute') >= 60 THEN
    RAISE EXCEPTION 'radar guide rate limit' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.radar_guide_events (visit_id, session_id, user_id, field_slug, event_type,
    chapter_key, card_id, target, value_int, metadata)
  VALUES (p_visit_id, p_session_id, v_uid, p_field_slug, p_event_type,
    CASE WHEN p_chapter_key ~ '^[a-z][a-z0-9_]{1,31}$' THEN p_chapter_key END, p_card_id,
    CASE WHEN p_target ~ '^[a-z0-9][a-z0-9_.:-]{0,63}$' THEN p_target END,
    CASE WHEN p_value_int BETWEEN 0 AND 100000 THEN p_value_int END, p_metadata)
  ON CONFLICT (visit_id, event_type, (coalesce(chapter_key, '')), (coalesce(value_int, -1)))
    WHERE event_type IN ('chapter_view','video_play','video_unmute','video_progress','video_complete')
  DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.record_radar_guide_event(
  p_session_id text, p_visit_id uuid, p_event_type text, p_field_slug text DEFAULT NULL,
  p_chapter_key text DEFAULT NULL, p_card_id uuid DEFAULT NULL, p_target text DEFAULT NULL,
  p_value_int integer DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.record_radar_guide_event(p_session_id, p_visit_id, p_event_type, p_field_slug,
    p_chapter_key, p_card_id, p_target, p_value_int, p_metadata) $$;
REVOKE ALL ON FUNCTION private.record_radar_guide_event(text,uuid,text,text,text,uuid,text,integer,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_radar_guide_event(text,uuid,text,text,text,uuid,text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_radar_guide_event(text,uuid,text,text,text,uuid,text,integer,jsonb) TO anon, authenticated;

-- Career requests: free text from minors. Admin-only, no contact details, never shown publicly.
CREATE TABLE IF NOT EXISTS public.radar_career_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source             text NOT NULL DEFAULT 'page' CHECK (source IN ('page','ig_comment')),
  session_id         text CHECK (session_id IS NULL OR session_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  visit_id           uuid,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_field_slug    text CHECK (from_field_slug IS NULL OR from_field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  request_text       text NOT NULL CHECK (char_length(request_text) BETWEEN 2 AND 80),
  matched_field_slug text,
  status             text NOT NULL DEFAULT 'new' CHECK (status IN ('new','merged','planned','published','rejected')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT radar_career_requests_page_session CHECK (source <> 'page' OR session_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS radar_career_requests_text_idx ON public.radar_career_requests (lower(request_text));
CREATE INDEX IF NOT EXISTS radar_career_requests_created_idx ON public.radar_career_requests (created_at DESC);
ALTER TABLE public.radar_career_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage career requests" ON public.radar_career_requests;
CREATE POLICY "admins manage career requests" ON public.radar_career_requests
  FOR ALL TO authenticated USING (public.is_admin((SELECT auth.uid()))) WITH CHECK (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_career_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.radar_career_requests TO authenticated;

CREATE OR REPLACE FUNCTION private.submit_radar_career_request(
  p_session_id text, p_visit_id uuid, p_text text, p_from_field_slug text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_text text := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
  v_uid uuid := CASE WHEN coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN NULL ELSE auth.uid() END;
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid radar session id' USING ERRCODE = '22023'; END IF;
  IF char_length(v_text) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'invalid career request' USING ERRCODE = '22023'; END IF;
  -- Real contact data only: URLs, domains, @handles and emails, and runs of 8+ digits.
  -- No Thai keyword blocks: เชฟร้านเบอร์เกอร์, อินฟลูเอนเซอร์ไอจี and ไลน์แมน are real careers.
  -- Mirrored in lib/radar-guide/career-request.ts validateCareerRequest().
  IF v_text ~* '(https?://|www\.|\.(com|net|org|co|me|th|io|ly|gg)\y|@[a-z0-9_.]{2,}|[0-9][0-9 -]{6,}[0-9])' THEN
    RAISE EXCEPTION 'career request has contact details' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.radar_career_requests
      WHERE session_id = p_session_id AND created_at >= now() - interval '1 hour') >= 5
     OR (SELECT count(*) FROM public.radar_career_requests WHERE created_at >= now() - interval '1 hour') >= 300 THEN
    RAISE EXCEPTION 'career request rate limit' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.radar_career_requests (source, session_id, visit_id, user_id, from_field_slug, request_text)
  VALUES ('page', p_session_id, p_visit_id, v_uid,
    CASE WHEN p_from_field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN p_from_field_slug END, v_text);
END $$;
CREATE OR REPLACE FUNCTION public.submit_radar_career_request(
  p_session_id text, p_visit_id uuid, p_text text, p_from_field_slug text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.submit_radar_career_request(p_session_id, p_visit_id, p_text, p_from_field_slug) $$;
REVOKE ALL ON FUNCTION private.submit_radar_career_request(text,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_radar_career_request(text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_radar_career_request(text,uuid,text,text) TO anon, authenticated;

-- Channel = utm_source when tagged; otherwise inferred. Mirrored in lib/radar-guide/utm.ts radarChannel().
CREATE OR REPLACE FUNCTION public.radar_channel(p_source text, p_ref text, p_app text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_source IS NOT NULL THEN p_source
    WHEN p_app = 'instagram' OR p_ref LIKE '%instagram.com' THEN 'ig-untagged'
    WHEN p_app = 'tiktok' OR p_ref LIKE '%tiktok.com' THEN 'tiktok-untagged'
    WHEN p_app IN ('line','facebook') THEN p_app || '-untagged'
    WHEN p_ref IS NULL OR p_ref LIKE '%passionseed.org' THEN 'direct'
    ELSE 'referral' END $$;
REVOKE ALL ON FUNCTION public.radar_channel(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.radar_channel(text,text,text) TO authenticated;

CREATE OR REPLACE VIEW public.analytics_radar_guide_funnel WITH (security_invoker = true) AS
WITH v AS (
  SELECT visit_id, session_id, coalesce(field_slug, 'hub') AS page, utm_campaign, utm_content,
    date_trunc('week', (created_at AT TIME ZONE 'Asia/Bangkok'))::date AS week,
    public.radar_channel(utm_source, referrer_host, ua_app) AS channel
  FROM public.radar_visits),
e AS (
  SELECT visit_id,
    count(DISTINCT chapter_key) FILTER (WHERE event_type = 'chapter_view') AS chapters_seen,
    bool_or(event_type = 'video_play') AS played, bool_or(event_type = 'video_unmute') AS unmuted,
    bool_or(event_type = 'video_complete') AS completed,
    count(DISTINCT chapter_key) FILTER (WHERE event_type = 'video_complete') AS chapters_done,
    bool_or(event_type = 'interactive_tap') AS tapped, bool_or(event_type = 'cta_click') AS cta,
    bool_or(event_type = 'follow_click') AS followed, bool_or(event_type = 'share_click') AS shared
  FROM public.radar_guide_events GROUP BY visit_id),
i AS (
  SELECT visit_id FROM public.radar_path_intents WHERE visit_id IS NOT NULL
  UNION
  SELECT (metadata->>'visit_id')::uuid FROM public.radar_interest_events
  WHERE event_type = 'interested'
    AND metadata->>'visit_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
r AS (SELECT DISTINCT visit_id FROM public.radar_career_requests WHERE visit_id IS NOT NULL)
SELECT v.week, v.page, v.channel, v.utm_campaign, v.utm_content,
  count(*) AS visits, count(DISTINCT v.session_id) AS unique_devices,
  coalesce(sum(e.chapters_seen), 0) AS chapters_seen,
  count(*) FILTER (WHERE e.played) AS video_plays, count(*) FILTER (WHERE e.unmuted) AS unmutes,
  count(*) FILTER (WHERE e.completed) AS visits_with_complete, coalesce(sum(e.chapters_done), 0) AS chapters_completed,
  count(*) FILTER (WHERE e.tapped) AS interactive_visits, count(*) FILTER (WHERE e.cta) AS cta_clicks,
  count(*) FILTER (WHERE e.followed) AS follow_intents, count(*) FILTER (WHERE e.shared) AS share_clicks,
  count(*) FILTER (WHERE v.visit_id IN (SELECT visit_id FROM i)) AS intents,
  count(*) FILTER (WHERE v.visit_id IN (SELECT visit_id FROM r)) AS career_requests
FROM v LEFT JOIN e USING (visit_id) GROUP BY 1,2,3,4,5;
REVOKE ALL ON public.analytics_radar_guide_funnel FROM anon;
GRANT SELECT ON public.analytics_radar_guide_funnel TO authenticated;
```

### 3.4 `supabase/migrations/20261111100300_radar_social.sql`

```sql
CREATE TABLE IF NOT EXISTS public.radar_reels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         text NOT NULL CHECK (platform IN ('instagram','tiktok','youtube')),
  media_id         text CHECK (media_id IS NULL OR media_id ~ '^[0-9_]{5,64}$'),
  shortcode        text CHECK (shortcode IS NULL OR shortcode ~ '^[A-Za-z0-9_-]{5,40}$'),
  permalink        text CHECK (permalink IS NULL OR permalink ~ '^https://(www\.)?(instagram\.com|tiktok\.com|youtube\.com)/'),
  field_slug       text REFERENCES public.radar_fields(slug) ON UPDATE CASCADE ON DELETE SET NULL, -- NULL = hub
  chapter_key      text CHECK (chapter_key IS NULL OR chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  video_kind       text NOT NULL DEFAULT 'founder' CHECK (video_kind IN ('founder','motion')),
  angle            text CHECK (angle IS NULL OR angle IN ('salary_reveal','myth_busted','ai_replace',
                     'portfolio_for_this_career','which_faculty','compare','day_in_life','overview')),
  is_trial         boolean NOT NULL DEFAULT false,
  hook_variant     smallint CHECK (hook_variant IS NULL OR hook_variant BETWEEN 0 AND 9),
  career_label_th  text CHECK (career_label_th IS NULL OR char_length(career_label_th) <= 40),
  dm_enabled       boolean NOT NULL DEFAULT true,
  posted_at        timestamptz,
  note             text CHECK (note IS NULL OR char_length(note) <= 200),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- The DM says "สาย {label}"; the full name_th reads badly, so a mapped reel needs a short label.
  CONSTRAINT radar_reels_label_required CHECK (field_slug IS NULL OR career_label_th IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS radar_reels_platform_media_uidx ON public.radar_reels (platform, media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS radar_reels_field_idx ON public.radar_reels (field_slug);
CREATE INDEX IF NOT EXISTS radar_reels_posted_idx ON public.radar_reels (posted_at DESC);

CREATE TABLE IF NOT EXISTS public.radar_links (
  code          text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  field_slug    text REFERENCES public.radar_fields(slug) ON UPDATE CASCADE ON DELETE SET NULL, -- NULL = hub
  chapter_key   text CHECK (chapter_key IS NULL OR chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  reel_id       uuid REFERENCES public.radar_reels(id) ON DELETE SET NULL,
  utm_source    text NOT NULL CHECK (utm_source ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_medium    text NOT NULL CHECK (utm_medium ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_campaign  text NOT NULL DEFAULT 'radar' CHECK (utm_campaign ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_content   text CHECK (utm_content IS NULL OR utm_content ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$'),
  is_active     boolean NOT NULL DEFAULT true,
  note          text CHECK (note IS NULL OR char_length(note) <= 200),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS radar_links_reel_uidx ON public.radar_links (reel_id) WHERE reel_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.radar_link_clicks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,             -- resolved code or fallback alias; not an FK so alias clicks log too
  field_slug text,
  ua_app     text CHECK (ua_app IS NULL OR ua_app IN ('instagram','tiktok','line','facebook','other')),
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_link_clicks_code_idx ON public.radar_link_clicks (code, created_at DESC);

-- One row per comment we DM'd (or tried to). UNIQUE(comment_id) plus claim_radar_comment_dm() is the send lock.
-- comment_id is ig_comments.id (uuid). Graph calls use ig_comments.ig_comment_id (Meta's text id).
CREATE TABLE IF NOT EXISTS public.radar_comment_dms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id     uuid NOT NULL UNIQUE REFERENCES public.ig_comments(id) ON DELETE CASCADE,
  reel_id        uuid REFERENCES public.radar_reels(id) ON DELETE SET NULL,
  field_slug     text,
  matched_by     text NOT NULL DEFAULT 'keyword' CHECK (matched_by IN ('keyword','request_phrase','admin')),
  mode           text NOT NULL CHECK (mode IN ('auto','admin')),
  status         text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','sent','failed','skipped')),
  skip_reason    text,
  error_code     text,
  link           text,
  message        text CHECK (message IS NULL OR char_length(message) <= 1000),
  public_reply   text,
  sent_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  dm_tap_at      timestamptz,             -- quick-reply tap (section 5.4), when that flow is on
  created_at     timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_comment_dms_reel_idx ON public.radar_comment_dms (reel_id, created_at DESC);

-- Daily snapshot of Graph /{media-id}/insights per mapped reel (cron, section 5.7).
CREATE TABLE IF NOT EXISTS public.radar_reel_insights (
  reel_id        uuid NOT NULL REFERENCES public.radar_reels(id) ON DELETE CASCADE,
  captured_on    date NOT NULL,
  views          integer, reach integer, saved integer, shares integer, comments integer,
  likes          integer, avg_watch_ms integer, follows integer, profile_visits integer,
  raw            jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(raw) <= 8192),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, captured_on));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['radar_reels','radar_links','radar_link_clicks','radar_comment_dms','radar_reel_insights'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "admins manage %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "admins manage %s" ON public.%I FOR ALL TO authenticated USING (public.is_admin((SELECT auth.uid()))) WITH CHECK (public.is_admin((SELECT auth.uid())))', t, t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
  END LOOP; END $$;

DROP TRIGGER IF EXISTS radar_reels_updated_at ON public.radar_reels;
CREATE TRIGGER radar_reels_updated_at BEFORE UPDATE ON public.radar_reels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS radar_links_updated_at ON public.radar_links;
CREATE TRIGGER radar_links_updated_at BEFORE UPDATE ON public.radar_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic claim, service role only. Wins when no row exists, or the previous attempt failed,
-- or a claim is stale (crash between claim and send). Sets ig_comments.replied_at in the same transaction.
CREATE OR REPLACE FUNCTION public.claim_radar_comment_dm(
  p_comment_id uuid, p_mode text, p_matched_by text, p_reel_id uuid DEFAULT NULL,
  p_field_slug text DEFAULT NULL, p_sent_by uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  -- A comment someone already answered outside the Radar flow is never claimed.
  IF EXISTS (SELECT 1 FROM public.ig_comments c WHERE c.id = p_comment_id AND c.replied_at IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM public.radar_comment_dms d WHERE d.comment_id = p_comment_id) THEN
    RETURN NULL; END IF;
  INSERT INTO public.radar_comment_dms AS d (comment_id, mode, matched_by, reel_id, field_slug, sent_by, status, claimed_at)
  VALUES (p_comment_id, p_mode, p_matched_by, p_reel_id, p_field_slug, p_sent_by, 'claimed', now())
  ON CONFLICT (comment_id) DO UPDATE
    SET status = 'claimed', mode = EXCLUDED.mode, sent_by = EXCLUDED.sent_by,
        error_code = NULL, claimed_at = now()
    WHERE d.status = 'failed' OR (d.status = 'claimed' AND d.claimed_at < now() - interval '10 minutes')
  RETURNING d.id INTO v_id;
  IF v_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.ig_comments SET replied_at = now() WHERE id = p_comment_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_radar_comment_dm(uuid,text,text,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_radar_comment_dm(uuid,text,text,uuid,text,uuid) TO service_role;

-- Radar-origin DM threads are fenced off from sales tooling (section 5.6).
ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS origin text CHECK (origin IS NULL OR origin IN ('radar')),
  ADD COLUMN IF NOT EXISTS radar_reply_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS dm_conversations_origin_idx ON public.dm_conversations (origin) WHERE origin IS NOT NULL;

INSERT INTO public.radar_links (code, field_slug, utm_source, utm_medium, utm_content) VALUES
  ('tt', NULL, 'tiktok-bio', 'bio', 'hub-bio'),
  ('ig', NULL, 'ig-bio',     'bio', 'hub-bio')
ON CONFLICT (code) DO NOTHING;
```

`/r/[code]`, the webhook and the claim run with `createAdminClient()` on the server only. Admin pages use the user client, gated by RLS; the admin "send" server action calls `requireAdmin` and then uses the admin client for the claim RPC.

### 3.5 Out of scope: hardening the legacy inserts

`radar_field_views` and `radar_path_intents` still accept direct anon inserts. Moving them behind RPCs is a separate follow-up and is not needed for the pilot, since the funnel reads `radar_visits`.

### 3.6 Video storage

Videos go to the Backblaze B2 bucket (`B2_*` env, `b2` in `lib/backblaze.ts`) and are served from `https://cdn.passionseed.org` (already in `remotePatterns`, serves byte ranges). Keys:
- `radar/guide/<slug>/<chapter_key>.<sha8>.mp4|.webp`: the web clip and poster, `Cache-Control: public, max-age=31536000, immutable`
- `radar/art/<slug>/<scene>.<sha8>.png`: generated background art

No Supabase bucket, nothing under `public/`. Raw footage and social masters stay on the founder's machine or Drive.

---

## 4. Server and lib changes (file by file)

| File | Responsibility |
|---|---|
| `lib/radar-guide/types.ts` (Foundation) | All shared types (section 8.1). |
| `lib/radar-guide/chapters.ts` (Foundation) | `GUIDE_CHAPTERS` defs (table in 2.1), `chapterForCard(card, prevChapter)`, `toPublicChapter(row)` (transcript from VTT cues). Pure. |
| `lib/radar-guide/utm.ts` (Foundation) | Source vocabulary, `sanitizeUtmToken`, `buildRadarUrl`, `radarUtmContent`, `radarChannel` (mirror of the SQL). Pure. |
| `lib/radar-guide/career-request.ts` (Foundation) | `validateCareerRequest(text)` mirroring the SQL rule. Pure. |
| `lib/radar-guide/thai-copy.ts` (Foundation) | `findDashes(text)`, `containsNumber(text)` (Arabic digits, Thai digits ๐-๙, and spelled numbers: สิบ ร้อย พัน หมื่น แสน ล้าน เปอร์เซ็นต์ เท่า ครึ่ง), `sanitizeDashes(text)`. Pure, shared by lint, dump and metadata. |
| `lib/radar-guide/script-schema.ts` (Foundation) | zod `ChapterScript` and `CareerScriptFile`, plus `lintChapterScript()` (section 7.1). Pure. |
| `lib/radar/server.ts` (B1) | Adds `radar_guide_chapters(id,chapter_key,position,status,title_th,hook_th,video_url,poster_url,captions_vtt,duration_s,published_at)` to the select (explicit columns), filtered to `status='published'`, or `in ('recorded','published')` when `isRadarPreview()`. Key `published-radar-field-v7`. Adds `getCachedFieldSkills`. |
| `app/radar/[slug]/page.tsx` (B1) | Maps the chapters through `toPublicChapter`, passes `initialChapters`, uses `getCachedFieldSkills`, adds `generateMetadata`. Still reads only `from` from searchParams. |
| `app/radar/[slug]/opengraph-image.tsx` + `.alt.txt` (B1) | Per-career OG image. |
| `lib/radar-guide/sections.ts` (B1) | `buildGuideSections()`. Pure. Replaces `radarCardDisplayOrder` and `sortRadarCardsForStory`. |
| `components/radar/RadarFieldPageClient.tsx` (B1) | Renders `GuideSection[]`, section-indexed blackout and navigation, header chapter label and sheet, hash sync and settle, mounts `useRadarVisit`, passes `tracker` to guide components. |
| `components/radar/RadarCards.tsx` (B1) | `onInteract` prop, CtaCard: mentor button removed, intent button, program line from `radar-cta.ts`, copy fixes, relabels, English strings. |
| `components/radar/RadarSkillExperience.tsx` (B1) | `onInteract('skill:open')`, passes `visitId` to `recordRadarStartOptionInterest`, exposes the first start option for the outro. |
| `lib/radar/card-visuals.ts`, `components/radar/RadarPageClient.tsx` (B1) | Moves `getCareerCardVisual`. |
| `lib/content/radar-cta.ts` (B1) | Program line: label, href (SHIFT open round from `lib/content/shift-cohort.ts`), no price; checked against company-brain. |
| `components/map/MapCard.tsx`, `app/globals.css` line 1 (B1) | League Gothic via `next/font/google`, `@import` removed. |
| `components/radar/guide/*`, `lib/radar-guide/vtt.ts`, `lib/radar-guide/social.ts` (B2) | Player, captions, eyebrow, chapter sheet, sources sheet, transcript sheet, mid-share card, outro, request form, share, follow. `social.ts` re-exports `CONTACT` for IG and holds `PASSIONSEED_TIKTOK_URL` (null until confirmed). |
| `lib/radar-guide/attribution.ts` (C) | `parseAttribution(search, referrer, ua, ownHost)`, `detectUaApp`, `stripUtmFromUrl`, `captureRadarAttribution()` (sessionStorage last touch, replaceState), `getOrCreateVisitId(pageKey)` (sessionStorage, 30 minutes). |
| `lib/radar-guide/use-radar-visit.ts` (C) | `useRadarVisit(fieldSlug \| null): { visitId, attribution, tracker }`. Records the visit once and returns a `GuideTracker`. |
| `lib/radar-guide/events.ts` (C) | Client RPC wrappers: `recordRadarVisit`, `recordGuideEvent` (drops non-UUID `cardId`), `submitCareerRequest`. Fire-and-forget, skip on localhost through `lib/radar/analytics-host.ts`, catch every error. |
| `lib/supabase/radar.ts` (C) | `recordRadarPathIntent` and `recordRadarStartOptionInterest` accept an optional `visitId` (intent column; interest `metadata.visit_id`). `recordRadarFieldView` unchanged. |
| `lib/radar-guide/short-links.ts` (C) | `resolveShortLink(code, {lookup, isPublishedSlug})`, the alias map, default UTMs. Pure apart from injected functions. |
| `app/r/[code]/route.ts` (C) | 302 redirect plus click logging in `after()`. |
| `proxy.ts` (C) | `/r/` early return next to `/go/` (line 76). |
| `utils/supabase/proxy.ts` (C) | Adds `/radar` and `/r/` to `shouldSkipOnboardGate`, so UTMs survive for half-onboarded users. |
| `app/radar/page.tsx`, `components/radar/RadarLandingBeacon.tsx`, `components/radar/RecentReelsStrip.tsx` (C) | Hub visit through `useRadarVisit(null)`; "จากคลิปไหน?" strip fed by `getCachedRecentRadarReels()`. |
| `lib/radar/recent-reels.ts` (C) | `getCachedRecentRadarReels()`: admin client, server-only, returns only `{fieldSlug, chapterKey, careerLabelTh, chapterTitleTh, posterUrl, postedAt}` for the last 6 mapped reels with a published field; `unstable_cache` 300s, tag `radar-reels`. |
| `lib/meta/comment-intent.ts` (D) | `isRadarRequest`, `isRadarLinkRequest`, `radar` CampaignKey. |
| `lib/meta/graph.ts` (D) | `listInstagramMedia(igUserId, { maxPages })` adds `shortcode`, caps pages (default 2); `getMediaInsights(mediaId)`; quick-reply private reply helper (section 5.4). |
| `lib/radar-guide/comment-target.ts`, `dm-copy.ts`, `comment-dm.ts`, `dm-thread.ts` (D) | Resolve, build copy, auto-send, Radar thread fencing. |
| `lib/supabase/radar-reels.ts` (D) | `getReelByMediaId`, `listReels`, `upsertReel` (also creates the reel's `radar_links` row), `claimRadarCommentDm` (RPC), `finishRadarCommentDm`, `listRadarCommentDms`, `isRadarOriginCandidate`. |
| `lib/meta/process-webhook-event.ts` (D) | Comment branch calls `maybeAutoSendRadarDm(comment)`; message branch calls `handleRadarThreadInbound`. Neither throws. |
| `lib/supabase/ig-comments.ts`, `lib/dm-leads/delivery-status.ts`, `lib/dm-leads/send-gate.ts`, `lib/supabase/dm-leads.ts`, `lib/supabase/dm-campaigns.ts`, `components/admin/{MissedCommentsCard,IgCommentReplyRow,DmLeadPublicReplyBar}.tsx`, `app/admin/ig-comments/**`, `app/admin/dm-leads/**` (D) | Radar branches and fencing (sections 5.5 and 5.6). |
| `app/api/cron/radar-reel-insights/route.ts`, `vercel.json` (crons entry only) (D) | Daily insights snapshot. |
| `lib/supabase/radar-guide-admin.ts` (E) | Chapter CRUD, links CRUD, funnel, insights and requests reads (user client). |

**Caching strategy.** The field page is already dynamic: the root layout reads cookies and the page awaits `searchParams.from`. Its real cache is the `unstable_cache` data cache: 300s, tag `published-radar-fields`, key v7. Nothing utm-related reaches the server; attribution is read from `window.location.search` in `useRadarVisit`, and the hash never reaches the server. Do not add new `searchParams` reads.

Admin chapter publish and unpublish, and link edits, call `revalidateTag('published-radar-fields', { expire: 0 })`; reel mapping calls `revalidateTag('radar-reels', { expire: 0 })`.

---

## 5. Instagram "radar" campaign (Unit D)

### 5.1 Matching (`lib/meta/comment-intent.ts`)

```ts
const LATIN_RADAR = /(?:^|[^a-z])radar(?![a-z])/i;
const THAI_RADAR = /เรดด?[่้]?า/;   // เรดาร์ เรด้าร์ เรดาห์ เรดดาร์; never bare "เรด"
export function isRadarRequest(t) { return !!t && (LATIN_RADAR.test(t) || THAI_RADAR.test(t)); }
// Only counts on a mapped Radar reel (checked by the caller).
const LINK_REQUEST = /ขอ\s*ลิ[ง้]?ก์|ส่ง\s*ลิ[ง้]?ก์|อยากได้\s*ลิ[ง้]?ก์|ขอ\s*ข้อมูล|ขอ\s*radar|link\s*(?:please|pls)|ขอ\s*link/i;
export function isRadarLinkRequest(t) { return !!t && LINK_REQUEST.test(t); }
export type CampaignKey = "radar" | "shift" | "uni" | "port";
export const CAMPAIGN_KEYS: CampaignKey[] = ["radar", "shift", "uni", "port"];
// getCampaign: radar > shift > uni > port (newest first). isCampaignRequest includes radar.
```

Every `switch` on `CampaignKey` becomes exhaustive (`never` check), so the compiler finds every place that needs a radar branch.

### 5.2 Resolution (`lib/radar-guide/comment-target.ts`, server-only)

`resolveCommentTarget({text, mediaId}, getReel) -> CommentTarget | null`
- Keyword present: look up `radar_reels` by `('instagram', mediaId)`. Mapped gives the reel's slug and chapter; unmapped or `mediaId` `""` gives `fieldSlug: null` (hub). `matchedBy: 'keyword'`.
- No keyword, but the reel is mapped with `dm_enabled` and `isRadarLinkRequest(text)`: same target, `matchedBy: 'request_phrase'`.
- No keyword, mapped reel, and the text contains ขอ, ลิงก์, link or อยากได้: `matchedBy: null, needsReview: true` (admin queue only).
- Otherwise: return `getCampaign(text)` unchanged for other campaigns, or null.

### 5.3 Link and copy (`lib/radar-guide/dm-copy.ts`)

**Link.** `upsertReel` creates one `radar_links` row per mapped reel with code `<alias>-<chapter?>-<4 random [a-z0-9]>` (for example `cyber-money-k3f9`, at most 32 chars), `utm_source=ig-comment-dm`, `utm_medium=dm`, `utm_content = radarUtmContent({slug, kind, shortcode})` (`<slug|hub>-<kind>-<shortcode|x>`). The DM carries `https://passionseed.org/r/<code>`. Long raw links in DMs read as phishing and get no preview (`lib/content/tips-files.ts`). Hub reels and unmapped posts use a shared `hub-ig` row.

**DM copy.** Fixed, at most 1000 chars, no em dashes, no names, never passed to Qwen. `{label}` is `reel.career_label_th` (required when a reel is mapped to a career).

```
นี่คือลิงก์ Career Radar สาย {label} ที่ขอไว้
{url}

ข้างในมีเงินเดือนจริงในไทย AI จะกระทบงานนี้แค่ไหน และวิธีเริ่มลองได้ตั้งแต่สัปดาห์นี้

อยากให้ทำอาชีพไหนต่อ คอมเมนต์ชื่ออาชีพไว้ใต้คลิปได้เลย
กดติดตาม @passion_seed.th ไว้ จะได้ไม่พลาดอาชีพถัดไป
```
Hub variant:
```
นี่คือลิงก์ Career Radar รวมทุกอาชีพที่เราทำไว้
{url}

เลือกอาชีพที่อยากรู้ แล้วดูเงินเดือนจริงในไทย AI จะกระทบแค่ไหน และวิธีเริ่มลอง

อยากให้ทำอาชีพไหนต่อ คอมเมนต์ชื่ออาชีพไว้ใต้คลิปได้เลย
กดติดตาม @passion_seed.th ไว้ จะได้ไม่พลาดอาชีพถัดไป
```
The follow line is a suggestion after the link is delivered, never a condition.

**Public reply.** One per claimed comment, sent after the DM attempt regardless of what Graph reports, starting with `@username ` (as `lib/dm-leads/shift-comment-copy.ts` does). Variant by `hash(comment id) % 3`:
1. `ส่งลิงก์ไปใน DM แล้ว ถ้าไม่เจอ ลองดูในคำขอข้อความ หรือกดลิงก์ในไบโอได้เลย`
2. `ส่งให้ทาง DM แล้ว ไม่เห็นลองเช็กกล่องคำขอข้อความ หรือไปที่ลิงก์ในไบโอ`
3. `ลิงก์อยู่ใน DM แล้ว หรือกดจากลิงก์ในไบโอก็ได้`

Public replies are capped at 30 per rolling hour (count `radar_comment_dms.public_reply` in the last hour); over the cap the reply is skipped and the DM still goes out.

### 5.4 Auto-send (`lib/radar-guide/comment-dm.ts`, `maybeAutoSendRadarDm(comment)`)

Returns `{status, reason}` and never throws. Sends only when all of these pass:
- `process.env.RADAR_COMMENT_DM_AUTO === "on"`
- `resolveCommentTarget` gives `matchedBy` `keyword` or `request_phrase`
- for `request_phrase`, the reel is mapped and `dm_enabled`; for `keyword`, an unmapped post is allowed (hub link) but a mapped reel with `dm_enabled=false` is skipped
- the handle is not excluded (`isExcludedFromAutoReply` in `lib/meta/reply-exclusions.ts`)
- `commented_at` is within 7 days

**Claim:** `rpc('claim_radar_comment_dm', { p_comment_id: comment.id, p_mode: 'auto', p_matched_by, p_reel_id, p_field_slug })`. A null result means skip.

**Send:**
1. `privateReplyToComment(comment.ig_comment_id, message)` (Meta's text id, `graph.ts:484`), then update the log to `sent` with `message`, `link` and `sent_at`. On error: `failed` with `error_code`, and `UPDATE ig_comments SET replied_at = NULL` so the admin queue can retry (the claim function lets a `failed` row be reclaimed).
2. Then the public reply in its own try block, stored in `public_reply`.

The webhook comment branch (`process-webhook-event.ts`, around line 212) runs `const dm = await maybeAutoSendRadarDm(comment)` after classification and returns `metadata: { radar_dm: dm.status }`.

**Quick-reply variant (flag `RADAR_DM_QUICK_REPLY=on`, off by default).** The private reply carries one quick-reply button, "ส่งลิงก์ให้เลย", instead of the link. The tap arrives as `message.quick_reply` with payload `radar:<radar_comment_dms.id>`; the handler sets `dm_tap_at` and sends the link once with `sendMetaMessage` (fixed template). This opens a normal thread out of Message Requests and separates "never saw the DM" from "saw it and didn't click". Before turning it on, verify with a test comment that a private reply (`recipient.comment_id`) accepts `quick_replies`; if it does not, leave the flag off. Rule: one fixed automated reply per user tap, never a chat invite.

### 5.5 Admin and shared-copy changes

- `lib/dm-leads/delivery-status.ts`: `getDefaultCommentDmMessage` and `getDefaultPublicCommentReply` become exhaustive switches with a radar branch that returns the fixed Radar template and public reply. Today they fall through to copy that asks the student to "กดทัก DM พี่" (line 71), which is not allowed for Radar.
- `app/admin/ig-comments/actions.ts` `runBulkReply` (lines 207-313): radar comments always use the radar builder and the claim RPC, ignoring `customDm`, `customPublic` and `getPersonalizedDmMessage`, including on the "all" tab.
- `lib/supabase/ig-comments.ts` `getCommentsMissedByDm`: radar comments are excluded from the generic missed-DM queue; they have their own Radar tab.
- `components/admin/DmLeadPublicReplyBar.tsx`, `MissedCommentsCard.tsx`, `IgCommentReplyRow.tsx`: the Radar tab and label. Rows show the resolved career (computed on the server with `resolveCommentTarget`, passed as props) and the `radar_comment_dms` status (sent, failed, skipped). `needsReview` comments show a one-click "ส่งลิงก์ Radar" that uses the same builder with `matched_by='admin'`.
- New server action `sendRadarDm(commentId)` (`requireAdmin`, `mode 'admin'`, `sent_by`).

### 5.6 Radar-origin DM threads (safeguarding)

Students reply to the Radar DM ("ขอบคุณค่ะ", questions). Inbound messages go through `recordInboundMessage` into `dm_conversations`, which the sales tooling works one-to-one (`lib/dm-leads/playbook.ts`, `scoring.ts`, `thread-advisor.ts`, `app/admin/dm-leads/copilot`, DM campaigns). A minor who typed RADAR must not become a sales lead.

- **Tagging.** In `recordInboundMessage`, when a conversation is **created** and the sender's `platform_user_id` matches `ig_comments.ig_user_id` (fallback: `username`) of a `radar_comment_dms` row with status `sent` in the last 30 days, set `origin='radar'`. Existing conversations keep their origin. Verify on the day-0 end-to-end test that the comment's `from.id` equals the messaging sender id for our app; if it does not, match on username only.
- **One fixed reply.** `handleRadarThreadInbound`: on the first inbound message of a `radar` thread with `radar_reply_sent_at IS NULL`, send once: "ขอบคุณที่ทักมานะ ถ้ามีคำถาม คอมเมนต์ไว้ใต้คลิปได้เลย ทีมเราตอบในคอมเมนต์" and set `radar_reply_sent_at`. Nothing else is sent automatically.
- **Fencing.** `send-gate.ts` gains `GateReason "radar_origin"`: any draft to a `radar` thread is `block` unless it is one of the fixed Radar templates. `getConversationsForAdmin` excludes radar threads from lead buckets and scoring; they show under a separate read-only "Radar" filter. `dm-campaigns.ts` excludes radar threads from every broadcast. Copilot, thread-advisor and personalize skip them.
- Tests: a radar-origin thread never enters a lead bucket, is excluded from campaign recipients, and the gate blocks a free-text draft to it.

### 5.7 Reel insights (cron)

`app/api/cron/radar-reel-insights/route.ts`, daily, secured like `app/api/cron/meta-backfill/route.ts`, with a `vercel.json` crons entry. For each Instagram reel posted in the last 30 days, call Graph `/{media-id}/insights` (views, reach, saved, shares, comments, likes, `ig_reels_avg_watch_time`, plus follows and profile visits where the API returns them) and upsert `radar_reel_insights (reel_id, captured_on)`. Store unknown metrics in `raw`. Missing permissions or metrics are logged and skipped, never fatal.

### 5.8 Operational preconditions (day 0, blocking the first post)

1. In Meta Business Suite, confirm no keyword automation catches RADAR or เรดาร์ (only one private reply per comment is allowed).
2. Turn `RADAR_COMMENT_DM_AUTO=on` in production and run one test comment end to end from a second account: DM received, public reply posted, `/r` link opens the right chapter, visit row tagged `ig-comment-dm`, a reply to the DM gets the fixed thread reply and lands in the Radar filter only.
3. No reel posts until step 2 passes. The admin queue is only the retry path for `failed` rows and the review path for `needsReview` comments.

---

## 6. Admin (Unit E)

Phase 1a needs only items 1 (script editing and status), 2 and 3. Items 4 and 5 are Phase 2; until then admins query the views in Supabase.

1. **Chapters panel.** `components/admin/radar/RadarGuideChapters.tsx` under `RadarDraftEditor` in `app/admin/radar/[fieldId]/page.tsx`. API: `app/api/admin/radar/fields/[fieldId]/chapters/route.ts` (GET list, PUT upsert one chapter with `requireAdmin` and zod `ChapterUpsert`). The panel:
   - shows 7 rows from `GUIDE_CHAPTERS`; a row is created lazily on first save, with `title_th` from the def
   - edits the structured script (hook, beats with say, on-screen, visual, broll, claims, then cta and the `reel` block) and runs `lintChapterScript` live, showing errors, estimated length and claims grouped by grade
   - previews the video and poster with B2's `CaptionOverlay` read-only (Phase 1b)
   - has a VTT editor with live preview, and a "facts checked" button setting `facts_checked_at` and `facts_checked_by`
   - moves status draft → approved → recorded (set by the clip script) → published → archived. Publish is blocked unless lint passes and the DB constraint fields are present. Publish and unpublish call `revalidateTag('published-radar-fields', { expire: 0 })`.
   - shows "อัปโหลดด้วย `pnpm radar:clip <slug> <chapter> <file>`" with a copy button; clips are not uploaded in the browser.
2. **Teleprompter.** `app/admin/radar/[fieldId]/teleprompter/page.tsx?chapter=<key>`, client `components/admin/radar/RadarTeleprompter.tsx`: full-screen dark view (admin only), Kodchasan 56px on tablet and 40px on phone; hook largest; `say_th` in white, `on_screen_th` and visual cues dimmed in brackets; mirror toggle, auto-scroll speed, space to pause, arrows between chapters; `?all=1` for a printable list. Works from draft and approved rows, and offers the 3 hook variants as alternate takes.
3. **Reels and links.** `app/admin/radar/reels/page.tsx`, with `components/admin/radar/RadarReelMapper.tsx` and `RadarLinksEditor.tsx`. APIs: `app/api/admin/radar/reels/route.ts`, `app/api/admin/radar/links/route.ts`.
   - Lists recent IG media through `listInstagramMedia(igUserId, { maxPages: 2 })` (caption, permalink, shortcode, timestamp). Each row: published slug or hub, chapter, kind, angle, trial flag and hook variant, `dm_enabled`, and **required** short label (for example "ไซเบอร์"). Saves through `upsertReel`, which also creates the reel's short link and shows it with a copy button.
   - TikTok and YouTube rows are added manually by permalink.
   - Per reel (Phase 2 for the numbers): keyword commenters, DMs sent and failed, visits from the funnel where `utm_content` matches, and insights.
   - **Career-name comments (Phase 2).** Non-keyword comments on Radar reels are grouped as candidate career requests with a one-click tally into `radar_career_requests` (`source='ig_comment'`, text only, no handle, no session).
   - The links editor manages codes, destinations, chapters and utm values; `tt` and `ig` stay pointed at the hub.
4. **Funnel tab (Phase 2)** on `app/admin/radar/page.tsx`, with `components/admin/radar/RadarGuideFunnel.tsx`: filters for week range and page; a table by channel × page (visits, unique devices, chapters seen per visit, plays, unmute %, complete %, interactive %, CTA, follow intent, share, intents, requests); a per-reel table joining `utm_content` with `radar_reel_insights` (reach, keyword commenters per 1k reach, sends plus saves per reach, DM → visit). It reads views and the insights table only. It also shows link clicks against visits per code, to measure drop-off in the in-app browser.
5. **Career requests (Phase 2).** `components/admin/radar/RadarCareerRequests.tsx`: counts by `lower(request_text)`, status and `matched_field_slug`, raw rows. Admin-only, never public.

---

## 7. Content production system (Unit F)

### 7.1 Script format

Scripts live in `docs/radar-guide/scripts/<slug>.json` (public, reviewed in a PR). Fact sheets with grades go to `docs/radar-guide/factsheets/<slug>.md`.

```json
{
  "slug": "cybersecurity", "version": 1, "as_of": "2026-11-11",
  "chapters": [{
    "key": "money",
    "title_th": "เงินเดือนจริงในไทย",
    "duration_target_s": 30,
    "hook": { "say_th": "จบใหม่สายไซเบอร์ เริ่มเดือนละเท่าไหร่", "on_screen_th": "เริ่มที่เท่าไหร่?" },
    "beats": [{
      "say_th": "จบใหม่ เริ่มราว 25,000 ถึง 35,000 บาท",
      "on_screen_th": "25k-35k บาท/เดือน (JobsDB ก.ค. 2569)",
      "visual": "card:salaryProgression",
      "broll": "salary ladder, step 1",
      "safety": false,
      "claims": [{ "text": "Junior/Entry-level security 25k-35k THB/month", "source_ref": 2,
                   "url": "https://th.jobsdb.com/career-advice/role/security-engineer/salary",
                   "grade": "A", "level": "entry", "as_of": "2026-07" }]
    }],
    "cta_th": "ดูขั้นบันไดเงินเดือนเต็มได้ในลิงก์",
    "reel": {
      "angle": "salary_reveal",
      "hook_variants_th": ["จบใหม่สายไซเบอร์ เริ่มเดือนละเท่าไหร่", "สายไซเบอร์ เงินเดือนแรกได้จริงเท่าไร", "แฮกเกอร์สายขาว เงินเดือนเริ่มต้นเท่าไร"],
      "send_to_friend_th": "ส่งให้เพื่อนที่ชอบคอมแต่ยังไม่รู้จะเข้าคณะไหน",
      "end_card": "comment_radar",
      "pinned_comment_th": "คอมเมนต์ RADAR รับลิงก์ข้อมูลเต็มทาง DM",
      "tiktok_alias": "cyber"
    }
  }]
}
```

The salary figure is the junior level from the cyber `salaryProgression` card (sources 2 and 4, JobsDB July 2026), not an average. The spoken line carries the number only; source and date go on screen. The DB column `radar_guide_chapters.script` holds one chapter object.

`lintChapterScript` runs in admin, in the push script and in jest over every file. It checks:
- No em dash (U+2014) or en dash (U+2013) in any `*_th` (use `findDashes`).
- Every beat whose `say_th` or `on_screen_th` contains a number by `containsNumber` (Arabic digits, Thai digits, spelled numbers) has at least one claim graded A or B. Grades C and X fail.
- When the hook mentions จบใหม่ or เริ่ม, every money claim in the chapter has `level: "entry"`.
- No claim cites `grad_employment_pct`, `job_access` or `ai_risk_score` unless the line includes "ทีมเราประเมิน".
- Estimated length (Thai characters in `say_th` divided by 13 per second) stays within 15-35s; the hook is at most 40 characters.
- `reel.hook_variants_th` has exactly 3 entries, each at most 40 characters; `reel.send_to_friend_th` is present.
- For `slug=cybersecurity`, the `start` chapter and any beat containing แฮก, hack or เจาะ include a beat with `safety: true` whose `say_th` contains "ระบบที่ได้รับอนุญาต". Suggested line: "ฝึกเฉพาะในแล็บที่ได้รับอนุญาต เช่น TryHackMe ห้ามลองกับระบบที่ไม่ได้รับอนุญาตเด็ดขาด".
- The `start` chapter's first recommended action is free, takes under 2 hours and ends with something the student made (for example TryHackMe "Pre Security" first room for cyber, Kaggle Titanic for data science). Certificates go last. The same rule is checked against the field's start options in `radar:dump` (warning) and must hold before a `start` chapter is recorded.
- Script generation reads `content_th` only, never `content_en`.

**Card content lint.** `radar:dump` fails when `findDashes` hits any `content_th`, `tagline_th` or `name_th`, and a jest test runs the same check over the `__fixtures__` copies of the four careers. The admin card editor save path shows the same warning.

**Reels from chapters.** Reels are planned per angle, not per chapter. A chapter can feed several reels (main plus Trial Reels with the other hook variants) or none. Caption templates live in `docs/radar-guide/README.md`:
- IG: first line `{hook stat}`, then "อยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM", then `{send_to_friend_th}`, then hashtags. No follow ask.
- TikTok: "ข้อมูลเต็ม พิมพ์ passionseed.org/r/{tiktok_alias}".

Every career also gets one motion reel "อาชีพนี้ใน 30 วินาที" (hook stat, salary ladder, AI score, first start step), which needs no founder time.

### 7.2 Commands

Each command is a `package.json` script `dotenv -e .env.local -o -- tsx scripts/radar-guide/<x>.ts` and exits with a clear error when a required env var is missing.

| Command | Does |
|---|---|
| `pnpm radar:dump <slug>` | Reads a published field, its cards, sources and skills with the anon client, writes `.cache/radar-guide/<slug>.json` (`.cache/` gitignored), and fails on dashes in card copy (7.1). |
| `pnpm radar:scripts:draft <slug>` | Builds a draft 7-chapter script from the dump: hooks from the hook card, beats from each chapter's `content_th` fields, claims from `source_refs` with grades looked up in the fact sheet (ungraded claims marked `X` so lint forces review), 3 hook variants per chapter from templates. Writes `docs/radar-guide/scripts/<slug>.json` only if absent (`--force` to overwrite) and prints lint results. The founder edits; nothing is pushed automatically. |
| `pnpm radar:scripts:push <slug>` | Validates and upserts chapters as `draft` with the service role. Never overwrites a row whose status is not draft. |
| `pnpm radar:scripts:pull <slug>` | Exports DB scripts back to the JSON file so admin edits can be committed. |
| `pnpm radar:clip <slug> <chapter> <input.mov>` | ffprobe; tone-map when `color_transfer=arib-std-b67` (HLG); web transcode 540x960, about 1.2 Mbps, faststart, loudnorm; webp poster under 60KB; `whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo-q5_0.bin -l th -ovtt` for timings; `alignScriptToCues(beats.say_th, whisperCues)` keeps whisper's times and our text; VTT; sha8; B2 PutObject with immutable cache; upsert the row (`video_url`, `poster_url`, `captions_vtt`, `duration_s`, `recorded_at`, `status='recorded'`). It also writes to `~/Movies/radar-guide/<slug>/` the clean 1080x1920 master, the `.vtt`, and a cut list (`<chapter>.cuts.json`: beats with in/out times, on-screen text, hook variants) for the Dusk City edit. It does not burn captions. |
| `pnpm radar:reel <slug> [--chapter key] [--platform ig\|tt]` | Motion reel, copying `scripts/render-shift-testimonial.mjs`: Playwright (resolution chain as in `scripts/render-poster.mjs:41-53`), opens `/studio/radar-reel/<slug>` on the studio server (`scripts/studio-server.sh`, :3010), injects `window.__RADAR_REEL__` from the dump with `addInitScript`, seeks every frame through `window.__seekReel`, pipes frames to ffmpeg, adds audio through `scripts/shift-reel-audio.py`, loudnorm and faststart. Output to `~/Movies/radar-guide/<slug>/`. IG and TikTok masters differ only in the end card. |
| `pnpm radar:cover <slug> <scene>` | Runs `agy -p "Use generate_image once with ImageName '<slug>-<scene>' and Prompt '<prompt>, no text, no watermark'. Reply only with the saved path." --output-format stream-json --print-timeout 180s` (never with any flag that skips agy's permission prompts), parses "saved at", uploads the 1024² PNG to `radar/art/...` on B2, records the URL in `docs/radar-guide/art.json`. Check output against `skills/key-art-poster/SKILL.md`; never generate "real people" next to career claims. |

**Motion route.** `app/studio/radar-reel/[slug]/page.tsx` (the static `radar-reel` segment wins over `app/studio/[set]`), following `app/studio/[set]/page.tsx`: `robots: noindex`, `notFound()` when `process.env.VERCEL_ENV === "production"`, data **only** from `window.__RADAR_REEL__`, "render only" when absent, no Supabase call (so CI builds with placeholder env pass).

Scenes live in `components/radar/reel/`: `RadarReel.tsx`, `radarReel.ts` (pure timeline with a test), and `scenes/{HookStat,FantasyReality,SalaryLadder,AiScore,DayInLife,StartStep,EndCard,Cover,Compare}.tsx`. They import `reelEngine` from `components/shift/poster/testimonial/reelEngine.ts` and `useRenderMode` from `components/shift/poster/testimonial/reelParts.tsx`, read-only. Motion reels use the Dusk City palette and signature elements (Kanit, plum strip, series tag "CAREER RADAR", keyword in lit-window dot type) from `company-brain/reels-style.md`. `RadarCardView` is not used as a frame source.

**What is stored where.**
- Repo (public): scripts, fact sheets with source URLs and grades, art index URLs, pipeline code.
- DB: chapter scripts once pushed (source of truth afterwards), VTT text, video URLs.
- B2: web clips, posters, art.
- Founder's machine or Drive only: raw footage, clean masters, Dusk City edits. Never `.env`, never student data; IG comment text never goes in the repo.

### 7.3 Cost tiers for career #5 onwards

| Tier | Gets | Founder time |
|---|---|---|
| Deck | Research, interactive deck, auto-drafted scripts (for captions and motion), "อาชีพนี้ใน 30 วินาที" motion reel | 0 |
| Demand | Deck tier plus founder clips for `money` and `start` only | about 20 minutes recording |
| Full | All 7 chapters with founder clips | about 1 hour |

A career moves up a tier only on demand (career requests, keyword comments per 1k reach). Research for a new career is a named step: the `pathlab-research` skill's research method, saved through the admin draft editor (`RadarDraftEditor`) into `radar_fields.research`, cards and sources. The non-tech career in the pilot (section 9) measures its real cost.

---

## 8. Work breakdown

### 8.0 Phases

| Phase | Ships | Gate |
|---|---|---|
| **1a** (days 1-3) | Foundation; C; D (including 5.5, 5.6, quick-reply code behind its flag); B1 and the B2 non-video parts (eyebrow, chapter sheet, sources sheet, mid-share, outro, request form, share, follow); E items 1 (scripts and status), 2 and 3; F `radar:dump`, `scripts:draft`, `scripts:push`, `scripts:pull` and the scripts for recording session 1 | Before the first reel posts |
| **1b** (days 5-9) | B2 video player and captions; F `radar:clip`; D reel insights cron; E chapter video preview | Before founder clips appear on the page |
| **2** (after day 14, or earlier if time allows) | E funnel tab and career requests; career-name comment tally; F `radar:reel` and `radar:cover`; hub "อาชีพต่อไป" vote and "เทียบ 2 อาชีพ" view | Driven by day-14 results |

Foundation runs first (one engineer, about half a day, merged before others open PRs). It owns:
- the four migrations in 3.1-3.4
- `lib/supabase/database.types.ts`, regenerated after `supabase db push`
- `lib/radar-guide/{types,chapters,utm,career-request,thai-copy,script-schema}.ts`
- `lib/radar-guide/__tests__/{chapters,utm,career-request,thai-copy,script-schema}.test.ts`
- `lib/radar-guide/__fixtures__/` (copies of the four career dumps)

Until types are regenerated, other units use `types.ts` row types and `.rpc()` calls with casts.

### 8.1 Shared types (`lib/radar-guide/types.ts`)

```ts
export const GUIDE_CHAPTER_KEYS = ["hook","reality","money","ai","day","study","start"] as const;
export type GuideChapterKey = (typeof GUIDE_CHAPTER_KEYS)[number];
export interface GuideChapterDef { key: GuideChapterKey; index: number; titleTh: string; navLabelTh: string;
  cardKinds: string[]; targetSeconds: [number, number]; summaryTh: string[] }
export interface RadarGuideChapterPublic { id: string; chapterKey: GuideChapterKey; position: number;
  titleTh: string; hookTh: string | null; videoUrl: string; posterUrl: string; captionsVtt: string;
  durationS: number; transcriptTh: string[] }
interface SectionBase { index: number }
export type GuideSection = SectionBase & (
  | { type: "chapterVideo"; chapterKey: GuideChapterKey; chapter: RadarGuideChapterPublic; isFirstInChapter: true }
  | { type: "card"; chapterKey: GuideChapterKey | "sources"; card: RadarCardRow; isFirstInChapter: boolean;
      replayVideo?: RadarGuideChapterPublic }
  | { type: "skills"; chapterKey: "start"; isFirstInChapter: boolean; replayVideo?: RadarGuideChapterPublic }
  | { type: "midShare" }
  | { type: "outro" });
export type GuideEventType = "chapter_view"|"video_play"|"video_unmute"|"video_progress"|"video_complete"
  |"interactive_tap"|"cta_click"|"follow_click"|"share_click";
export interface GuideEventInput { type: GuideEventType; chapterKey?: GuideChapterKey; cardId?: string;
  target?: string; valueInt?: number; metadata?: Record<string, string | number | boolean> }
export type CareerRequestResult = "ok" | "invalid" | "rate_limited" | "failed";
export interface GuideTracker { visitId: string | null; track(e: GuideEventInput): void;
  submitCareerRequest(text: string): Promise<CareerRequestResult> }
export type UaApp = "instagram" | "tiktok" | "line" | "facebook" | "other";
export interface RadarAttribution { utm_source: string|null; utm_medium: string|null; utm_campaign: string|null;
  utm_content: string|null; referrer_host: string|null; ua_app: UaApp|null }
export interface RadarVisitContext { visitId: string; attribution: RadarAttribution }
export type RadarVideoKind = "founder" | "motion";
export type RadarReelAngle = "salary_reveal"|"myth_busted"|"ai_replace"|"portfolio_for_this_career"
  |"which_faculty"|"compare"|"day_in_life"|"overview";
export interface RadarReel { id: string; platform: "instagram"|"tiktok"|"youtube"; mediaId: string|null;
  shortcode: string|null; fieldSlug: string|null; chapterKey: GuideChapterKey|null; videoKind: RadarVideoKind;
  angle: RadarReelAngle|null; isTrial: boolean; careerLabelTh: string|null; dmEnabled: boolean }
export interface RadarLink { code: string; fieldSlug: string|null; chapterKey: GuideChapterKey|null;
  utm: { source: string; medium: string; campaign: string; content: string|null }; isActive: boolean }
export type RadarMatchedBy = "keyword" | "request_phrase" | "admin";
export interface CommentTarget { campaign: "radar"|"shift"|"uni"|"port"; fieldSlug: string|null;
  chapterKey: GuideChapterKey|null; reel: RadarReel|null; matchedBy: RadarMatchedBy|null; needsReview?: boolean }
// RPC names (contract):
// record_radar_visit(p_session_id,p_visit_id,p_field_slug,p_attr)
// record_radar_guide_event(p_session_id,p_visit_id,p_event_type,p_field_slug,p_chapter_key,p_card_id,p_target,p_value_int,p_metadata)
// submit_radar_career_request(p_session_id,p_visit_id,p_text,p_from_field_slug)
// claim_radar_comment_dm(p_comment_id,p_mode,p_matched_by,p_reel_id,p_field_slug,p_sent_by)  -- service role only
```
`utm.ts` exports:
- `RADAR_SOURCES = { "ig-comment-dm":"dm", "ig-comment-public":"comment", "ig-bio":"bio", "ig-story":"story", "tiktok-bio":"bio", "tiktok-alias":"alias", "yt-bio":"bio", "share":"share", "line":"social", "shortlink":"unknown" }`
- `buildRadarUrl({ slug|null, utm, hash?, origin = "https://passionseed.org" })`
- `radarUtmContent({ slug|null, kind, shortcode|null })` → `<slug|hub>-<kind>-<shortcode|x>`, sanitized
- `sanitizeUtmToken(v, caseSensitive?)`
- `radarChannel({ utmSource, referrerHost, uaApp })`

### 8.2 Parallel units (disjoint file ownership)

| Unit | Owns (exclusive) | Consumes |
|---|---|---|
| **B1 Guide deck** | `app/radar/[slug]/page.tsx`, `app/radar/[slug]/opengraph-image.tsx`, `app/radar/[slug]/opengraph-image.alt.txt`, `lib/radar/server.ts`, `lib/radar/__tests__/cache-preview.test.ts`, `lib/radar-guide/sections.ts` + `__tests__/sections.test.ts`, `components/radar/RadarFieldPageClient.tsx`, `components/radar/RadarCards.tsx`, `components/radar/RadarSkillExperience.tsx`, `components/radar/RadarPageClient.tsx`, `components/radar/OglTrendBackground.tsx`, `lib/radar/card-visuals.ts`, `lib/content/radar-cta.ts`, `components/map/MapCard.tsx` (font only), `app/globals.css` (League Gothic import only), `components/radar/__tests__/{RadarFieldPageClient.stability,RadarCtaCard,RadarFieldIntentWiring}.test.tsx` | B2 components (by props), C `useRadarVisit`, Foundation |
| **B2 Guide components** | `components/radar/guide/**` (ChapterVideoSection, ChapterVideo, CaptionOverlay, ChapterEyebrow, ChapterSheet, SourcesSheet, TranscriptSheet, MidShareCard, GuideOutro, CareerRequestForm, ShareButtons, FollowButton, usePlaybackManager.ts, guide.css), `lib/radar-guide/vtt.ts` + test, `lib/radar-guide/social.ts`, `components/radar/guide/__tests__/**` | Foundation. Takes `tracker: GuideTracker`; no Supabase imports. |
| **C Attribution, events, short links, hub** | `lib/radar-guide/attribution.ts` + test, `lib/radar-guide/use-radar-visit.ts`, `lib/radar-guide/events.ts`, `lib/radar-guide/short-links.ts` + test, `lib/supabase/radar.ts`, `lib/radar/recent-reels.ts`, `app/r/[code]/route.ts` + `route.test.ts`, `proxy.ts`, `utils/supabase/proxy.ts`, `app/radar/page.tsx`, `components/radar/RadarLandingBeacon.tsx`, `components/radar/RecentReelsStrip.tsx` | Foundation |
| **D IG campaign and DM safety** | `lib/meta/comment-intent.ts` + `comment-intent.test.ts`, `lib/meta/graph.ts`, `lib/meta/process-webhook-event.ts`, `lib/radar-guide/{comment-target,dm-copy,comment-dm,dm-thread}.ts` + tests, `lib/supabase/radar-reels.ts`, `lib/supabase/ig-comments.ts`, `lib/supabase/dm-leads.ts`, `lib/supabase/dm-campaigns.ts`, `lib/dm-leads/**`, `components/admin/{MissedCommentsCard,IgCommentReplyRow,DmLeadPublicReplyBar}.tsx`, `app/admin/ig-comments/**`, `app/admin/dm-leads/**` (filtering only), `app/api/cron/radar-reel-insights/route.ts`, `vercel.json` (crons entry only) | Foundation |
| **E Admin** | `app/admin/radar/page.tsx`, `app/admin/radar/[fieldId]/page.tsx`, `app/admin/radar/[fieldId]/teleprompter/**`, `app/admin/radar/reels/**`, `components/admin/radar/{RadarGuideChapters,RadarTeleprompter,RadarReelMapper,RadarLinksEditor,RadarGuideFunnel,RadarCareerRequests}.tsx`, `app/api/admin/radar/fields/[fieldId]/chapters/route.ts`, `app/api/admin/radar/reels/route.ts`, `app/api/admin/radar/links/route.ts`, `lib/supabase/radar-guide-admin.ts` | Foundation, D `radar-reels.ts` and `listInstagramMedia` (import only), B2 `CaptionOverlay` (import only) |
| **F Content and pipeline** | `scripts/radar-guide/**`, `lib/radar-guide/caption-align.ts` + test, `app/studio/radar-reel/[slug]/page.tsx`, `components/radar/reel/**` + `radarReel.test.ts`, `docs/radar-guide/**`, `docs/features/radar-guide.md`, `lib/radar-guide/__tests__/scripts-lint.test.ts`, `lib/radar-guide/__tests__/card-copy.test.ts`, `package.json` (scripts entries only), `.gitignore` (`.cache/`) | Foundation |

Interface rules:
- B1 owns every import edge into the field page. B2 and C never edit B1's files.
- If B1 lands before C, it uses a no-op tracker stub (`visitId: null`).
- Stray IG links (`app/layout.tsx:225` JSON-LD `sameAs`, `lib/content/home.ts:64`, `components/plans/StudentPlanPageView.tsx:296`) are fixed in a separate small PR after the in-progress home-page work on `lib/content/home.ts` lands, to avoid conflicts.

### 8.3 Test plan (Jest, pure logic, alongside each unit)

- **Foundation:**
  - `chapterForCard` covers every kind, including realPeople → `day`, reflection and startCarousel → excluded, an unknown text card inheriting the previous chapter.
  - `buildRadarUrl`: param order and encoding, the hash, no username fields.
  - `radarUtmContent` and `sanitizeUtmToken` reject spaces, Thai text, overly long values and a leading `-`.
  - `radarChannel` matches the SQL on a shared fixture table.
  - `validateCareerRequest`: rejects `https://x.com`, `www.a.th`, `@someone`, `a@b.co`, `081 234 5678`; accepts `เชฟร้านเบอร์เกอร์`, `อินฟลูเอนเซอร์ไอจี`, `ไลน์แมน`, `นักบัญชี`.
  - `containsNumber`: Arabic digits, `๒๕`, `สามหมื่น`, `ครึ่งล้าน`, `50 เปอร์เซ็นต์`, `2 เท่า`.
  - `lintChapterScript` rejects em and en dashes, a number without a claim (including Thai numerals and spelled numbers), grade X, an entry hook with an average claim, a cyber chapter without a safety line, missing hook variants or send-to-friend line, and a script that is too long.
- **B1:**
  - `buildGuideSections`: realPeople before outro on the DS and SE fixtures; video section immediately before the chapter's first card; `arrivedChapter` gets `replayVideo` and no video section; a chapter with video but no cards still renders; `fromPlan` removes outro, CTA and `midShare`; `midShare` follows `money`; sources last; reflection and startCarousel excluded.
  - Stability test with video and `midShare` sections: the AI blackout targets the aiImpact section, `handleReflect` advances one section.
  - CtaCard test: no "100 บาท", no "TechSeed รุ่น 6", no em dash, no "นัดคุยกับรุ่นพี่", and the intent button records interest (update `RadarFieldIntentWiring.test.tsx`).
  - `cache-preview.test.ts` updated for the v7 key and the skills cache.
- **B2:**
  - `parseVtt` handles multi-line cues, `HH:MM:SS.mmm` and `MM:SS.mmm`; bad input returns `[]`. `activeCue(t)`.
  - Playback manager (mocked HTMLMediaElement): one active video; only the first video in a visit autoplays muted; later videos show the play button unless `soundOn`; a rejected unmuted `play()` shows the play button, not muted autoplay; the 700ms dwell.
  - Request form state mapping for invalid and rate-limited results.
  - Share: `navigator.share` not used when `ua_app='instagram'`; copy failure shows the text field.
  - Follow: TikTok visitors get the TikTok link when set, the IG link otherwise.
- **C:**
  - `parseAttribution`: IG UA → `instagram`; `musical_ly` and `BytedanceWebview` → `tiktok`; `Line/` → `line`; FBAN or FBAV → `facebook`. Own-host referrer → null. Invalid utm → null.
  - `stripUtmFromUrl` keeps `from` and the hash.
  - `getOrCreateVisitId` reuses the id within 30 minutes and on reload.
  - `resolveShortLink`: a DB row; alias `cyber-tt` → cybersecurity with `tiktok-bio`; bare `cyber` → `tiktok-alias`; unpublished slug → hub; unknown → hub with `shortlink`.
  - `/r` route test mirroring `app/go/[source]/route.test.ts`: 302, `no-store`, no open redirect with `?to=https://evil`, `after` logging failures swallowed.
- **D:**
  - `isRadarRequest` positives: `RADAR`, `radar!`, `เรดาร์`, `เรด้าร์`, `เรดาห์`, `เรดดาร์`, `ขอ radar ค่ะ`. Negatives: `radars`, `radarscope`, `เรด`, `เรดบูล`, `เรดดิท`, `red`. Precedence: `shift radar` → radar.
  - `isRadarLinkRequest` positives `ขอลิงก์ค่ะ`, `ส่งลิงก์ด้วย`, `ขอข้อมูลหน่อย`; negatives `สวยมาก`, `ขอค่ะ`.
  - `resolveCommentTarget`: mapped, unmapped, `""` media id, request phrase on a mapped reel, request phrase on an unmapped post (null), vague comment → `needsReview`.
  - `dm-copy`: no em dash, contains the short link, at most 1000 chars, hub variant, label required.
  - `maybeAutoSendRadarDm` (mocked Graph and DB): flag off → skip; lost claim → no send; send failure → `failed` and `replied_at` cleared; a failed row can be reclaimed; over 7 days → skip; excluded handle → skip; public reply over the hourly cap → skipped, DM still sent; Graph called with the text `ig_comment_id`.
  - Delivery-status radar branch returns the fixed templates; `runBulkReply` ignores custom copy for radar comments.
  - Radar thread fencing (5.6): tagged on create, fixed reply sent once, excluded from buckets and campaigns, gate blocks free text.
- **E:** zod `ChapterUpsert` refuses publish without the required fields; API routes return 403 without admin, mocked like the existing `draft` route tests; reel upsert refuses a career mapping without a label.
- **F:**
  - `alignScriptToCues`: line count preserved, timings monotonic.
  - `radarReel` timeline duration within target.
  - Lint passes over every `docs/radar-guide/scripts/*.json`.
  - `card-copy.test.ts`: no dashes in any `content_th`, `tagline_th` or `name_th` in `__fixtures__` (fails until the content sweep in section 9 is done and the fixtures are refreshed).

Before each PR: `pnpm lint && pnpm test && pnpm build`. Check the Vercel preview of `/radar/cybersecurity` on an iPhone in the Instagram in-app browser: open a `/r/` link, land on the chapter's first card (not its video), check the hash settles on `#day` and `#start`, check muted autoplay of the first video and the play button on later ones, tap to unmute, captions, utm stripped from the URL, share buttons, and the chapter sheet.

**Merge order:** Foundation (+ `db push`) → C and D → B2 → B1 → E → F (F any time after Foundation).

---

## 9. Pilot plan

### Day 0 (blocking, before any reel posts)

- Meta Business Suite: no keyword automation on RADAR or เรดาร์. Then the end-to-end test in 5.8.
- TikTok account: business account or 1k followers for a bio link? If not, TikTok uses the typeable alias only.
- Confirm the on-camera host. company-brain `marketing.md` lists Angpao as "the face" (2026-10-05). If the founder recording these is someone else, log the decision in company-brain.
- Agree Radar's reel slots against the SHIFT calendar with Angpao, who owns the content plan.
- Confirm the program line (SHIFT, open round) and the TikTok handle in company-brain.

### Content blockers (admin-editor data fixes, before recording)

- Em dash sweep of all four careers: `content_th`, `tagline_th` (software-engineer's has one, and it would reach link previews), `name_th`. About 30 to 45 dashes per career in the dumps. Refresh `__fixtures__` afterwards.
- Update the BLS figures and label them as US figures: cyber 29% → 21% (2025-35); data scientist 34% → 35% and remove "ทั่วโลก"; software engineer 15% → 10%.
- Hide the composite `realPeople` cards on data scientist and software engineer (`is_hidden=true`).
- Replace the ARDURA claims on software engineer with TDRI's Thai data.
- Add the TDRI AI/ML job ads figure (85 → 321) as a source and as the hook for ai-engineer.
- Start options: each career's primary skill has a first start option that is free, under 2 hours and ends with something made; certificates last. Cyber needs this before its `start` chapter is recorded (for example TryHackMe "Pre Security" first room, with the legal-labs line). Data scientist's first option (a 6-month paid certificate) moves to last.

### Timeline

- **Days 1-3:** Phase 1a build. Foundation on day 1, then the parallel units.
- **Day 3:** run `radar:scripts:draft` for all four careers, then write and lint the scripts for recording session 1 (A/B facts only, dates on screen): cyber `money`, `ai`, `start`; ai-engineer, data-scientist and software-engineer `money` and `start` (with the `start` angle framed as "พอร์ตสายนี้ต้องมีอะไร"); one comparison reel "4 สายไอที จบใหม่ได้เดือนละเท่าไร". That is 9 chapter clips plus 1 comparison. Founder approves, `radar:scripts:push`.
- **Day 4:** recording session, about 1 hour, iPhone at 1080p30 with HDR off, teleprompter with 3 hook takes per clip. Clean masters and cut lists go to the Dusk City edit.
- **Days 5-18:** 3 main Radar reels a week plus 4 Trial Reels a week (other hook variants of the same clips), in the slots agreed with Angpao:
  - week 1 main: cyber money, the 4-career comparison, cyber AI; trials: cyber money hooks 2 and 3, comparison hooks 2 and 3
  - week 2 main: the best-performing career's money and start, plus one more; trials from the week-1 winners' angles
  - promote a Trial Reel to followers after about 72 hours only if its sends and saves per reach beat the account average (`marketing.md`)
  - map every reel in `/admin/radar/reels` within 1 hour of posting
  - number the series ("Career Radar EP.x") on the end card, in the DM and on the page; add an IG Highlight "Career Radar" with one story per career
- **Days 5-9:** Phase 1b. Run `radar:clip` for the session-1 clips, fact-check and publish the chapters on the page.
- **Day 7 checkpoint:** if founder chapters show plays and completes, schedule session 2 (cyber `reality`, `day`, `study`, and `ai` for the others). If not, keep the deck-first format and spend the time on hooks.
- **Days 8-12:** one non-tech career at the Deck tier (research, deck, motion reel, no founder video), chosen from career requests and the existing DM interest options (แพทย์, นิเทศ, บริหาร). Record the hours spent; this is the real cost of career #5.

### Two-week metrics

Baseline: 49 views and about 23 unique viewers in 30 days, 13 interest clicks ever; 2,400 IG followers (`numbers.md`, 2026-10-05). Targets are re-based on day 7 data.

| Metric | Target (14 days) | Source |
|---|---|---|
| Reel reach | median reach per main reel at or above the account's recent median; 1,500 plays median is a stretch goal | `radar_reel_insights`, IG insights |
| CTA rate | at least 5 unique keyword commenters per 1,000 reach | `radar_comment_dms` + insights |
| Quality | sends plus saves per reach at or above the account average | insights |
| Unique keyword commenters | at least 100 | `ig_comments`, campaign radar |
| DM → visit | at least 30% (`ig-comment-dm` visits ÷ unique keyword commenters; Graph's "sent" is not delivery) | funnel |
| Tagged visits | at least 250 (`ig-comment-dm` + `ig-bio` + `tiktok-*` + `share`) | funnel |
| Depth | median chapters seen per visit at least 3; at least 40% of visits with at least 1 `interactive_tap` | funnel |
| Video (Phase 1b onward) | at least 50% of visits that reach a video play it; unmute in at least 25% of plays | funnel |
| Follow intent / share | at least 8% `follow_click`, at least 3% `share_click`; IG followers up 200 or more | funnel, IG insights |
| Career requests | at least 40 (page plus tallied comments), giving careers #5-#10 | `radar_career_requests` |
| Intents | at least 25 (about 2× the all-time total) | funnel `intents` |

### Decision rules at day 14

- Low reach: the hook is failing. Use Trial Reels to test 3 new hook styles before recording more.
- Good reach but under 5 keyword commenters per 1k reach: fix the CTA and end card.
- Many commenters but DM → visit under 20%: fix the DM flow (turn on the quick-reply variant if verified; lead the public reply with the bio link and alias).
- Visits arrive but depth is low (under 2 chapters median): move the hook stat and salary ladder higher and shorten chapters.
- Video plays under 30% or unmute under 10%: put interactive cards ahead of video in each chapter and cut clips to 15-20s.
- Targets met: start careers #5-#10 from the top requests at the Deck tier, promoting to Demand tier on evidence.

### Open decisions for the founder

1. Who is on camera (company-brain says Angpao). Blocks day 4.
2. The paid program line on the page: SHIFT and its open round (company-brain: TechSeed ended at #5), with no price. Blocks the outro copy.
3. Whether "นัดคุยกับรุ่นพี่" (a paid 1:1 via LINE) is allowed for minors. It stays hidden on the field page until confirmed.
4. Exempting `/radar` and `/r/` from the onboard gate. This spec assumes yes.
5. TikTok handle and bio-link eligibility. Until then, the typeable alias only.
6. Whether startCarousel may come back (ask the author of c8533443). This spec keeps it hidden.
7. A fixed weekly release day for new careers ("อาชีพต่อไปมาทุก...") with Angpao. Until agreed, the copy names no day.
8. The quick-reply DM variant, after the day-0 verification.

---

## Rejected or modified critiques

- **"Reel copy must say กดติดตามก่อน แล้วคอมเมนต์ RADAR" (eng 12).** Rejected. Making a follow the condition for the link is a dark pattern for minors (growth 5), Meta's recommendation rules penalise follow-gated bait (student UX 16), and Instagram cannot check it anyway. Undelivered DMs are handled by the always-sent public reply that points to the bio link, and by measuring DM → visit against commenters rather than "sent". The metrics part of eng 12 is applied.
- **"Use one shared `<video>` element so iOS keeps sound unlocked" (eng 15).** Rejected in favour of a tap per chapter (student UX 13): moving one element between `content-visibility:auto` sections is fragile, and the student UX data-cost point already argues against autoplaying later chapters. Later chapters try unmuted play only after sound was turned on, and fall back to a play button, never to muted autoplay.
- **"Re-enable startCarousel" (draft) and "Cyber needs a start card before recording" (student UX 5).** Modified. startCarousel stays hidden (commit c8533443 hid it on purpose, and it duplicates `RadarSkillExperience`; eng 8). The first-step rule is enforced on the skill start options instead, and cyber's recording of `start` is blocked until its start option meets it.
- **"Intents still count through StartCarousel taps" (student UX 8).** Incorrect: startCarousel is hidden, so those taps never happen. The outro's "สนใจสายนี้" button (eng 1) and the start options' `visit_id` metadata keep the intents metric working.
- **"Dawn theme with Kodchasan and Bai Jamjuree" (draft) and "Kodchasan and Bai Jamjuree with `--radar-accent`" (eng 10).** Modified to student UX 18: new components use the deck's existing fonts and accent, so the page has one type system; only captions use Bai Jamjuree 600.
- **"Persistent follow chip in the deck header from chapter 2" (growth 10).** Rejected: the header on a 360px screen is needed for the always-visible chapter label (student UX 9). The follow and share asks move to the `midShare` card after the money chapter instead, which is the point growth identified as peak value.
- **"First session covers all 4 careers × 2 angles" (growth 1).** Modified: the founder approved cybersecurity first, so session 1 gives cyber 3 chapters (`money`, `ai`, `start`) and the other three careers `money` and `start`, plus the comparison reel. Remaining chapters wait for the day-7 checkpoint.
- **"Auto-send on vague phrases like ขอค่ะ and อยากได้" (growth 7, partially).** Modified: explicit link requests on mapped reels auto-send; vague phrases go to the admin queue with one-click send (student UX 15), since "อยากได้" alone does not clearly ask for a message.
- **"Burn Thai captions with libass, pre-broken with Intl.Segmenter" (eng 20, second half).** Moot: social masters are edited in Dusk City style from the clean master and cut list (growth 3), so the pipeline burns no captions. The whisper model path from eng 20 is applied.
- **"Switch `tt` and `ig` to the career being pushed" (draft 6.3).** Removed per student UX 2: bio links point at the hub with the "จากคลิปไหน?" strip.
- **"Fix the stray Instagram links in this project" (eng 23).** Deferred to a separate small PR: `lib/content/home.ts` has in-progress home-page changes, and the links are not on Radar pages.
- **"RPC-only follow-up migration for `radar_field_views`" (draft 3.5).** Dropped from this project: the funnel now reads `radar_visits` (eng 5), so the legacy table is no longer on the critical path. Hardening it is a separate follow-up.
- **"Hub vote table `radar_career_votes` and a compare view" (growth 11).** Not rejected, deferred to Phase 2; the series numbering and IG Highlight from the same point are in the pilot.
