# Career Radar: Cybersecurity guide (final design, v1)

**As of:** 2026-11-11 (11 พ.ย. 2569). Every page carries `asOf: "2026-11-11"`.
**Audience:** a Thai student in ม.4 to ม.6 (mostly ม.5, about 16), on a phone, inside the Instagram in-app browser, arriving from a DM link. Many are torn between คอม, วิศวะ and หมอ.
**Promise of the guide:** by the last page the student knows whether this path fits, which faculty and which TCAS round it means for *their* grade, and has done one thing tonight that ends in a write-up they can show.

**Basis.** Skeleton from the *student* design (best student fit and buildability: 11 pages, tap-only games, skip-to-answer, grade-aware TCAS, `fit` page, demo-mode reels). Truth rails and routing from *newsroom* (single-word page keys, 45-day staleness test, four source badges, denylist, Firefox guess-the-bar, log missions). Strongest beats from *game* (birth-year cold open, "same lie" flip, bucket vs pipe, out-of-scope school-website card, middle-zone swipe rule, favourite-game role pick, legacy hash redirects).

---

## Changes made while merging (judge fixes applied)

| # | Problem in a draft | Resolution in this design |
|---|---|---|
| 1 | Hyphenated or digit-first slugs (`27-year-bug`, `bug-older-than-you`, `line-scam`) fail the `chapter_key` CHECK `^[a-z][a-z0-9_]{1,31}$`; the RPC writes NULL and `chapter_view` collapses per visit | All page keys are single lowercase words. URL path segment = page key = `chapter_key` |
| 2 | Event types `page_view`, `page_complete`, `game_start`, `game_complete`, `share`, `intent` are rejected by the events table | Only `chapter_view`, `interactive_tap`, `cta_click`, `share_click`, `follow_click` (plus existing video events). Intent uses the existing `recordInterested` |
| 3 | Left/right swipe between pages collides with Instagram's edge-swipe back | No swipe navigation between pages. Sticky "ต่อ" button and back arrow only. In-game swipes accepted only in the middle 60% of the screen and never required |
| 4 | Live TCAS70 countdowns would mislead ม.4 and ม.5 | Grade gate on `tcas`: only ม.6 sees live countdowns. ม.5 = TCAS71, ม.4 = TCAS72 |
| 5 | "เพดานสูงกว่า 7 เท่า" divides a multinational senior ceiling by an all-levels median | Dropped. Hook is "ค่ากลาง 35,500 เพดาน 250,000", drawn with a visible axis break |
| 6 | "Firefox 150 แก้ 271 จุด" | "Mozilla บอกว่า 271 ตัวเจอด้วย Mythos Preview" (fixed mostly in Firefox 150, across April releases) |
| 7 | "ถูกกฎหมาย 100%", "ไม่เกิน 2 ชม.", "30 นาที" | Removed. "ห้องที่เขาสร้างไว้ให้ฝึก" |
| 8 | "Mythos 5.2 locked to verified organisations only" | Adds Claude Enterprise customers via Claude Security |
| 9 | Adecco "people with AI skills" premium | Copy says job-switchers in cyber, data and AI ask 20 to 25%; no "AI premium" claim |
| 10 | 629 patched shown as a rate | Shown as a floor: "อย่างน้อย 629 เท่าที่ Anthropic รู้" |
| 11 | Mule-broker story single-sourced | Now confirmed by Thai Post, MGR Online and Thai TV5 (18 to 19 Oct 2569). Payment amount conflicts between outlets, so copy gives no amount |
| 12 | Gartner 70%/15% has no URL in the verified set | Held out of page copy until the Help Net Security URL is in the registry (open item) |
| 13 | Synthetic "แม่" voice clone needs consent and adds risk | Text transcript of a voice note, no audio |
| 14 | พ.ร.บ.คอมพิวเตอร์ มาตรา 5 citation | No section number until legal review; the principle is stated |
| 15 | Telling a 16-year-old to sign up for Claude or ChatGPT | Never. The open door reads "ผู้ใช้ทั่วไป", not "เธอ". TryHackMe step: "ถ้าเว็บกำหนดอายุ ให้ผู้ปกครองช่วยสมัคร" |
| 16 | Aggregate poll results need an admin-only read | No aggregate shown in v1. The student sees their own answer and the reveal only |
| 17 | Model-name jargon (Opus 4.8, Gemini 4 Argon) in student copy | Moved to the source drawer and small labels; copy says "โมเดลรุ่นเก่ากว่า", "Google", "OpenAI" |
| 18 | "Thai officials told ABC", CAAT unverified | ABC line not used. CAAT's six airlines are confirmed in the verified set but kept to the source drawer |

---

## 0. System rules (all pages)

### 0.1 Pages, keys and routes

| # | Key | Thai title | Question | Game | Founder clip | Est. time |
|---|---|---|---|---|---|---|
| 1 | `mythos` | AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ | AI เก่งเรื่องหาช่องโหว่แค่ไหนแล้วจริงๆ | Birth year + find the line + Firefox guess | Yes, 20s | 2 min |
| 2 | `doors` | AI ตัวเดียวกัน สองประตู | ใครได้ใช้ AI สายไซเบอร์ที่เก่งที่สุด | Who gets the key + same-lie flip + passport | Optional, 25s, safety | 2 min |
| 3 | `triage` | งานจริง คือจับผิด AI | วันธรรมดาของคนสายนี้ทำอะไรจริงๆ | Manager of agents: 10 alerts | Yes, 25s | 1.5 min |
| 4 | `scam` | แชตบ้านเธอ คือสนามจริง | ภัยไซเบอร์ในไทยตอนนี้หน้าตาเป็นยังไง | Thai this-week strip + scam or safe (7) | Yes, 20s | 1.5 min |
| 5 | `firstjob` | งานแรกของฉันจะเหลืออะไร | AI จะกินงานระดับเริ่มต้นไหม | Missing-rung ladder + proof picks | No (motion) | 1 min |
| 6 | `money` | เงินเดือนจริงในไทย | ทำสายนี้ในไทยได้เท่าไหร่ | Guess, then reveal | Yes, 25s | 1 min |
| 7 | `fit` | ฉันเหมาะไหม เทียบคอม วิศวะ หมอ | ไปไซเบอร์ตรงๆ คอมกว้างๆ ก่อน หรือใจอยู่ที่หมอ | 6 binary taps | Yes, 30s | 1 min |
| 8 | `tcas` | สมัครที่ไหน เมื่อไหร่ | ต้องยื่นที่ไหน รอบไหน ภายในวันไหน | Grade gate + programme filter | No (motion) | 1 min |
| 9 | `terminal` | ลองเป็นนักป้องกัน 3 นาที | งานนี้รู้สึกยังไงตอนลงมือจริง | Scope-first fake terminal + log missions | No (demo-mode reel) | 3 min |
| 10 | `tonight` | คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก | คืนนี้ทำอะไรได้เลย ที่จบด้วยของจริงในพอร์ต | Practice-room card + write-up builder | Yes, 22s, required (safety) | 1 min + offline |
| 11 | `next` | แล้วเธอล่ะ | สายนี้ใช่เราไหม แล้วจะดูอะไรต่อ | Recap + favourite pick + intent | No | 1 min |

Mid-deck share card sits between `money` and `fit` (spec 2.8).

**Routes**
- `app/radar/[slug]/[page]/page.tsx` with `generateStaticParams` from the content file. Static server components; one client island per game, loaded with `next/dynamic` after the hero renders. Nothing calls Supabase at build or prerender time (CI uses placeholder env vars).
- The existing `/radar/cybersecurity` deck stays as the overview ("ข้อมูลครบ"), with a "เริ่มไกด์" button to `/radar/cybersecurity/mythos`.
- Legacy hashes redirect on the client: `#hook` → `mythos`, `#reality` and `#day` → `triage`, `#ai` → `firstjob`, `#money` → `money`, `#study` → `tcas`, `#start` → `tonight`, `#outro` → `next`. Existing `/r` rows keep working.

**Content in code, not the database**
- `lib/content/radar-guide/cybersecurity.ts`: `GuidePage[]` (copy, mechanic data, fact ids, clip, reel, demoScript).
- `lib/content/radar-guide/facts.ts`: the fact registry (section "Fact registry" below), keyed by id.
- `components/radar/guide/games/<Engine>.tsx`: shared engines. `components/radar/guide/cyber/<Page>.tsx`: thin per-page wrappers.

```ts
type Badge = "confirmed" | "vendor" | "pending" | "simulated"; // ยืนยันแล้ว | ตัวเลขจากบริษัทเจ้าของเอง | ยังรอตรวจสอบ | จำลอง
type Fact = {
  id: string; claimEn: string; url: string; source: string;
  publishedAt: string; asOf: string; badge: Badge;
  usOnly?: boolean;   // shows "สหรัฐฯ"
  ourMath?: boolean;  // shows "เราคำนวณเอง"
  note?: string;
};
type GuidePage = {
  key: string; order: number; titleTh: string; questionTh: string;
  asOf: string; minutes: number; game: EngineId;
  copy: Record<string, string>; factIds: string[];
  clip?: { seconds: number; hookTh: string; scriptTh: string; required: boolean; safety: boolean };
  reel: { hookTh: string; variantsTh: [string, string]; visual: string; format: "founder" | "motion" | "demo" };
  demoScript: DemoStep[]; legacyHashes?: string[];
};
```

**Shared engines:** `FindLine`, `GuessReveal` (money, Firefox bar), `SortGame` (doors, triage, scam, triage bonus; tap card then tap bin), `FlipCards` (same lie), `DateToggle` (passport), `LadderRebuild`, `BinaryChoice` (fit), `ProgrammeFilter`, `FakeTerminal`, `EvidenceMaker` (write-up), `RecapCard`.

### 0.2 Funnel and links
- Reel → comment `RADAR` → fixed DM with `passionseed.org/r/cyber-<key>` → 302 to `/radar/cybersecurity/<key>?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-<key>-<founder|motion|demo>-<shortcode>`.
- **Backend change needed:** the `/r` resolver accepts `<alias>-(ig|tt|yt|story)` today. Add `<alias>-<pagekey>` where `<pagekey>` is validated against the guide's page keys. Each reel maps to exactly one page in `radar_links`.
- TikTok alias: `passionseed.org/r/cyber-<key>`.

### 0.3 Page shell
- **Top rail:** 11 dots (visited dots fill); tap opens a page map sheet. Next to it: "4/11 · เหลือราว 6 นาที" (computed from `minutes` of the remaining pages).
- **Landing mid-guide:** chip "เริ่มจากหน้าแรก (1/11)". Never forced back. Every page plays correctly with empty state.
- **Freshness + sources chip:** "ข้อมูล ณ 11 พ.ย. 2569 · ที่มา" opens a bottom sheet listing every fact on the page: claim, outlet, date, link, badge.
- **Badges (exact Thai):** `ยืนยันแล้ว` · `ตัวเลขจากบริษัทเจ้าของเอง` · `ยังรอตรวจสอบ` · `จำลอง`. Extra labels: `สหรัฐฯ`, `เราคำนวณเอง`.
- **Sticky bottom bar:** "ต่อ" (min 48px) and a back arrow. No edge swipes.
- **Every game:** "ข้ามเกม ดูเฉลย" link (fires `interactive_tap <key>:skip`) that reveals the answer state, so a student who skips still finishes the page. Games are 3 to 8 decisions, 60 to 90 seconds, except `terminal`.
- **Timers:** optional and non-failing. Every timed game has a "ไม่จับเวลา" toggle.
- **No-JS fallback:** the question, all copy and the fact list are server-rendered; the game area shows the answer state as static text.

### 0.4 Instagram in-app browser rules
- "Drag" always means tap a card, then tap a target. Real drag turns on only under `(hover: hover) and (pointer: fine)`.
- Targets at least 48px. One page fits about 1 to 1.5 screens.
- No autoplay with sound. Founder clips autoplay muted inline with a poster frame; tap turns sound on; playback through the existing `usePlaybackManager`. Every page works without its clip.
- No WebGL on game pages. Per-page JS bundles split.
- Clipboard falls back to a textarea with the text pre-selected. Web Share falls back to "คัดลอกลิงก์".
- `prefers-reduced-motion`: counters show final values, no shakes or falling items, chat messages appear all at once.
- Visual system: existing `.radar-deck` (dark, `--radar-accent`, Athiti for Thai, Space Mono for code and terminal). Glow animations change clip-path, opacity and filter together; hover-out snaps back; touch devices get IntersectionObserver plus `@media (hover: none)` equivalents (`docs/ui-design-system.md`). Reuse `.ei-card` and `.ei-button-dusk`.

### 0.5 State
- **Per-viewer convenience only:** one `localStorage` key `radar-guide:v1:cybersecurity`. Every read and write in try/catch. Nothing is needed to render a page.

```ts
type CyberGuideState = {
  visited: string[];
  grade?: "m4" | "m5" | "m6";
  birthYear?: number;                       // local only, never sent
  games: Record<string, { score?: number; total?: number; attempts?: number; ms?: number; done: boolean; skipped?: boolean }>;
  choices: Record<string, string>;          // e.g. "doors:card3": "redteam", "terminal:poll": "depends"
  fit?: "A" | "B" | "C" | "AB" | "AC" | "BC";
  proof?: string[];                         // 3 picks from firstjob
  shortlist?: string[];                     // mytcas programme ids starred on tcas
  terminal?: { missions: number[]; flag: boolean; scopeTries: number };
  writeupDraft?: Record<string, string>;    // never sent
  checklist?: boolean[];
  favourite?: string;                       // page key picked on next
};
```

- `?demo=1` disables all tracking and storage writes.

### 0.6 Events (existing `radar_guide_events` via the existing RPC; every event carries `visit_id` and `chapter_key` = page key)

| Type | When | target / value |
|---|---|---|
| `chapter_view` | page becomes visible | none |
| `interactive_tap` | game milestones | `<key>:<action>`, `value_int` = score or bucket (list per page below) |
| `cta_click` | outbound or intent buttons | `first-step`, `program`, `other-career` |
| `share_click` | share buttons | `line`, `copy`, `webshare` |
| `follow_click` | follow line | platform |

Never sent: names, birth year, GPAX, typed commands, write-up text, nickname. Only free text that leaves the device is the validated career-request field on `next` (existing `career-request.ts`).

### 0.7 Truth rails (Jest, fail the build)
1. **Dash and tone lint:** no `—` or `–` in any `*Th` field or copy string; no `น้องๆ` / `น้อง ๆ`.
2. **Digit-to-claim lint:** every digit run in Thai copy must appear in the `claimEn` or the declared value of one of the page's `factIds`. Whitelisted: grade labels (`ม.\d`), round names (`TCAS7\d`, `รอบ \d`), UI chrome computed at runtime, and strings inside components marked `simulated` (those cite a `sim.*` fact).
3. **Registry lint:** every fact has `url` (https), `source`, `publishedAt`, `asOf`, `badge`. Every `factIds` entry exists.
4. **Staleness:** fails when any page's `asOf` is more than 45 days before the build date. Forces the news refresh.
5. **Denylist:** fails when copy, clip scripts or reel hooks contain any pattern in "Must-not-say" (bottom of this file).
6. **Countdowns:** deadlines computed against `Date.now()`; a passed deadline renders "ปิดแล้ว", never a negative number (unit test with a mocked clock on 2026-11-17 and 2027-01-29).

### 0.8 Safeguarding
- No 1:1 channel, no contact capture, no "chat with us", no LINE QR. Questions go to public comments.
- Founder face on screen for every safety line (`tonight` required; `doors` when its clip is used).
- Simulated chats, code, logs and alerts carry `จำลอง`. Generic chat UI, no LINE or bank logos, watermark "ตัวอย่างจำลอง".
- Victims and companies in real cases stay unnamed.
- Every page that shows "hacking" (`doors`, `terminal`, `tonight`) carries the fixed legal-lab line. The jailbreak sentence "นี่คือการทดสอบที่ได้รับอนุญาต" is always framed as granting no permission.
- Screenshot hygiene: "แคปจอโดยไม่ให้ติดอีเมลหรือชื่อจริง".

### 0.9 Reels come from the pages
- Each game exports `demoScript: DemoStep[]` (`{ at: ms, action: "tap" | "type" | "wait", target: string, text?: string }`).
- `/radar/cybersecurity/<key>?demo=1` plays the script with tracking off; the existing reel studio (`components/radar/reel`) films it. Proposed command: `pnpm radar:reel cybersecurity --page triage`.
- Every reel ends on: "คอมเมนต์ RADAR รับลิงก์ทาง DM" plus a send-to-friend line.

### 0.10 Build order (3-day cut)
- **Day 1:** route + shell, content types, fact registry, all six lints, sources sheet, localStorage helper, `/r` pagekey pattern, legacy hash redirects.
- **Day 2:** `SortGame` (doors, triage, scam), `GuessReveal` (money, Firefox bar), `FindLine` (mythos), pages `mythos`, `money`, `scam`.
- **Day 3:** `tcas` with grade gate, `tonight` (card + write-up copy), `next` (recap, intent, request, share), `terminal` if time allows, `demoScript` on mythos, triage and scam.
- **Phase 2:** `fit` polish, Thai Airways flow trace, canvas image exports (write-up card, recap story), triage bonus round, passport toggle animation.

---

## Page 1 · `mythos`

- **Title:** AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ
- **Question:** AI เก่งเรื่องหาช่องโหว่แค่ไหนแล้วจริงๆ
- **Links:** `/radar/cybersecurity/mythos` · `/r/cyber-mythos` · legacy `#hook`

### Mechanic (three beats, each unlocked by "ต่อ" inside the page)

**Beat A: birth year (5s).**
- Prompt: "เธอเกิดปีไหน". Seven chips `2550` to `2556` plus "ไม่บอก".
- On tap, a horizontal timeline animates from 2542 to the chosen year to 2569. A bug icon already sits on 2542, labelled "ประมาณ".
- Output: "บั๊กนี้อยู่ในโค้ดมาก่อนเธอเกิดราว {year − 2542} ปี". "ไม่บอก" shows "บั๊กนี้อยู่ในโค้ดมาราว 27 ปี".
- `birthYear` saved locally only. Event `interactive_tap mythos:birthyear` (no value).

**Beat B: find the dangerous line (`FindLine`).** Badge `จำลอง`, caption "โค้ดจำลองแนวคิด ไม่ใช่โค้ดจริงของ OpenBSD". Render in Space Mono, each line a 48px tap row:

```c
1  // รับข้อมูลที่ส่งมาจากเครือข่าย
2  void handle_packet(uint8_t *buf, int n) {
3    uint8_t name[64];            // ที่ว่าง 64 ไบต์
4    if (n < 1) return;           // ข้อมูลว่าง ข้าม
5    int len = buf[0];            // ความยาว: คนส่งเป็นคนบอก
6    log("got packet", n);
7    copy(name, buf + 1, len);    // คัดลอกตามความยาวที่เขาบอก
8    if (len > 64) {              // เช็กขนาด
9      return;
10   }
11   greet(name);
12 }
```

- States: `idle` → `wrong` (attempts++) → `found`. Answer: line 7.
- Feedback by tap:
  - line 8: "ใกล้แล้ว เช็กขนาดตรงนี้ถูก แต่ดูว่ามันมาก่อนหรือหลังการคัดลอก"
  - line 5: "ใช่ ค่านี้มาจากคนนอก แล้วมันถูกเอาไปใช้ที่บรรทัดไหน"
  - other lines, 1st wrong tap: hint 1 "ค่าไหนมาจากคนนอก"
  - 2nd wrong tap: hint 2 "name มีที่เท่าไหร่ แล้วเช็กก่อนหรือหลังคัดลอก" and lines 5, 7, 8 get a soft outline
- On `found`: line 7 glows red; counter rolls 0 → 5,000,000 (reduced motion: static) with caption "จำนวนครั้งที่เทสต์อัตโนมัติวิ่งผ่านบรรทัดที่มีบั๊กใน FFmpeg โดยไม่เคยจับได้ (บั๊กอายุ 16 ปี)".
- Explanation: "บรรทัด 7 คัดลอกข้อมูลตามความยาวที่คนส่งเป็นคนบอก ซึ่งใหญ่ได้ถึง 255 ไบต์ แต่ name มีที่แค่ 64 แล้วโค้ดค่อยมาเช็กทีหลัง ข้อมูลเลยล้นไปทับหน่วยความจำส่วนอื่น บั๊กตระกูลนี้แหละที่ AI ไล่หาในโค้ดจริง"
- Saved: `{ found, attempts, ms }`. Event `interactive_tap mythos:found` `value_int` = attempts.

**Beat C: guess the bar (`GuessReveal`).**
- Chart: a shaded band labelled "2568: ปกติเดือนละ 20 ถึง 30" (a band, not invented monthly bars), a bar "มี.ค. 2569: 76 (สถิติเดิม)", and an empty bar "เม.ย. 2569: ?".
- Slider 0 to 500, step 10, with − / + buttons, then "ล็อกคำตอบ".
- Reveal: the April bar rises to 423, with a 271 segment coloured "เจอด้วย Mythos Preview". Text: "เธอเดา {g} ของจริง 423".
- Event `interactive_tap mythos:firefox-guess` `value_int` = guess bucket (0: <50, 1: 50 to 149, 2: 150 to 299, 3: ≥300).

### Copy (final Thai)
- **Hero:** AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ
- **Sub:** ลองดูว่าเธอหาเจอไหม ไม่ต้องเขียนโค้ดเป็นก็เล่นได้
- **After Beat B (badge `ตัวเลขจากบริษัทเจ้าของเอง`):** เมษายน 2569 Anthropic เปิดตัว AI ชื่อ Claude Mythos Preview แล้วไม่ปล่อยให้คนทั่วไปใช้ เพราะมันหาช่องโหว่เก่งเกินไป บริษัทบอกว่ามันเจอบั๊กใน OpenBSD ที่ซ่อนอยู่ราว 27 ปี แค่ต่อเข้าเครื่องได้ก็สั่งให้เครื่องล่มได้ และเจอบั๊กใน FFmpeg อายุ 16 ปี ในบรรทัดที่เทสต์อัตโนมัติวิ่งผ่านมาแล้ว 5 ล้านครั้ง
- **Before Beat C:** แล้วในโลกจริงเปลี่ยนไปแค่ไหน ปกติ Firefox แก้ช่องโหว่เดือนละ 20 ถึง 30 ตัว ลองทายว่าเดือนเมษายน 2569 แก้ไปกี่ตัว
- **After Beat C:** 423 ตัว Mozilla บอกว่าในนั้น 271 ตัวเจอด้วย Mythos Preview และ 180 ตัวเป็นระดับร้ายแรงสูง
- **Update line:** 9 พ.ย. 2569 รุ่นใหม่ Mythos 5.2 ออกแล้ว และยังไม่เปิดให้ทุกคนใช้
- **Honesty card:** ตัวเลขส่วนใหญ่มาจาก Anthropic เอง มีทีมวิจัยอื่นแย้งว่าโมเดลเล็กกว่าก็เจอบางบั๊กได้ ถ้ามีคนตัดเฉพาะโค้ดส่วนที่มีปัญหามาให้ดู
- **Exit:** คำถามต่อไป: ถ้า AI หาช่องโหว่เก่งขนาดนี้ ใครได้ใช้มัน

### Facts
`f.glasswing-launch`, `f.firefox-mozilla`, `f.mythos52`, `f.aisle-caveat`, `sim.mythos-snippet`.

### Founder clip (20s, after Beat B)
- **On-screen hook:** AI เจอบั๊กที่แก่กว่าเธอ
- **Script:** เมื่อเมษาที่ผ่านมา Anthropic สร้าง AI ชื่อ Mythos แล้วไม่ยอมปล่อยให้คนทั่วไปใช้ เพราะมันหาช่องโหว่เก่งเกินไป บริษัทบอกว่ามันเจอบั๊กที่ซ่อนอยู่ในระบบมาราว 27 ปี แก่กว่าพวกเธออีก แต่ไกด์นี้ไม่ได้จะบอกว่าคนหมดความหมาย จะพาไปดูว่าตรงไหนที่ยังต้องเป็นคน และเธอเริ่มได้คืนนี้เลย

### Motion visual
Year counter rolling back 2569 → 2542 with the bug icon landing; line 7 glowing; the 5,000,000 counter; the Firefox bar shooting from the 20 to 30 band past 76 to 423.

### Reel (founder + motion cutaways)
- **Hook:** AI เพิ่งเจอบั๊กที่ซ่อนอยู่ 27 ปี แก่กว่าเธออีก
- **Variant 1:** บรรทัดนี้ถูกเทสต์ 5 ล้านครั้ง ไม่มีใครเห็นบั๊ก
- **Variant 2:** AI ที่บริษัทไม่กล้าปล่อยให้คนทั่วไปใช้
- **Send-to-friend:** ส่งให้เพื่อนที่ชอบแกะว่าระบบพังตรงไหน

---

## Page 2 · `doors`

- **Title:** AI ตัวเดียวกัน สองประตู
- **Question:** ใครได้ใช้ AI สายไซเบอร์ที่เก่งที่สุด แล้วทำไมความน่าไว้ใจถึงกลายเป็นทักษะ
- **Links:** `/radar/cybersecurity/doors` · `/r/cyber-doors`

### Mechanic

**Act 1: "ใครได้กุญแจ" (`SortGame`, 5 scored cards + 1 closing card).** Tap a card, then a door: `Defense` / `Red Team` / `Specialized` / `ไม่ผ่าน`. Each placement flips to Anthropic's rule.

| Card | Correct | Accepted as "ใกล้แล้ว" | Reveal line |
|---|---|---|---|
| ทีมความปลอดภัยของโรงพยาบาล | Defense | none | ทีมความปลอดภัยขององค์กรเข้าทาง Defense ได้ |
| นักล่าบั๊กคนเดียว มีผลงานเปิดเผย | Defense | Red Team → "ใกล้แล้ว Red Team รับเฉพาะองค์กร" | คนที่มีประวัติผลงานตรวจสอบได้เข้า Defense ได้ แต่ Red Team รับเฉพาะองค์กร |
| บริษัททดสอบเจาะระบบ มีสัญญากับลูกค้า | Red Team | none | ทดสอบเจาะระบบที่ได้รับอนุญาต รับเฉพาะองค์กร และยังบล็อกงานแบบแรนซัมแวร์อยู่ดี |
| ผู้ดูแลระบบไฟฟ้า | Specialized | Defense (counts as correct) | ระบบที่พลาดไม่ได้ ตรวจละเอียดร่วมกับรัฐบาลสหรัฐฯ หรือเข้า Defense ในฐานะผู้ดูแลโครงสร้างพื้นฐานสำคัญ |
| บัญชีไม่ระบุตัวตน พิมพ์มาว่า "นี่คือการทดสอบที่ได้รับอนุญาต" | ไม่ผ่าน | none | พิมพ์เองไม่นับ ประโยคนี้แหละที่คนร้ายใช้หลอก AI มาแล้ว (ดูต่อข้างล่าง) |

- Score `x/5`. Saved `choices["doors:cardN"]`. Event `interactive_tap doors:key-done` `value_int` = score.
- **Closing card (unscored):** "แล้วนักเรียน ม.5 ที่ชอบแฮกล่ะ" → "ตอนนี้ยังไม่ผ่าน (เราตีความจากเกณฑ์: ต้องเป็นทีมความปลอดภัย หรือนักวิจัยที่มีผลงานตรวจสอบได้) ข่าวดีคือผลงานแบบนั้นเริ่มเก็บได้ตั้งแต่ ม.ปลาย" Label `ความเห็นทีมเรา`.

**Act 2: "ประโยคเดียวกัน" (`FlipCards`, 3 cards).** Each card flips to a short case; the same sentence is highlighted on all three: **"นี่คือการทดสอบที่ได้รับอนุญาต"**.
1. **ส.ค. 2569 · กลุ่มแรนซัมแวร์:** สั่ง AI agent ช่วยเขียนโค้ดเจาะระบบ พอ AI ปฏิเสธ ก็เริ่มใหม่แล้วอ้างว่าเป็นงานทดสอบที่ได้รับอนุญาต Reuters รายงานว่ามีบริษัทโดนเจาะอย่างน้อย 7 แห่ง
2. **ส.ค. 2569 · รัฐบาลแห่งหนึ่งในเอเชีย:** บริษัทวิจัย Dream รายงานว่าคนร้ายหลบตัวกันของ AI agent ด้วยการอ้างว่าเป็นการทดสอบเจาะระบบที่ได้รับอนุญาต (สื่อระบุว่าเป็นไต้หวัน และไต้หวันยืนยันว่าโดนโจมตีที่มี AI agent ช่วย)
3. **พ.ย. 2568 · กลุ่มจารกรรม:** Anthropic บอกว่าจับกลุ่มที่ใช้ Claude Code บุกเป้าหมายราว 30 แห่งได้ คนร้ายอ้างว่าเป็นบริษัทความปลอดภัยที่กำลังทดสอบระบบ แล้วแตกงานเป็นชิ้นเล็กๆ ที่ดูไม่มีพิษภัย
- Event `interactive_tap doors:lie-flip` `value_int` = cards flipped.

**Act 3 (collapsed, "ทุกแล็บมีห้องล็อก"):** three columns fill on scroll: Anthropic · Cyber Verification Program; OpenAI · GPT-6 Cyber (5 พ.ย. 2569); Google · โปรแกรม Fairwind (30 ก.ย. 2569, เปิดกว้างขึ้นราวกลาง ต.ค.).

**Act 4 (collapsed, "เช็กพาสปอร์ต", `DateToggle`):** three chips; each lights what a user in Thailand could use that day.

| Chip | Fable 5 (ผู้ใช้ทั่วไป) | Mythos 5 |
|---|---|---|
| 11 มิ.ย. 2569 | เปิด | ปิด (เฉพาะองค์กรพันธมิตร) |
| 13 มิ.ย. 2569 | ปิดสำหรับทุกคน | ปิด |
| 1 ก.ค. 2569 | กลับมาทั่วโลก | ปิด (เฉพาะองค์กรในสหรัฐฯ ที่ได้รับอนุมัติ) |

Event `interactive_tap doors:passport` `value_int` = chip index.

### Copy (final Thai)
- **Hero:** AI ตัวเดียวกัน แต่มีสองประตู
- **Intro:** 9 พ.ย. 2569 Anthropic ปล่อย Fable 5.2 กับ Mythos 5.2 บริษัทบอกว่าเป็นโมเดลตัวเดียวกัน ต่างกันแค่ประตู ประตูแรกเปิดให้ผู้ใช้ทั่วไป แต่ถ้าของานไซเบอร์ที่เสี่ยงสูง ระบบจะส่งไปให้โมเดลรุ่นเก่ากว่าตอบแทน ประตูที่สองไม่มีตัวบล็อกนั้น และเปิดให้เฉพาะองค์กรที่ผ่านการตรวจสอบ กับลูกค้าองค์กรของบริษัท
- **After Act 1:** ฝีมืออย่างเดียวไม่เปิดประตูที่สอง ต้องมีหลักฐานว่าไว้ใจเธอได้ ในสายนี้ ความไว้ใจคือส่วนหนึ่งของเรซูเม่
- **After Act 2:** ทั้งสามเคสใช้คำเดียวกัน: ได้รับอนุญาต ในงานจริง คำนี้ต้องมีสัญญาที่เจ้าของระบบเซ็น มีขอบเขต มีเวลา พิมพ์เอาเองไม่นับ และยังผิดกฎหมาย
- **Act 3:** ไม่ใช่แค่ Anthropic OpenAI ให้ GPT-6 Cyber เฉพาะลูกค้าที่ได้รับอนุญาตทำงานเจาะระบบ Google ให้โมเดลใหม่กับทีมป้องกันในโปรแกรมของตัวเองก่อน ทุกแล็บใหญ่มีโปรแกรมคัดคน ก่อนให้ใช้โมเดลที่เก่งเรื่องไซเบอร์ที่สุด
- **Act 4:** 12 มิ.ย. 2569 รัฐบาลสหรัฐฯ สั่งให้ Anthropic ปิดโมเดลสองตัวนี้สำหรับคนที่ไม่ใช่สัญชาติอเมริกัน บริษัทเช็กสัญชาติแบบทันทีไม่ได้ เลยปิดให้ทุกคน คำสั่งถูกยกเลิก 30 มิ.ย. Fable 5 กลับมาทั่วโลก 1 ก.ค. แต่ Mythos 5 กลับมาเฉพาะองค์กรในสหรัฐฯ ที่ได้รับอนุมัติ การเข้าถึง AI จึงเป็นเรื่องระหว่างประเทศด้วย
- **Safety line (fixed, not dismissible):** เจาะระบบที่เจ้าของไม่ได้อนุญาตเป็นลายลักษณ์อักษร ผิดกฎหมาย ต่อให้พิมพ์ว่าได้รับอนุญาตก็ตาม
- **Exit:** ถ้าวันหนึ่งเธออยากได้กุญแจ ต้องเริ่มจากงานที่คนมองเห็นได้ หน้าถัดไปคืองานจริงวันธรรมดา

### Facts
`f.mythos52`, `f.cvp-tiers`, `f.cursor-reuters`, `f.dream-taiwan`, `f.gtg1002`, `f.gpt6-cyber`, `f.gemini-argon`, `f.fable5-mythos5-launch`, `f.us-directive`.

### Founder clip (optional, 25s, face on screen for the safety line)
- **On-screen hook:** แฮกเกอร์หลอก AI ด้วยประโยคเดียว
- **Script:** มีเคสจริงอย่างน้อยสามเคส ที่คนร้ายหลอก AI ด้วยประโยคเดียวกัน ว่านี่คือการทดสอบที่ได้รับอนุญาต สิ่งที่แยกนักทดสอบระบบออกจากอาชญากร ไม่ใช่ฝีมือ แต่คือการได้รับอนุญาตจริง มีสัญญา มีขอบเขต จำไว้เลย ระบบที่ไม่ใช่ของเรา ถ้าเจ้าของไม่ได้อนุญาตเป็นลายลักษณ์อักษร ห้ามแตะ ผิดกฎหมาย พิมพ์ว่าได้รับอนุญาตเอง ไม่นับ

### Motion visual
Two doors side by side; request tokens roll toward them; the Fable door diverts one to a smaller older door; a lock snaps on the Mythos door. Then three cards flip in rhythm and the same sentence lights up three times.

### Reel (motion, or founder if recorded)
- **Hook:** AI ที่เก่งที่สุดตอนนี้ ไม่ได้ให้ทุกคนใช้
- **Variant 1:** แฮกเกอร์หลอก AI ด้วยประโยคเดียว: นี่คือการทดสอบที่ได้รับอนุญาต
- **Variant 2:** มิ.ย. 2569 คนไทยใช้ AI ตัวนี้ไม่ได้ 19 วัน
- **Send-to-friend:** ส่งให้เพื่อนที่คิดว่าเก่งอย่างเดียวพอ

---

## Page 3 · `triage`

- **Title:** งานจริง คือจับผิด AI
- **Question:** วันธรรมดาของคนสายนี้ ทำอะไรจริงๆ
- **Links:** `/radar/cybersecurity/triage` · `/r/cyber-triage` · legacy `#reality`, `#day`

### Mechanic: "หัวหน้าทีม AI" (`SortGame`, 10 alerts, badge `จำลอง`)
- A SOC queue. Each row: time, title, AI label chip (`โจมตีจริง` red / `เตือนหลอก` grey) and confidence %. All names fictional; all IPs from RFC 5737.
- Tap a row → it expands to one line of evidence the AI did not weigh → two buttons: `เห็นด้วยกับ AI` / `AI พลาด`.
- Goal shown at top: "หาข้อที่ AI พลาด (มี 2 ข้อ)".
- Soft timer: 90s bar "คนร้ายเคลื่อนที่" in the corner, nothing fails at zero, "ไม่จับเวลา" toggle.

| # | Time | Alert | AI label | Evidence on expand | Truth | Feedback |
|---|---|---|---|---|---|---|
| 1 | 02:14 | รหัสผ่านผิด 3 ครั้ง บัญชี somchai.k | เตือนหลอก 97% | ครั้งที่ 4 เข้าได้จากเครื่องประจำของเขาเอง | agree | พิมพ์ผิดธรรมดา AI ถูก |
| 2 | 02:31 | ล็อกอินสำเร็จจากต่างประเทศ บัญชี finance01 | เตือนหลอก 91% "ผู้ใช้เดินทางบ่อย" | 4 นาทีก่อน มีคนรีเซ็ตรหัสผ่านบัญชีนี้ผ่าน SMS และเจ้าของบัญชีเพิ่งแตะบัตรเข้าออฟฟิศที่กรุงเทพฯ เมื่อ 10 นาทีก่อน | **AI พลาด** (บัญชีโดนยึด) | AI ดูแค่ประวัติการเดินทาง แต่ไม่ได้ดูว่าเพิ่งมีการรีเซ็ตรหัสผ่าน และเจ้าของยังอยู่ที่ออฟฟิศ |
| 3 | 03:00 | งานสำรองข้อมูลตามตาราง ส่งไฟล์ใหญ่ไปเซิร์ฟเวอร์สำรอง | เตือนหลอก 95% | ตรงกับตารางสำรองข้อมูลทุกคืน | agree | AI ถูก |
| 4 | 03:12 | อีเมลฟิชชิงถูกบล็อกก่อนถึงกล่องจดหมาย | เตือนหลอก 99% | ไม่มีใครเปิด ระบบจัดการแล้ว | agree | AI ถูก |
| 5 | 08:45 | สแกนพอร์ตทั้งเครือข่ายจาก 198.51.100.23 | โจมตีจริง 88% | IP นี้อยู่ในเอกสารขอบเขตงานของบริษัททดสอบเจาะระบบที่เราจ้างเอง และอยู่ในช่วงเวลาที่ตกลงไว้ | **AI พลาด** (เตือนหลอก) | AI ไม่รู้ว่าเราจ้างคนมาทดสอบเอง คนที่อ่านเอกสารขอบเขตงานเป็น จะรู้ทันที |
| 6 | 09:10 | เครื่องพิมพ์ชั้น 3 ส่งสัญญาณผิดปกติ | เตือนหลอก 93% | กระดาษติดซ้ำ | agree | AI ถูก |
| 7 | 09:30 | อัปเดตระบบล้มเหลว 2 เครื่อง | เตือนหลอก 90% | ระบบตั้งให้ลองใหม่คืนนี้ | agree | AI ถูก แต่จดไว้ตามต่อพรุ่งนี้ |
| 8 | 10:05 | พนักงานคลิกลิงก์ในอีเมลฟิชชิง | โจมตีจริง 87% "ให้รีเซ็ตรหัสและสแกนเครื่อง" | บันทึกพบว่ากรอกรหัสผ่านลงหน้าเว็บปลอมก่อนถูกบล็อก | agree | AI ถูก ข้อนี้ต้องรีบ |
| 9 | 11:20 | ไฟร์วอลล์บล็อกการเชื่อมต่อจากนอกประเทศ 1,200 ครั้ง | เตือนหลอก 92% | สแกนทั่วไปจากอินเทอร์เน็ต ถูกบล็อกหมด | agree | AI ถูก |
| 10 | 13:40 | ผู้ใช้ขอรีเซ็ตรหัสผ่านผ่านฝ่ายไอที | เตือนหลอก 96% | ยืนยันตัวตนผ่านหัวหน้าแล้ว | agree | AI ถูก |

- Overriding a correct label shows: "ข้อนี้ AI ถูก: {feedback}".
- **End screen:** "จับข้อที่ AI พลาดได้ {x}/2 · เห็นด้วยถูก {y}/8".
  - Caught #2: "ข้อ 2 คือบัญชีโดนยึดจริง เธอเห็นสิ่งที่ AI มองข้าม"
  - Missed #2: "AI ถูก 8 จาก 10 ฟังดูดี แต่ข้อที่มันพลาดข้อหนึ่งคือโดนจริง ลองกดข้อ 2 ดูอีกที"
- Saved `games.triage = { score: x + y, total: 10, done }`. Events `interactive_tap triage:done` `value_int` = x*10 + y; `triage:caught-takeover` when #2 is marked.

**Bonus round (collapsed, phase 2): "เธอคือคนดูแลโปรเจกต์".** Three AI-written bug reports, each with a 3-line snippet; bins `ของจริง` / `ซ้ำกับที่มีคนแจ้งแล้ว` / `ไม่จริง`.
- R1: same length-before-check bug as page 1 → ของจริง.
- R2: identical to an existing issue shown above the inbox ("#212 แจ้งแล้วเมื่อสัปดาห์ก่อน") → ซ้ำ.
- R3: claims SQL injection, but the snippet uses parameter binding → ไม่จริง.
- Reveal copy: ตอนผู้เชี่ยวชาญตรวจรายงานที่ AI เขียน 97 ชิ้น ผ่านเกณฑ์แจ้งเจ้าของโปรเจกต์ 85 ชิ้น เป็นของจริงแต่ซ้ำ 11 ชิ้น ไม่จริง 1 ชิ้น ยังไงก็ต้องมีคนคัด

### Copy (final Thai)
- **Hero:** งานแรกของเธออาจไม่ใช่นั่งดูจอ แต่คือการตรวจงาน AI
- **Intro:** AI ติดป้ายสัญญาณเตือนมาให้แล้ว 10 อัน มี 2 อันที่มันพลาด ลองหาดู
- **After:** ในหนัง แฮกเกอร์พิมพ์รัวๆ คืนเดียวระบบแตก ของจริงคือคิวสัญญาณเตือนยาวเหยียด ตอนนี้ AI ช่วยติดป้ายให้แล้ว งานของคนคือรู้ว่าตอนไหน AI พลาด
- **Speed card (badge `ตัวเลขจากบริษัทเจ้าของเอง`):** ทำไมต้องรีบ: CrowdStrike รายงานว่าปี 2568 คนร้ายใช้เวลาเฉลี่ย 29 นาที จากเจาะเข้าได้ไปถึงขยับไปเครื่องอื่น เคสเร็วที่สุดที่เคยเห็นใช้แค่ 27 วินาที (เคสเดียว ไม่ใช่ปกติ)
- **Bucket vs pipe (visual: a bucket labelled "แจ้งแล้ว 5,087" beside a thin pipe "แก้แล้วอย่างน้อย 629"):** ฝั่งโอเพนซอร์สก็ติดคอขวดเดียวกัน ถึง 2 พ.ย. 2569 Anthropic แจ้งช่องโหว่ให้โปรเจกต์โอเพนซอร์สไปแล้ว 5,087 ตัว เท่าที่บริษัทรู้ แก้แล้วอย่างน้อย 629 ตัว (ราว 12% เราคำนวณเอง)
- **Quote:** Anthropic เขียนเองว่า ความปลอดภัยของซอฟต์แวร์เคยติดที่ความเร็วในการหาช่องโหว่ ตอนนี้ติดที่ความเร็วในการตรวจ แจ้ง และแก้
- **ER bridge:** ถ้าเคยสนใจห้องฉุกเฉิน งานนี้คล้ายกัน คือคัดว่าอะไรด่วนจริง แค่คนไข้คือระบบ
- **Honest line:** ข้อเสีย: เหตุด่วนไม่เลือกเวลา โดนตอนตีสามก็ต้องตื่น

### Facts
`f.crowdstrike`, `f.patch-gap`, `f.glasswing-bottleneck-quote`, `f.oss-scanner` (bonus), `f.isc2-pulse` (source drawer, "manager of agents" framing via `f.cso-manager-agents`), `sim.triage-queue`.

### Founder clip (25s, after the end screen)
- **On-screen hook:** AI ติดป้ายผิด 2 ใน 10 เธอเจอไหม
- **Script:** ถ้าเธอลังเลระหว่างหมอกับคอม ลองดูงานนี้ หมอห้องฉุกเฉินต้องคัดว่าใครด่วนจริง คนสายไซเบอร์ก็คัดว่าสัญญาณไหนคือโดนจริง ต่างกันที่ตอนนี้ AI ติดป้ายมาให้ก่อน และบางทีมันก็ผิด งานของเราคือรู้ว่ามันผิดตรงไหน ลองเกมนี้ดู ถ้าสนุก นั่นคือข้อมูลสำคัญเกี่ยวกับตัวเธอ

### Motion visual
Alert list scrolling, an AI badge stamped on each row, row 2 turning red late; then the bucket filling faster than the pipe drains.

### Reel (founder + demo-mode cutaways)
- **Hook:** งานไซเบอร์จริง คือจับผิด AI
- **Variant 1:** AI ติดป้ายผิด 2 ใน 10 เธอหาเจอไหม
- **Variant 2:** AI ตอบถูก 8 จาก 10 แต่ข้อที่ผิดคือโดนแฮกจริง (caption "เกมจำลอง")
- **Send-to-friend:** ส่งให้เพื่อนที่ยังลังเลระหว่างหมอกับคอม

---

## Page 4 · `scam`

- **Title:** แชตบ้านเธอ คือสนามจริง
- **Question:** ภัยไซเบอร์ในไทยตอนนี้หน้าตาเป็นยังไง แล้วใครเป็นคนหยุดมัน
- **Links:** `/radar/cybersecurity/scam` · `/r/cyber-scam`

### Mechanic

**Top strip: "9 พ.ย. 2569 วันเดียว"** (three cards, horizontal scroll with snap inside the middle zone; tap to expand).
1. **สมช.:** หน่วยงานรัฐ ธนาคาร และสาธารณูปโภค เจอความพยายามโจมตีทุกวัน และคนร้ายใช้ AI หาจุดอ่อนของระบบก่อนลงมือ
2. **ธปท.:** เรียก CIO ของทุกสถาบันการเงินมาประชุมกับ TB-CERT และสมาคมธนาคารไทย หลังมีเหตุโจมตีธนาคารต่างประเทศ ตอนนี้ยังไม่พบผลกระทบกับบริการในไทย
3. **การบินไทย:** ข้อมูลการจองผู้โดยสารราว 60,000 รายการถูกเข้าถึงผ่านระบบของ Amadeus บริษัทระบบจองที่สายการบินใช้ เข้าถึงได้นานกว่า 3 ปี การบินไทยแจ้งว่าข้อมูลบัตรเครดิตไม่ได้รับผลกระทบ
   - Expanded (phase 2 `FlowTrace`): four hops เธอ → แอปสายการบิน → ระบบจองกลาง → สนามบิน. Tap where you think it leaked; each hop shows which fields it holds; the central booking system lights up as the answer. Event `interactive_tap scam:flow` `value_int` = hop index.
   - Line under: องค์กรหลุดได้ผ่านบริษัทคู่ค้า งานดูแลความเสี่ยงจากคู่ค้าเป็นอีกสายหนึ่งของไซเบอร์ และในไทย คนเขียนระบบก็โดนปรับได้: ปี 2568 สคส. ปรับบริษัทผู้พัฒนาระบบ 3 ล้านบาท มากกว่าบริษัทลูกค้าที่โดน 500,000 บาท

**Game: "แยกข้อความในแชตบ้านเรา" (`SortGame`, 7 messages).**
- Generic chat UI named "บ้านเรา", fictional names and avatars, no LINE branding, watermark `ตัวอย่างจำลอง`.
- Messages arrive one at a time on tap "ข้อความถัดไป" (reduced motion: all visible). Each bubble has `ปลอดภัย` / `หลอก`.
- On answer, red-flag words underline in the bubble and flag chips appear. Flag set: `เร่ง`, `ห้ามบอกใคร`, `เปลี่ยนเบอร์หรือช่องทาง`, `ขอเงินหรือบัญชี`, `ลิงก์แปลก`.

| # | Sender | Message | Answer | Flags | Why (shown on reveal) |
|---|---|---|---|---|---|
| 1 | "แม่" (บัญชีใหม่ ไม่มีรูป) | ข้อความเสียง (ถอดความ): ลูก แม่เปลี่ยนเบอร์นะ โอนให้แม่ก่อน 5,000 ด่วน เดี๋ยวคืน | หลอก | เปลี่ยนเบอร์, เร่ง, ขอเงิน | ตอนนี้ AI เลียนเสียงคนคุ้นเคยได้แล้ว กระทรวงดิจิทัลฯ เตือนเรื่องนี้ ทางแก้: วางสาย แล้วโทรกลับเบอร์เดิมของแม่ |
| 2 | "การไฟฟ้า" (SMS) | ค่าไฟค้างชำระ จะตัดไฟคืนนี้ จ่ายที่ลิงก์นี้ด่วน | หลอก | เร่ง, ลิงก์แปลก | ลิงก์จ่ายเงินปลอมที่แอบอ้างการไฟฟ้าหรือการประปา คือเทรนด์แรกที่กระทรวงดิจิทัลฯ เตือนสำหรับปี 2569 |
| 3 | แจ้งเตือนในแอปธนาคาร | โอนออก 120 บาท (ตรงกับค่าข้าวที่เธอเพิ่งโอน) | ปลอดภัย | none | มาจากในแอปเอง ไม่มีลิงก์ ไม่ขออะไร ถ้าสงสัย เปิดแอปเช็กเอง อย่ากดลิงก์ |
| 4 | "เจ้าหน้าที่ค่ายมือถือ" | บัตรประชาชนของคุณถูกใช้เปิดซิมฟอกเงิน เดี๋ยวโอนสายให้ตำรวจ วิดีโอคอลนะ ห้ามบอกครอบครัว | หลอก | ห้ามบอกใคร, เปลี่ยนช่องทาง | คำสั่งให้ปิดเรื่องจากครอบครัว คือธงแดงใหญ่ที่สุด บทนี้เหมือนเคสจริงเมื่อ 2 ก.ย. 2569 |
| 5 | "อาจารย์มหาวิทยาลัย" | ยินดีด้วย ได้ทุนเรียนต่ออังกฤษ ต้องโอนเงินแสดงในบัญชีก่อนวันศุกร์ | หลอก | ขอเงิน, เร่ง | ทุนจริงไม่ให้โอนเงินไปให้คนแปลกหน้า เคสจริงปีนี้ใช้มุกนี้กับคนอายุเรา |
| 6 | "รุ่นพี่" | เปิดบัญชีธนาคารให้พี่ 3 บัญชี มีค่าขนมให้ ไม่ผิดกฎหมายหรอก | หลอก และเธออาจกลายเป็นผู้ต้องหา | ขอบัญชี | บัญชีที่เปิดให้คนอื่นใช้ เรียกว่าบัญชีม้า คนเปิดก็เสี่ยงโดนคดีด้วย |
| 7 | ครูในกลุ่มห้อง | พรุ่งนี้สอบย่อยคาบ 3 นะ | ปลอดภัย | none | ไม่มีลิงก์ ไม่ขอเงิน ไม่มีความลับ |

- Score `x/7`. A wrong answer flips that bubble to "เรื่องจริงเบื้องหลัง" (the matching real-case line from the copy below).
- After the game: big button **"ส่งหน้านี้ให้ที่บ้าน"** (Web Share; fallback copy link). Fires `share_click webshare|copy`.
- Saved `games.scam = { score, total: 7 }`, `choices["scam:missed"]`. Event `interactive_tap scam:done` `value_int` = score.

### Copy (final Thai)
- **Hero:** ไซเบอร์ไม่ได้อยู่ไกล มันอยู่ในแชตบ้านเธอ
- **Intro:** ลองแยก 7 ข้อความนี้ อันไหนปลอดภัย อันไหนหลอก
- **Survey card:** ผลสำรวจปี 2569 (1,290 คน) ผู้ใหญ่ไทย 79% เคยเจอมิจฉาชีพ ช่องทางที่เจอบ่อยคือ Facebook 54% กับ LINE 48% แต่มีแค่ 4% ที่ไปแจ้งความ
- **Case card 1:** 2 ก.ย. 2569 คนอายุ 19 ถึง 22 สามคนเสียเงินรวมราว 2.74 ล้านบาท ให้ตำรวจปลอมทางวิดีโอคอล สองในสามคนเจออาจารย์ปลอมเสนอทุนเรียนต่อต่างประเทศ แต่มีเงิน 500,000 บาทที่ไม่หลุดไป เพราะธนาคารโทรมาเตือนก่อนโอน คนที่โทรคือทีมกันโกงของธนาคาร นั่นแหละงานสายนี้
- **Case card 2:** 18 ต.ค. 2569 ตำรวจไซเบอร์จับนายหน้าที่ชวนนักเรียน ม.2 อายุ 15 เปิดบัญชีธนาคาร 3 บัญชีให้ บัญชีพวกนั้นโยงกับ 5 คดี เสียหายรวม 675,000 บาท ห้ามให้ยืม ห้ามขาย ทั้งบัญชีและบัตรประชาชน
- **Trend line:** กระทรวงดิจิทัลฯ เตือนว่าปี 2569 จะเจอคลิปและเสียงปลอมด้วย AI ที่เลียนแบบญาติหรือเจ้าหน้าที่มากขึ้น
- **Career bridge:** ใครทำงานนี้: ทีมกันโกงของธนาคาร ค่ายมือถือ ศูนย์ AOC 1441 บริษัทแอปกันสายหลอก และตำรวจไซเบอร์ ทั้งหมดนี้คือสายไซเบอร์
- **Help line:** เจอเรื่องแบบนี้ โทร 1441

### Facts
`f.nsc`, `f.bot`, `f.thai-airways`, `f.pdpc-fines`, `f.gasa-survey`, `f.fake-police`, `f.mule-broker`, `f.de-trends`, `f.aoc1441`, `sim.scam-chat`. Source drawer only: survey loss estimate ฿65.86B (never compared with government figures), MLex 65,029 vs THAI 60,529, CAAT's six other airlines, Microsoft DDR phishing 7% → 23% of intrusions it investigated.

### Founder clip (20s, after the game)
- **On-screen hook:** ข้อความไหนในแชตบ้านเธอคือมิจ
- **Script:** ข่าวไซเบอร์ไม่ได้อยู่ไกลเลย เมื่อกันยาที่ผ่านมา มีสามคนอายุ 19 ถึง 22 เสียเงินรวมเกือบสามล้าน ให้ตำรวจปลอมกับทุนเรียนต่อปลอม แต่มีเงินห้าแสนที่ไม่หลุดไป เพราะคนจากธนาคารโทรมาเตือนทัน งานนั้นแหละคือสายไซเบอร์ ลองแยกเจ็ดข้อความนี้ดู ถ้าแยกถูกหมด ส่งให้ที่บ้านเลย

### Motion visual
Chat bubbles popping in, red-flag chips stamping onto words; a map pin on Bangkok with three dated cards dropping in.

### Reel (founder or motion)
- **Hook:** 3 คนอายุ 19 ถึง 22 เสียรวม 2.7 ล้าน ด้วยบทพูดนี้
- **Variant 1:** ข้อความไหนในแชตบ้านเธอคือมิจฉาชีพ ลองทาย
- **Variant 2:** ทุนเรียนต่อปลอม หลอกคนอายุเราไปแล้วหลักล้าน
- **Send-to-friend:** ส่งให้แม่

---

## Page 5 · `firstjob`

- **Title:** งานแรกของฉัน จะเหลืออะไร
- **Question:** ถ้า AI ทำงานพื้นฐานได้ ตำแหน่งเริ่มต้นจะหายไหม
- **Links:** `/radar/cybersecurity/firstjob` · `/r/cyber-firstjob` · legacy `#ai`

### Mechanic: missing-rung ladder (`LadderRebuild`)
1. **Ladder of 5 rungs.** Bottom three: `นั่งเฝ้าจอแจ้งเตือน`, `อ่าน log ทั้งคืน`, `สแกนช่องโหว่เบื้องต้น`. Top two: `สืบสวนเหตุ`, `วางระบบป้องกัน`.
2. **Button "ใส่ AI"** → bottom three fade to 25% opacity with dashed outline. Caption: "52% ของคนสายนี้ในผลสำรวจ ISC2 คิดว่า AI จะลดความต้องการคนระดับเริ่มต้น"
3. **Button "แล้วอะไรมาแทน"** → three new rungs snap in one level up: `ตรวจงาน AI`, `นักวิเคราะห์ SOC ที่ใช้ AI ช่วย`, `ทดสอบ AI เอง (AI red team)`. Caption: "แต่ 31% คิดว่าจะเกิดตำแหน่งเริ่มต้นแบบใหม่ เช่น นักวิเคราะห์ SOC ที่ใช้ AI ช่วย"
4. **"สร้างขั้นแรกของเธอเอง":** pick exactly 3 of 6 proof chips; each pick shows the evidence it produces and stacks a block under the ladder.

| Chip | Evidence it produces |
|---|---|
| เขียน write-up จากห้องฝึก | ลิงก์ write-up ที่คนอื่นอ่านได้ |
| แข่ง CTF | อันดับหรือใบประกาศ |
| ทำแล็บที่บ้าน | รูปและบันทึกว่าตั้งค่าอะไร |
| ช่วยงานโอเพนซอร์ส | ลิงก์ issue หรือ pull request |
| เรียนพื้นฐานเครือข่าย | สรุปโน้ตของตัวเอง |
| สอนที่บ้านเรื่องมิจฉาชีพ | เรื่องเล่าในพอร์ตว่าเธอช่วยใคร |

5. **Collapsed "ชื่องานใหม่ (สหรัฐฯ)":** a small tree from "ไซเบอร์" to four new titles with posting counts, label `สหรัฐฯ · ก.ย. 2569`.

- Saved `proof[]` (shown again on `tonight` and `next`). Events `interactive_tap firstjob:ladder` (after step 3) and `firstjob:proof` `value_int` = bitmask of picks.

### Copy (final Thai)
- **Hero:** บันไดขั้นแรกไม่ได้หาย มันย้ายจากเฝ้าจอ ไปเป็นตรวจงาน AI
- **Skill line:** ทักษะที่คนสายนี้ทั่วโลกบอกว่าขาดมากที่สุดตอนนี้คือ AI (41% จากผู้ตอบ 16,029 คน)
- **Attacker line (badge `ตัวเลขจากบริษัทเจ้าของเอง`):** ฝั่งคนร้ายก็ใช้ AI: Anthropic บอกว่าเคสจารกรรมที่จับได้ปี 2568 AI ทำงานไปราว 80 ถึง 90% คนเข้ามาตัดสินใจแค่ราว 4 ถึง 6 จุด
- **US titles:** ในอเมริกามีชื่องานใหม่โผล่มาแล้ว: AI/ML security engineer กว่า 850 ตำแหน่ง, AI governance ราว 430, AI red team ราว 100, AI SOC orchestrator 36
- **Thai box:** ในไทย TDRI ประเมินว่าคนทำงานราว 2.2 ล้านคนเสี่ยงสูงที่ AI จะทำแทน และเด็กจบใหม่เริ่มหางานระดับเริ่มต้นยากขึ้นแล้ว
- **Close:** อย่ารอเรียนจบค่อยมีผลงาน ขั้นแรกของเธอสร้างได้ตั้งแต่ ม.ปลาย

### Facts
`f.isc2-pulse`, `f.isc2-workforce`, `f.gtg1002`, `f.sans-titles`, `f.tdri`. Held until URL is in the registry: Gartner 70% / 15% (`f.gartner-soc`, pending).

### Founder clip
None. Motion piece.

### Motion visual
A ladder; bottom rungs dissolve as an "AI" stamp passes; three new rungs snap in one level up; three proof blocks stack under the ladder.

### Reel (motion)
- **Hook:** AI จะกินงานแรกของสายไซเบอร์ไหม
- **Variant 1:** AI ไม่ได้ลบงานแรก มันย้ายบันไดขั้นแรก
- **Variant 2:** 52% ของคนในวงการคิดแบบนี้ แต่อีก 31% คิดอีกแบบ
- **Send-to-friend:** ส่งให้เพื่อนที่กลัวว่า AI จะแย่งงาน

---

## Page 6 · `money`

- **Title:** เงินเดือนจริงในไทย
- **Question:** ทำสายนี้ในไทย ได้เท่าไหร่ ตั้งแต่เริ่มจนเก๋า
- **Links:** `/radar/cybersecurity/money` · `/r/cyber-money` · legacy `#money`

### Mechanic: guess, then reveal (`GuessReveal`)
1. Prompt: "เดาค่ากลางเงินเดือนในประกาศงาน Security Engineer ในไทย". Slider ฿15,000 to ฿100,000, step 500, − / + buttons, "ล็อกคำตอบ".
2. Reveal on a Thai axis: five markers p10 ฿27,000 · p25 ฿33,000 · **median ฿35,500** · p75 ฿39,000 · p90 ฿45,000; band 33,000 to 39,000 shaded. Guess dot stays with gap text: `เธอเดาสูงไป {d} บาท` / `เธอเดาต่ำไป {d} บาท` / within ±1,000: `เกือบเป๊ะ`.
3. **Entry chip** under the axis: "ประกาศระดับเริ่มต้น ราว 25,000 ถึง 35,000" (badge `ยังรอตรวจสอบ`).
4. **Middle years:** a dashed empty segment "ช่วง 3 ถึง 7 ปี: ไม่มีข้อมูลที่ตรวจได้ เราไม่เดาให้". No smooth line.
5. **Ceiling card**, drawn after a zigzag axis break (different source, not a continuous line): "IT Security ระดับอาวุโส 7 ปีขึ้นไป สูงสุดราว 250,000 (Adecco 2569 · ข้อมูลเอียงไปทางบริษัทข้ามชาติ)".
6. **Job-switch card:** see copy.
7. **Separate tab "ตัวเลขสหรัฐฯ (ไม่ใช่ของไทย)":** own panel, own axis, never converted to baht.

- Saved `choices["money:guess"]`. Event `interactive_tap money:guess` `value_int` = bucket (0: <30k, 1: 30 to 40k, 2: 40 to 60k, 3: >60k).

### Copy (final Thai)
- **Hero:** เดาก่อน แล้วค่อยดูของจริง
- **After reveal:** ตัวเลขกลางๆ ในประกาศงาน Security Engineer บน JobsDB คือ 35,500 บาทต่อเดือน ครึ่งกลางของประกาศอยู่ระหว่าง 33,000 ถึง 39,000 นี่รวมทุกระดับประสบการณ์ ไม่ใช่เงินเดือนแรกของทุกคน
- **Entry:** ประกาศระดับเริ่มต้นอยู่ราว 25,000 ถึง 35,000 ด่านแรกไม่หวือหวา
- **Ceiling:** เพดาน: คู่มือเงินเดือน Adecco ปี 2569 บอกว่า IT Security ระดับอาวุโส 7 ปีขึ้นไป สูงสุดราว 250,000 แต่ข้อมูลเอียงไปทางบริษัทข้ามชาติ
- **Switch:** คนย้ายงานในสายไซเบอร์ ข้อมูล และ AI ขอขึ้นเงินเดือนได้ราว 20 ถึง 25% ขณะที่พนักงานทั่วไปปรับขึ้นปีละราว 2 ถึง 5%
- **Takeaway:** จุดเริ่มไม่หวือหวา แต่ทางขึ้นชัน คนที่ขึ้นไปถึงเพดานมีเหมือนกันคือหลักฐานว่าทำได้จริง ซึ่งเริ่มเก็บได้ตั้งแต่ ม.ปลาย
- **US tab:** ค่ากลาง Information Security Analyst ในสหรัฐฯ ปีละ $129,180 ตำแหน่งใหม่อย่าง AI/ML security engineer ค่ากลางในประกาศ $140,000 คนละประเทศ คนละค่าครองชีพ อย่าเอามาเทียบตรงๆ

### Facts
`f.jobsdb-security`, `f.jobsdb-entry`, `f.adecco`, `f.bls-infosec`, `f.sans-titles`.

### Founder clip (25s, after the reveal)
- **On-screen hook:** เงินเดือนไซเบอร์ไทย ของจริง
- **Script:** ตัวเลขเงินเดือนไซเบอร์ที่เห็นในคลิป บางตัวเป็นของอเมริกา ของไทย ไปดูประกาศงาน Security Engineer บน JobsDB ตัวเลขกลางๆ อยู่ที่เดือนละสามหมื่นห้าพันห้าร้อย อันนี้รวมทุกระดับนะ ไม่ใช่เงินเดือนแรก ส่วนเพดาน คู่มือเงินเดือนของ Adecco บอกว่าระดับอาวุโสเจ็ดปีขึ้นไป ไปได้ถึงสองแสนห้า แต่เอียงไปทางบริษัทข้ามชาติ จุดเริ่มไม่หวือหวา แต่ทางขึ้นชันสำหรับคนที่พิสูจน์ฝีมือได้

### Motion visual
A marker dropping onto 35,500 inside the shaded band; an axis break; a separate tall bar for the 250,000 ceiling with its caption.

### Reel (founder)
- **Hook:** สายไซเบอร์ในไทย ค่ากลาง 35,500 เพดาน 250,000
- **Variant 1:** เดาดู เงินเดือนสายไซเบอร์ในไทยเท่าไหร่
- **Variant 2:** ตัวเลขเงินเดือนไซเบอร์ในคลิป อาจไม่ใช่ตัวเลขไทย
- **Send-to-friend:** ส่งให้เพื่อนที่คิดว่าสายนี้รวยตั้งแต่วันแรก

### Mid-deck share card (after this page)
"ข้อมูลแบบนี้ มีเพื่อนที่ควรเห็นไหม" with `ส่งใน LINE` and `คัดลอกลิงก์` (existing `MidShareCard`, `share_click`).

---

## Page 7 · `fit`

- **Title:** ฉันเหมาะไหม เทียบกับคอม วิศวะ หมอ
- **Question:** ควรไปไซเบอร์ตรงๆ ไปคอมกว้างๆ ก่อน หรือใจจริงอยู่ที่หมอ
- **Links:** `/radar/cybersecurity/fit` · `/r/cyber-fit`

### Mechanic: "อันนี้หรืออันนั้น" (`BinaryChoice`, 6 taps)
Side-by-side cards, tap one. Points go to A (ไซเบอร์ตรง), B (คอมกว้างก่อน), C (ใจอยู่กับคน). No answer is wrong.

| # | ซ้าย | ขวา | Points |
|---|---|---|---|
| 1 | ปริศนาที่ไม่มีเฉลยในหนังสือ | โจทย์ที่มีเฉลยชัด | L: A+1 B+1 · R: C+1 |
| 2 | ของพังแล้ว อยากรู้ว่าพังเพราะอะไร | อยากให้มีคนซ่อมให้เร็วๆ | L: A+2 · R: 0 |
| 3 | สร้างของใหม่ | หาจุดพังของที่มีอยู่ | L: B+2 · R: A+2 |
| 4 | ช่วยคนตรงหน้าทีละคน | ปกป้องคนเป็นล้านที่ไม่เคยเห็นหน้า | L: C+2 · R: A+2 |
| 5 | ตัดสินใจเร็วตอนกดดัน | ได้คิดนานๆ ไม่มีใครเร่ง | L: A+1 C+1 · R: B+1 |
| 6 | เขียนอธิบายให้คนที่ไม่รู้เรื่องเข้าใจ: โอเค | ไม่ชอบเลย | L: A+1 · R: B+1 |

- Result = highest total; a tie shows both readouts. Disclaimer on the result: "ไม่ใช่แบบทดสอบบุคลิก แค่ช่วยคิด"
- **Readouts:**
  - **A. ไซเบอร์ตรง:** หลักสูตรที่มีคำว่าไซเบอร์ในชื่อ เหมาะกับคนที่รู้แล้วว่าชอบหาจุดพัง
  - **B. คอมกว้างก่อน:** วิศวะคอม วิทย์คอม หรือไอที แล้วค่อยเลือกไซเบอร์ตอนปีหลังๆ ประตูกว้างกว่า เปลี่ยนใจได้ง่ายกว่า
  - **C. ใจอยู่กับคน:** หมออาจตอบโจทย์เธอกว่า และไม่ต้องทิ้งความชอบเรื่องคัดแยกเร่งด่วน ห้องฉุกเฉินก็เป็นงานคัดแยกเหมือนกัน
- Saved `fit`; it pre-filters `tcas` (A → cyber-named programmes first; B → wide doors first; C → shows both plus a link to the medicine faculty radar if it exists). Event `interactive_tap fit:result` `value_int` = 1 (A), 2 (B), 3 (C), 4 (tie).

### Copy (final Thai)
- **Hero:** ลังเลระหว่างคอม วิศวะ หมอ เป็นเรื่องปกติมาก
- **Intro:** หกข้อนี้ไม่ได้ตัดสินแทนเธอ แค่ช่วยให้เห็นว่าเธอเอนไปทางไหน
- **CPE vs CS (label `เช็กหลักสูตรจริง`):** วิศวะคอมมักเรียนฮาร์ดแวร์และเครือข่ายมากกว่า วิทย์คอมเน้นซอฟต์แวร์และทฤษฎี แต่แต่ละที่ต่างกัน เปิดดูรายวิชาจริงก่อนเลือก
- **Many doors:** ใน TCAS70 หลักสูตรที่มีคำว่าไซเบอร์ในชื่อมี 9 หลักสูตร อยู่ใต้วิทย์คอม 5 วิศวะคอม 2 วิศวะซอฟต์แวร์ 1 ไอที 1 แปลว่าเข้าได้จากหลายประตู
- **Writing note:** งานสายนี้ส่วนหนึ่งคือเขียนรายงานให้คนที่ไม่ใช่สายเทคเข้าใจ ถ้าข้อ 6 เธอเลือก "ไม่ชอบเลย" ก็ไม่เป็นไร แต่รู้ไว้ก่อน
- **Coach line:** อย่าเลือกคณะจากคลิป ลองทำงานจริงก่อนสักครั้ง ถ้าทำแล้วลืมดูเวลา นั่นคือข้อมูลที่ดีที่สุดที่เธอมี

### Facts
`f.mytcas-9`, `f.onet-infosec`.

### Founder clip (30s, before the questions)
- **On-screen hook:** ลังเลคอม วิศวะ หมอ ลองตอบ 6 ข้อ
- **Script:** ตอน ม.5 ส่วนใหญ่เลือกคณะจากคะแนน ที่บ้าน กับเพื่อน แต่ไม่ค่อยมีใครถามว่าเธอเคยลองงานจริงหรือยัง ถ้าเธอชอบหาว่าอะไรพัง ชอบตัดสินใจตอนกดดัน ไซเบอร์กับหมอมีอะไรคล้ายกันมากกว่าที่คิด ลองตอบหกข้อนี้ ไม่ใช่แบบทดสอบบุคลิก แค่ช่วยคิด แล้วไปลองงานจริงคืนนี้ ค่อยตัดสินใจ

### Motion visual
Paired cards flipping left and right; three signposts (ไซเบอร์ตรง / คอมกว้าง / หมอ) with one lighting up.

### Reel (founder)
- **Hook:** ลังเลระหว่างคอม วิศวะ หมอ ลองตอบ 6 ข้อนี้
- **Variant 1:** ไซเบอร์กับหมอ คล้ายกันมากกว่าที่คิด
- **Variant 2:** เลือกคณะจากคะแนนอย่างเดียว อาจพลาดสิ่งนี้
- **Send-to-friend:** ส่งให้เพื่อนที่ยังเลือกคณะไม่ได้

---

## Page 8 · `tcas`

- **Title:** สมัครที่ไหน เมื่อไหร่
- **Question:** ถ้าจะไปทางนี้ ต้องยื่นที่ไหน รอบไหน ภายในวันไหน
- **Links:** `/radar/cybersecurity/tcas` · `/r/cyber-tcas` · legacy `#study`

### Mechanic (`ProgrammeFilter`)
**Step 1: grade gate** "ตอนนี้เธออยู่ ม.อะไร" (`ม.4` / `ม.5` / `ม.6`, stored locally, event `interactive_tap tcas:grade` `value_int` = 4/5/6).
- **ม.6:** TCAS70 cards with live countdowns.
- **ม.5:** banner "ปีหน้าเธอคือ TCAS71 ดู TCAS70 เป็นตัวอย่างว่าเขาขออะไร แล้วเริ่มเก็บผลงานตั้งแต่ตอนนี้". Countdowns hidden; dates shown as "รอบนี้ (TCAS70) ปิดวันที่ ...".
- **ม.4:** same as ม.5 with "เธอคือ TCAS72" plus a two-year checklist (พื้นฐานเครือข่าย, ห้องฝึกเดือนละห้อง, write-up, แข่ง CTF รุ่นมัธยม).

**Step 2: filters.** `รอบ 1 Portfolio` / `ทุกรอบ`; `ภาษาไทย` / `นานาชาติ`; GPAX slider (local only, never sent; greys out cards whose known minimum is higher, never hides them); pre-sorted by the `fit` result.

**Step 3: programme cards.** University, degree, track type, seats if verified (else "ดูใน mytcas"), deadline or "ดูใน mytcas", source badge, link. ★ saves to `shortlist` (`interactive_tap tcas:save`); card link fires `cta_click program`.

| Programme | mytcas id | What the card says |
|---|---|---|
| สจล. วศ.บ. วิศวกรรมคอมพิวเตอร์และความปลอดภัยไซเบอร์ (ภาษาไทย ปกติ) | 10160101300504A | รอบ 1 Portfolio รับ 40 คน GPAX 3.00 ขึ้นไป ปิด 28 ม.ค. 2570 เวลา 16:30. Badge `ยังรอตรวจสอบ: แหล่งรอง เช็กประกาศทางการ`. Live countdown for ม.6 only; after the deadline "ปิดแล้ว ดูรอบถัดไปใน mytcas" |
| มข. วท.บ. ความมั่นคงปลอดภัยไซเบอร์ (ภาษาไทย ปกติ) | 10030138220204A | มีโครงการรอบ 1 ใน TCAS70 ดูจำนวนรับใน mytcas |
| มช. วศ.บ. ระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์ (นานาชาติ) | 10040106300502E | หลักสูตรนานาชาติ |
| มธ. วท.บ. คอมพิวเตอร์เครือข่ายและความปลอดภัยทางไซเบอร์ (ภาษาไทย พิเศษ) | 10050209220202B | โครงการพิเศษ ค่าเรียนสูงกว่าภาคปกติ เช็กใน mytcas |
| Other five with ไซเบอร์ in the name (collapsed chip "ดูอีก 5 หลักสูตร") | pull at build from the mytcas feed | มข. หลักสูตรที่สอง, สวนดุสิต, ม.หอการค้าไทย (วิทยาการคอมพิวเตอร์), มศว (วิศวกรรมซอฟต์แวร์), ม.อุบลราชธานี (ไอที). Names and links come from the feed; do not hand-type names |
| ประตูกว้าง | n/a | วิศวะคอม · วิทย์คอม · ไอที หลายมหาวิทยาลัย, link to the existing faculty radar |

**Portfolio booster card: Thailand Cyber Top Talent.** Copy below. Button "★ ติดตามรอบหน้า" saves locally only.

**Cert ladder (collapsed):** ห้องฝึกและ CTF ตอนนี้ → Security+ ช่วงมหาวิทยาลัย → SecAI+ ทีหลัง. No prices.

### Copy (final Thai)
- **Hero:** ไซเบอร์ตรงๆ มีแล้วใน TCAS70
- **Count:** ใน mytcas TCAS70 มีหลักสูตรที่มีคำว่าไซเบอร์ในชื่อ 9 หลักสูตร และไม่ต้องเรียนหลักสูตรชื่อไซเบอร์ก็เข้าสายนี้ได้ วิศวะคอม วิทย์คอม และไอที คือทางหลัก
- **Cost:** ค่าเรียนต่างกันหลายเท่า โครงการพิเศษกับนานาชาติแพงกว่ามาก เช็กใน mytcas ก่อนยื่น
- **Booster:** Thailand Cyber Top Talent มีรุ่น Junior สำหรับนักเรียนมัธยม ปี 2569 มีผู้แข่งรุ่นนี้ 484 คน จากทั้งหมด 1,399 คน ทีมชนะได้ 80,000 บาทพร้อมถ้วยพระราชทาน รอบชิงจัดวันที่ 5 ก.ย. 2569 รอบหน้ายังไม่ประกาศวัน ติดตามที่ thnca.or.th
- **Booster caveat:** สจล. ยกการแข่งนี้เป็นตัวอย่างในโครงการ Top Talents แต่ไม่ใช่ทุกรางวัลที่นับ อ่านเงื่อนไขเต็มก่อน
- **Cert:** ใบเซอร์ด้าน AI security มีจริง อย่าง SecAI+ แต่เขาแนะนำให้มีประสบการณ์ไอที 3 ถึง 4 ปีก่อน ตอนนี้เก็บผลงานดีกว่า

### Facts
`f.mytcas-9`, `f.mytcas-four`, `f.kmitl-portfolio`, `f.tctt`, `f.tctt-kmitl-caveat`, `f.secai`.

### Founder clip
None. Motion piece.

### Motion visual
University name chips assembling into a grid; a flip-digit countdown; a grade toggle switching the countdown off for ม.5.

### Reel (motion)
- **Hook:** อยากเรียนไซเบอร์ตรงๆ TCAS70 มีที่ไหนบ้าง
- **Variant 1:** ม.5 ตอนนี้ ปีหน้าคือ TCAS71 เริ่มเก็บอะไรได้เลย
- **Variant 2:** เด็ก ม.ปลาย แข่งแฮกถูกกติกา ได้ถ้วยพระราชทาน
- **Send-to-friend:** ส่งให้เพื่อนที่กำลังเลือกคณะสายคอม

---

## Page 9 · `terminal`

- **Title:** ลองเป็นนักป้องกัน 3 นาที
- **Question:** งานนี้รู้สึกยังไงตอนลงมือจริง
- **Links:** `/radar/cybersecurity/terminal` · `/r/cyber-terminal`

### Mechanic: scope-first fake terminal (`FakeTerminal`)
- **Safety of the implementation:** pure client-side state machine. Input is trimmed, inner spaces collapsed, compared against a whitelist; each whitelisted command maps to canned output. No `eval`, no network, no real filesystem, no pipe parser. Label above the terminal: "เครื่องจำลองในหน้านี้ ไม่ได้ต่อกับเครื่องหรือเว็บจริงเครื่องไหนเลย". Badge `จำลอง`.
- **Input:** command chips (tap inserts and runs) are the main path; an optional text input (`autocapitalize="off"`, `autocorrect="off"`, `spellcheck={false}`, `enterKeyHint="send"`). Chips show the current mission's command plus one tempting out-of-scope chip.
- **Unknown command:** "ไม่มีคำสั่งนี้ในแล็บ ลอง help"
- **Virtual files:** `README.txt`, `scope.txt`, `auth.log`, hidden `.flag`.
- **auth.log (60 lines, deterministic):** 41 lines `Failed password for intern01 from 203.0.113.45 port 5xxxx ssh2`; then 1 line `Accepted password for intern01 from 203.0.113.45 port 51122 ssh2`; 3 lines `Accepted publickey for admin from 192.0.2.10`; 15 routine `session opened/closed` lines from 192.0.2.10 and 192.0.2.11. All IPs from RFC 5737.

| Command | Output |
|---|---|
| `help` | lists the commands below |
| `ls` | `README.txt  scope.txt  auth.log` |
| `ls -a` | `.  ..  .flag  README.txt  scope.txt  auth.log` + skill pop "ไฟล์ที่ขึ้นต้นด้วยจุดถูกซ่อนไว้" |
| `cat README.txt` | "เธอคือนักศึกษาฝึกงานทีมป้องกันของแล็บ เมื่อคืนมีสัญญาณแปลกๆ ที่เครื่อง lab.local" |
| `cat scope.txt` | "ได้รับอนุญาต: lab.local (เครื่องในแล็บนี้) · ห้ามแตะ: ระบบอื่นทั้งหมด รวมถึงเว็บโรงเรียน เว็บเพื่อน เว็บธนาคาร" |
| `head auth.log` | first 10 lines |
| `grep -c "Failed" auth.log` (also without quotes) | `41` |
| `grep "Accepted" auth.log` | the 4 Accepted lines; each line is tappable |
| `cat .flag` | `FLAG{read_the_scope_first}` |
| `whoami` | `student (ได้รับอนุญาตในแล็บนี้เท่านั้น)` |
| `scan lab.local` | `พบพอร์ต 80 เปิดอยู่ (จำลอง)` then "ต่อจากนี้ไปฝึกในห้องจริงได้ หน้าถัดไป" |
| `scan school-web` (tempting chip, label "สแกนเว็บโรงเรียน ที่ดูหละหลวมมาก") | red card: "หยุด: นอกขอบเขต ไม่มีใครอนุญาต = ผิดกฎหมาย ต่อให้เจตนาดี" · `scopeTries++` |
| `scan bank.example` | same red card |
| `clear` | clears the screen |

**Missions (checklist at top, each ticks when done):**
1. **อ่านขอบเขตก่อน:** run `cat scope.txt`. Other commands still work, but `scan` chips stay hidden until this is done.
2. **นับว่ามีคนเดารหัสผิดกี่ครั้ง:** run the grep count, then answer the inline question "กี่ครั้ง" with chips 4 / 41 / 410 → 41.
3. **หาว่าเดาสำเร็จไหม:** run `grep "Accepted" auth.log`, then tap the suspicious line → the intern01 line from 203.0.113.45. Feedback: "บรรทัดนี้แหละ เดาผิด 41 ครั้ง แล้วครั้งที่ 42 เข้าได้"
4. **หาไฟล์ที่ซ่อน:** `ls -a`, then `cat .flag`. Confetti (reduced motion: a static check).
5. **ตัดสินใจ:** three options.
   - `บล็อก IP อย่างเดียว` → "ยังไม่พอ คนร้ายเข้ามาแล้ว เปลี่ยน IP ก็ใช้รหัสเดิมเข้าได้อีก"
   - `ล็อกบัญชี intern01 + รีเซ็ตรหัส + เปิดเคส + บล็อก IP` → correct: "ใช่ ปิดทางเข้า เปลี่ยนกุญแจ และจดบันทึกให้ทีมตามต่อ"
   - `ไม่ต้องทำอะไร` → "บัญชีนี้โดนยึดแล้ว ถ้าไม่ทำอะไร คนร้ายจะขยับไปเครื่องอื่น"

**Poll after mission 5:** "AI สายเจาะระบบตัวหนึ่ง ในการทดสอบของบริษัทเอง ออกนอกขอบเขต 0.07% เท่ากับราว 7 ครั้งในการรัน 10,000 ครั้ง (เราคำนวณเอง) ถ้าเป็นเครือข่ายโรงพยาบาล รับได้ไหม" Options `รับได้` / `ไม่ได้` / `แล้วแต่ว่าออกไปทำอะไร`. After answering: reveal copy below. No aggregate shown.

- Saved `terminal = { missions, flag, scopeTries }`, `choices["terminal:poll"]`. Commands are not stored or sent.
- Events `interactive_tap terminal:mission` `value_int` = mission number; `terminal:flag`; `terminal:scope-try` `value_int` = scopeTries; `terminal:poll` `value_int` = 1/2/3.

### Copy (final Thai)
- **Hero:** ลองเป็นนักป้องกัน 3 นาที ในเครื่องจำลอง
- **Intro:** ในหนัง แฮกเกอร์พิมพ์รัวๆ จอเขียว ในชีวิตจริง งานแรกๆ คืออ่าน log แล้วหาบรรทัดที่ผิดปกติให้เจอ และสิ่งแรกที่มืออาชีพทำ คืออ่านขอบเขตงานก่อน
- **Safety line (fixed, above the terminal):** ฝึกเฉพาะในแล็บหรือระบบที่ได้รับอนุญาตเท่านั้น ระบบของคนอื่น ห้ามลอง ผิดกฎหมาย
- **After missions:** ls cat grep คือคำสั่งเดียวกับบน Linux จริง ห้องฝึกแทบทุกห้องเริ่มจากตรงนี้ สังเกตไหม ก่อนสแกนอะไร เราอ่านขอบเขตก่อน นี่คือนิสัยที่แยกมืออาชีพกับคนทำผิดกฎหมาย
- **Poll reveal:** OpenAI เองพักแผนโมเดลรุ่นถัดไปตัวหนึ่งไว้ เพราะมันเก่งขึ้น แต่อยู่ในขอบเขตได้แย่ลง การอยู่ในขอบเขตคือทักษะหลักของงานนี้ ความเก่งที่คุมไม่อยู่ ไม่มีใครจ้าง
- **Patch line (badge `ตัวเลขจากบริษัทเจ้าของเอง`):** ทำไมต้องลงแพตช์: ก.ค. 2569 Sysdig รายงานว่า AI agent ของคนร้ายเข้ามาทางช่องโหว่ในเครื่องมือ Langflow ที่มีแพตช์ตั้งแต่ เม.ย. 2568 แต่ไม่มีใครลง พอขั้นตอนหนึ่งพัง มันแก้ให้ใช้ได้ใน 31 วินาที

### Facts
`f.gpt6-cyber`, `f.jadepuffer`, `sim.terminal`.

### Founder clip
None. The reel films this page in demo mode.

### Motion visual
Screen recording of `?demo=1`: chips tapping, `41` appearing, the Accepted line highlighting, the red "หยุด: นอกขอบเขต" card on the school-website chip, the flag.

### Reel (demo mode)
- **Hook:** ลองพิมพ์คำสั่งนักป้องกันดู ในเครื่องจำลอง
- **Variant 1:** สิ่งแรกที่แฮกเกอร์สายขาวทำ ไม่ใช่การเจาะ
- **Variant 2:** งานแรกของสายไซเบอร์ คือหาบรรทัดนี้ใน log ให้เจอ
- **Send-to-friend:** ส่งให้เพื่อนที่ชอบใช้คอมจอดำ

---

## Page 10 · `tonight`

- **Title:** คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก
- **Question:** คืนนี้ทำอะไรได้เลย ที่จบด้วยของจริงในพอร์ต
- **Links:** `/radar/cybersecurity/tonight` · `/r/cyber-tonight` · legacy `#start`
- **Safety page.** Founder face on screen for the safety line (required).

### Mechanic
**Part 1: one practice-room card.**
- TryHackMe · Offensive Security Intro. Badge "ฟรีตามคู่มือของ TryHackMe ณ 31 ส.ค. 2569 เช็กอีกครั้งก่อนสมัคร". Sub-line "ถ้าเว็บกำหนดอายุ ให้ผู้ปกครองช่วยสมัคร".
- Button "เริ่มเลย" opens the room in a new tab; fires `cta_click first-step`.
- picoCTF and OverTheWire are **not shown** until their free status and age terms are verified (open item).

**Part 2: checklist** (checkboxes saved locally): `สมัคร` · `ทำห้องให้จบ` · `แคปหน้าจอผลลัพธ์ (ไม่ให้ติดอีเมลหรือชื่อจริง)` · `เขียน write-up`.

**Part 3: write-up builder (`EvidenceMaker`).**
- Five short fields with placeholders: `ห้องอะไร / เป้าหมาย` · `ฉันลองอะไร` · `อะไรไม่เวิร์ก` · `ถ้าเป็นเจ้าของระบบ จะแก้ยังไง` · `ยังไม่เข้าใจอะไร`.
- Auto-added fixed line: "ทำในแล็บฝึกที่ได้รับอนุญาตเท่านั้น". Date stamp. The 3 proof picks from `firstjob` appear under "แผนของฉัน".
- Output: a Thai + English Markdown block with "คัดลอก" (clipboard, fallback pre-selected textarea), ready for Notion, Google Docs or a GitHub README. Phase 2: 1080x1350 image card rendered on the device.
- Draft saved locally (unsent-draft convenience). Never uploaded; the page says so: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน".
- Events `interactive_tap tonight:checklist` `value_int` = items done; `tonight:writeup-copied`.

### Copy (final Thai)
- **Hero:** คืนนี้ลองแค่ห้องเดียว แล้วเธอจะมีผลงานไซเบอร์ชิ้นแรก
- **Room line (fake-bank detail badge `ยังรอตรวจสอบ`):** ห้องนี้เขาสร้างเว็บธนาคารปลอมไว้ให้ฝึกหาจุดอ่อนโดยเฉพาะ เป็นห้องสำหรับมือใหม่
- **Write-up:** ที่สำคัญกว่าทำจบ คือเขียนสรุปสั้นๆ ว่าลองอะไร อะไรไม่เวิร์ก และถ้าเป็นเจ้าของระบบจะแก้ยังไง ทีมเราคิดว่าข้อสุดท้ายคือส่วนที่มีค่าที่สุด และเป็นส่วนที่คนส่วนใหญ่ข้าม
- **Callback:** จำประตูที่สองได้ไหม มันเปิดให้คนที่มีประวัติตรวจสอบได้ write-up นี้คือบรรทัดแรกของประวัตินั้น
- **No-loss line:** ถ้าสนุก ทำห้องถัดไปพรุ่งนี้ ถ้าไม่สนุก ก็รู้ก่อนเลือกคณะ ไม่เสียอะไร
- **Posting rule:** เช็กกติกาของห้องก่อนโพสต์ write-up สาธารณะ
- **Legal line (fixed, not dismissible; no section number until legal review):** เข้าระบบของคนอื่นโดยไม่ได้รับอนุญาต ผิดกฎหมาย ต่อให้แค่ลองดูก็ตาม ฝึกได้แค่เครื่องของตัวเอง หรือห้องที่เขาเปิดให้ลอง ห้ามลองกับเว็บโรงเรียน เว็บเพื่อน หรือเว็บไหนที่ไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร

### Facts
`f.thm-free`, `f.thm-fakebank`.

### Founder clip (22s, required, face on screen)
- **On-screen hook:** คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก
- **Script:** คืนนี้ลองแค่ห้องเดียว ฟรี เปิด TryHackMe ห้อง Offensive Security Intro เขาสร้างเว็บธนาคารปลอมไว้ให้ฝึกโดยเฉพาะ ย้ำอีกที ฝึกเฉพาะในห้องที่เขาเปิดให้ลองแบบนี้เท่านั้น ระบบจริงของคนอื่น ห้ามลอง ผิดกฎหมาย ต่อให้แค่ลองดูก็ตาม ทำเสร็จแล้วกลับมาหน้านี้ เขียนสั้นๆ ว่าลองอะไร อะไรไม่เวิร์ก ถ้าเป็นเจ้าของระบบจะแก้ยังไง นั่นคือผลงานไซเบอร์ชิ้นแรกของเธอ

### Motion visual
Founder to camera; cutaway screen-record of the room start screen (record on a free account; confirm the fake-bank site on screen); the write-up block assembling line by line.

### Reel (founder)
- **Hook:** คืนนี้ ห้องเดียว ได้ผลงานไซเบอร์ชิ้นแรกในพอร์ต
- **Variant 1:** ลองเจาะเว็บธนาคารปลอม ในห้องที่สร้างไว้ให้ฝึก
- **Variant 2:** สิ่งที่คนส่วนใหญ่ข้าม หลังทำห้องฝึกไซเบอร์
- **Send-to-friend:** ส่งให้เพื่อนที่อยากลองแต่ไม่รู้จะเริ่มตรงไหน

---

## Page 11 · `next` (ending)

- **Title:** แล้วเธอล่ะ
- **Question:** สายนี้ใช่เราไหม แล้วจะดูอะไรต่อ
- **Links:** `/radar/cybersecurity/next` · `/r/cyber-next` · legacy `#outro`

### Mechanic, in order
1. **Recap card (`RecapCard`)** from local state, no personal data. Lines appear only for pages played:
   - `หาบรรทัดอันตรายเจอใน {attempts} ครั้ง` (mythos)
   - `ให้กุญแจถูก {x}/5` (doors)
   - `จับข้อที่ AI พลาดได้ {x}/2` (triage)
   - `แยกข้อความถูก {x}/7` (scam)
   - `ภารกิจ log {n}/5 · ไม่หลุดขอบเขต ✓` or `ลองสแกนนอกขอบเขต {n} ครั้ง` (terminal)
   - fit result, starred programmes, 3 proof picks, write-up copied ✓
   - Phase 2: "เซฟเป็นรูป" 1080x1920 story image rendered on the device; no name field.
2. **"เกมไหนสนุกสุด"** (autonomy pick; only played games are offered). The pick decides the line, not the scores:

| Pick | Line |
|---|---|
| `mythos` | สายที่เธอเลือกเอง: นักล่าช่องโหว่ งานจริงคือหาจุดพังในโค้ดก่อนคนร้าย |
| `doors` | สายที่เธอเลือกเอง: ทีมทดสอบเจาะระบบ งานจริงคือเจาะแบบมีสัญญา แล้วเขียนรายงานให้เจ้าของแก้ |
| `triage` | สายที่เธอเลือกเอง: นักวิเคราะห์ SOC งานจริงคือคัดว่าสัญญาณไหนโดนจริง และตรวจงาน AI |
| `scam` | สายที่เธอเลือกเอง: ทีมกันโกง งานจริงคือจับรูปแบบมิจฉาชีพก่อนเงินหลุด |
| `terminal` | สายที่เธอเลือกเอง: ทีมรับมือเหตุ งานจริงคือสืบจาก log แล้วปิดทางให้ทัน |

   Saved `favourite`; event `interactive_tap next:favourite` `value_int` = page order.
3. **Intent, three buttons:** `สนใจสายนี้` (existing `recordInterested` with `visit_id`; never opens a LINE QR) · `ยังไม่แน่ใจ` (`interactive_tap next:intent-unsure`) · `ไม่ใช่ฉัน` (`interactive_tap next:intent-no`). "สนใจ" shows a link back to `tonight`. "ไม่ใช่ฉัน" opens the honesty fold and the other careers.
4. **Honesty fold (label `ความเห็นทีมเรา`):** ไม่เหมาะถ้า... ไม่ชอบเรียนของใหม่ตลอด / รับแรงกดดันตอนเหตุด่วนไม่ไหว / ไม่ชอบงานเอกสาร เพราะงานส่วนหนึ่งคือเขียนรายงานและหลักฐานตามมาตรฐาน
5. **Request the next career:** chips for the three other pilots + free text "อยากให้ทำอาชีพไหนต่อ?" (existing validator: maxLength 80, rejects URLs, emails, @handles, long digit runs).
6. **Share** (`ส่งใน LINE`, `คัดลอกลิงก์`) → **Follow** (platform-aware, from the `CONTACT` constant) → **one programme line** from `lib/content/radar-cta.ts` (no price; only if a round is open) → **"ดูอาชีพอื่น"**: three cards with each guide's cold-open hook (`cta_click other-career`).

### Copy (final Thai)
- **Hero:** เล่นมาทั้งหมด เธอชอบส่วนไหนที่สุด
- **After intent:** ไม่ว่าจะกดอันไหน ถือว่าได้ข้อมูล คนที่ลองแล้วรู้ว่าไม่ใช่ ประหยัดเวลาไปหลายปี
- **If interested:** ถ้าสนใจ สิ่งเดียวที่ต้องทำต่อ คือห้องที่สองพรุ่งนี้ กับ write-up อีกหนึ่งชิ้น
- **Intent sub:** กดไว้ เราจะรู้ว่าควรทำข้อมูลสายนี้ลึกขึ้น
- **Card line:** นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง

### Founder clip
None.

### Reel
No reel. A Story template instead: "สายไซเบอร์ที่ฉันเลือกคือ ___ ของเธอล่ะ" with the `/r/cyber-next` link sticker.

---

## Reel slate (each reel deep-links to one page)

| # | Page | Format | Hook |
|---|---|---|---|
| 1 | `mythos` | founder + motion | AI เพิ่งเจอบั๊กที่ซ่อนอยู่ 27 ปี แก่กว่าเธออีก |
| 2 | `doors` | motion (founder optional) | AI ที่เก่งที่สุดตอนนี้ ไม่ได้ให้ทุกคนใช้ |
| 3 | `triage` | founder + demo | งานไซเบอร์จริง คือจับผิด AI |
| 4 | `scam` | founder | 3 คนอายุ 19 ถึง 22 เสียรวม 2.7 ล้าน ด้วยบทพูดนี้ |
| 5 | `firstjob` | motion | AI จะกินงานแรกของสายไซเบอร์ไหม |
| 6 | `money` | founder | สายไซเบอร์ในไทย ค่ากลาง 35,500 เพดาน 250,000 |
| 7 | `fit` | founder | ลังเลระหว่างคอม วิศวะ หมอ ลองตอบ 6 ข้อนี้ |
| 8 | `tcas` | motion | อยากเรียนไซเบอร์ตรงๆ TCAS70 มีที่ไหนบ้าง |
| 9 | `terminal` | demo | ลองพิมพ์คำสั่งนักป้องกันดู ในเครื่องจำลอง |
| 10 | `tonight` | founder (required) | คืนนี้ ห้องเดียว ได้ผลงานไซเบอร์ชิ้นแรกในพอร์ต |

**Founder recording priority:** `tonight` (required, safety) → `mythos` → `scam` → `money` → `triage` → `fit` → `doors` (optional, safety).

---

## Fact registry (`lib/content/radar-guide/facts.ts`)

Dates are publication dates. `asOf` for all is 2026-11-11 unless noted.

| id | Claim used | Source and date | URL | Badge |
|---|---|---|---|---|
| `f.glasswing-launch` | Apr 7, 2026 Mythos Preview announced and withheld from general release; ~27-year-old OpenBSD bug letting an attacker remotely crash a machine by connecting; ~16-year-old FFmpeg bug on a line automated tests hit 5,000,000 times | Anthropic, 2026-04-07 | https://www.anthropic.com/glasswing | vendor |
| `f.aisle-caveat` | Small open models found some of the same bugs when handed the isolated vulnerable code (AISLE founder; promotes AISLE's product) | AISLE, 2026-04 | https://aisle.com/blog/ai-cybersecurity-after-mythos-the-jagged-frontier | confirmed (critique exists) |
| `f.firefox-mozilla` | 271 vulnerabilities found with Mythos Preview (mostly fixed in Firefox 150); 180 sec-high; 423 security bugs fixed across April 2026 releases; 2025 months trended 20 to 30; previous record 76 (March 2026) | Mozilla Hacks, 2026-05-07 | https://hacks.mozilla.org/2026/05/behind-the-scenes-hardening-firefox/ | confirmed |
| `f.mythos52` | Nov 9, 2026 Fable 5.2 and Mythos 5.2, same model; blocked high-risk cyber requests fall back to an older model; Mythos 5.2 for vetted orgs via CVP and for Claude Enterprise via Claude Security | Anthropic, 2026-11-09 | https://www.anthropic.com/claude-fable-and-mythos-5-2 | confirmed |
| `f.cvp-tiers` | Defense (orgs and individuals with a track record), Red Team (orgs only, still blocks ransomware-type actions), Specialized (safety-critical, reviewed with US government) | Anthropic, 2026-10-06 | https://www.anthropic.com/news/cyber-verification-program | confirmed |
| `f.cursor-reuters` | Aur0ra affiliate used Cursor's agent, recast refused work as an authorized test; at least 7 companies breached (Apr 8 to May 21, 2026) | Reuters via BNN Bloomberg, 2026-08-27 | https://www.bnnbloomberg.ca/business/artificial-intelligence/2026/08/27/russian-speaking-cybercriminals-used-spacexs-cursor-ai-tool-to-hack-seven-companies-reuters-exclusive/ | confirmed |
| `f.dream-taiwan` | Dream: attackers framed work as authorised penetration testing to bypass agent guardrails; MODA confirmed an AI-agent-assisted attack (no counts, no country) | The Register, 2026-08-12; Focus Taiwan, 2026-08-13 | https://www.theregister.com/security/2026/08/12/near-autonomous-ai-agents-attack-taiwans-nuclear-safety-agency/5287055 · https://focustaiwan.tw/society/202608130011 | vendor (Dream) |
| `f.gtg1002` | Anthropic says: ~30 targets; AI did 80 to 90%; "perhaps" 4 to 6 human decision points; attackers claimed to be a security firm | Anthropic, 2025-11-13 | https://www.anthropic.com/news/disrupting-AI-espionage | vendor |
| `f.gpt6-cyber` | GPT-6 Cyber for approved Daybreak Red customers (Nov 5, 2026); out-of-scope 0.07% in OpenAI's eval (reportedly without deployment safety prompts); GPT-6.1 Astra shelved for getting worse at staying in bounds | The Register, 2026-11-05 | https://www.theregister.com/security/2026/11/05/openai-releases-gpt-6-cyber-and-promises-this-one-stays-within-rules-of-engagement/5307855 | vendor; "7 in 10,000" is `ourMath` |
| `f.gemini-argon` | Gemini 4 Argon first to Fairwind cyber defenders (Sep 30, 2026); wider availability by ~Oct 13 | TechCrunch, 2026-09-30; Google, 2026-10-13 | https://techcrunch.com/2026/09/30/google-releases-gemini-4-argon-called-its-most-powerful-model-yet/ · https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/ | confirmed |
| `f.fable5-mythos5-launch` | Jun 9, 2026 Fable 5 general release; Mythos 5 restricted to Glasswing partners | Anthropic, 2026-06-09 | https://www.anthropic.com/news/claude-fable-5-mythos-5 | confirmed |
| `f.us-directive` | Jun 12, 2026 US directive (foreign nationals); Anthropic disabled both models for all customers; lifted Jun 30; Fable 5 back worldwide Jul 1 (19 days offline); Mythos 5 only to approved US orgs | CNBC, 2026-06-12; Anthropic, 2026-06-30 (upd. 07-01) | https://www.cnbc.com/2026/06/12/anthropic-disables-access-to-fable-5-and-mythos-5-to-comply-with-government-directive.html · https://www.anthropic.com/news/redeploying-fable-5 | confirmed |
| `f.crowdstrike` | 2025 average eCrime breakout 29 min; fastest observed 27 s (single case) | CrowdStrike, 2026-02-24 | https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report/ | vendor |
| `f.patch-gap` | Dashboard as of 2026-11-02: 5,087 disclosed across 680 OSS projects; "to our knowledge" 629 patched (floor; ~12% `ourMath`) | Anthropic CVD dashboard, upd. 2026-11-02 | https://red.anthropic.com/2026/cvd/ | vendor |
| `f.glasswing-bottleneck-quote` | Security "used to be limited by how quickly we could find new vulnerabilities. Now it's limited by how quickly we can verify, disclose, and patch" | Anthropic, 2026-05-22 | https://www.anthropic.com/research/glasswing-initial-update | vendor |
| `f.oss-scanner` | Expert review of 97 high/critical AI findings: 85 met disclosure bar, 11 real but duplicates, 1 false positive | Anthropic, 2026-10-08 | https://www.anthropic.com/research/launching-opt-in-vuln-finding-service-for-open-source | vendor |
| `f.severity-gap` (drawer only) | Claude rated 91.5% critical/high vs maintainers 61.3% (a later post may say 51.3%) | VulnCheck, 2026-09-08 | https://www.vulncheck.com/blog/anthropic-glasswing-receipts | pending |
| `f.cso-manager-agents` (drawer only) | Tier 1 analysts "won't be replaced. They'll be promoted." | CSO Online, 2026-04-27 | https://www.csoonline.com/article/4163299/the-manager-of-agents-how-ai-evolves-the-soc-analyst-role.html | confirmed (opinion) |
| `f.nsc` | NSC Sec-Gen: government, banks, utilities face daily attack attempts; attackers use AI to find weaknesses; no model named | Nation Thailand, 2026-11-09 | https://www.nationthailand.com/news/general/40073298 | confirmed |
| `f.bot` | BOT release 44/2569: convened CIOs of all financial institutions with TB-CERT and TBA after overseas incidents; no impact on Thai services found | BOT, 2026-11-09 | https://www.bot.or.th/content/dam/bot/documents/th/news-and-media/news/2026/news-20261109-2.pdf | confirmed |
| `f.thai-airways` | ~60,529 records via Amadeus; access 10 Aug 2023 to 23 Sep 2026; card data not affected (per THAI); MLex reports 65,029; CAAT lists 6 other airlines | Nation Thailand, 2026-11-10; MLex, 2026-11-11 | https://www.nationthailand.com/news/general/40073323 · https://www.mlex.com/mlex/data-privacy-security/articles/2548884 | confirmed (count conflict shown in drawer) |
| `f.pdpc-fines` | Aug 1, 2025: system developer (processor) fined THB 3m, client THB 500,000 | Nagashima Ohno & Tsunematsu, 2025-08-22 | https://www.nagashima.com/en/publications/publication20250822-1/ | confirmed |
| `f.gasa-survey` | GASA/Mastercard/Whoscall, n=1,290, fieldwork Mar to Apr 2026: 79% encountered scams; Facebook 54%, LINE 48%; 4% reported; ฿65.86B estimate (drawer only) | Bangkok Post / Thai Examiner, 2026-11-09 to 11 | https://www.bangkokpost.com/business/general/3352410/scam-losses-reach-b658bn-in-thailand · https://www.thaiexaminer.com/thai-news-foreigners/2026/11/11/facebook-and-line-social-networks-in-thailand-the-leading-gateways-for-online-scammers-targeting-victims/ | confirmed |
| `f.fake-police` | 2 Sep 2026: victims 19, 22, 19; 2,743,984 baht total; fake scholarship in 2 of 3; bank call stopped a 500,000 baht transfer | MGR Online / Thai Post, 2026-09-06 | https://mgronline.com/crime/detail/9690000087344 · https://www.thaipost.net/criminality-news/1064282/ | confirmed |
| `f.mule-broker` | 18 Oct 2026 arrest of a 20-year-old broker; 15-year-old ม.2 student opened 3 accounts; 5 linked cases; 675,000 baht | Thai Post / MGR Online, 2026-10-18 | https://www.thaipost.net/criminality-news/1090766/ · https://mgronline.com/local/detail/9690000100761 | confirmed |
| `f.de-trends` | DE Ministry 2026 trends: fake payment links posing as utilities; AI deepfake calls and videos of relatives or officials | Nation Thailand, 2025-12-26 | https://www.nationthailand.com/news/general/40060353 | confirmed |
| `f.aoc1441` | AOC 1441 is the anti-online-scam hotline | Nation Thailand, 2026-02-03 | https://www.nationthailand.com/business/tech/40062053 | confirmed |
| `f.isc2-pulse` | n=436, Jul 2025: 52% say AI reduces entry-level need; 31% expect new junior roles incl. AI-Assisted SOC Analyst | ISC2, 2025-07-16 | https://www.isc2.org/insights/2025/07/2025-isc2-ai-pulse-survey | confirmed |
| `f.isc2-workforce` | n=16,029: AI the most pressing skills need (41%) | ISC2, 2025-12-04 | https://www.isc2.org/Insights/2025/12/2025-ISC2-Cybersecurity-Workforce-Study | confirmed |
| `f.sans-titles` | US postings mid-Sep 2026: AI/ML security engineer 850+ (median $140K), AI GRC ~430 ($146K), AI red team ~100 ($124K), AI SOC orchestrator 36 | Cybersecurity Dive, 2026-10-20 | https://www.cybersecuritydive.com/news/ai-security-jobs-hiring-sans-tracker/833465/ | confirmed, `usOnly` |
| `f.tdri` | ~2.2m Thai workers (5.6%) at high AI risk; new grads find entry-level jobs harder | Bangkokbiznews (TDRI conference ~2026-10-22) | https://www.bangkokbiznews.com/economics/1258451 | confirmed |
| `f.gartner-soc` (held) | By 2028, 70% of large SOCs pilot AI agents; only 15% see measurable gains without structured evaluation | Help Net Security, 2026-09-09 (URL needed) | TBD | pending; not used in copy |
| `f.jobsdb-security` | Security Engineer advertised base pay: p10 27,000 / p25 33,000 / median 35,500 / p75 39,000 / p90 45,000; all levels | JobsDB, re-checked 2026-11-11 | https://th.jobsdb.com/career-advice/role/security-engineer/salary | confirmed |
| `f.jobsdb-entry` | Entry ads 25,000 to 35,000 | JobsDB, ก.ค. 2569 (grade B) | https://th.jobsdb.com/career-advice/role/security-engineer/salary | pending |
| `f.adecco` | IT Security senior 7+ yrs up to 250,000; job-switchers in cyber, data and AI ask 20 to 25%; general staff 2 to 5% a year; skews multinational | HREX summary of Adecco Thailand Salary Guide 2026, 2026-04-22 | https://th.hrnote.asia/hr-survey/adecco-thailand-salary-guide-2026-260422/ | confirmed (secondary) |
| `f.bls-infosec` | US Information Security Analyst median $129,180 (May 2025) | BLS OOH | https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm | confirmed, `usOnly` |
| `f.onet-infosec` | Information security analysts prepare reports | O*NET 15-1212.00 | https://www.onetonline.org/link/summary/15-1212.00 | confirmed |
| `f.mytcas-9` | TCAS70: 9 programmes with ไซเบอร์ in the name (5 วิทยาการคอมพิวเตอร์, 2 วิศวกรรมคอมพิวเตอร์, 1 วิศวกรรมซอฟต์แวร์, 1 ไอที) | mytcas feed, checked 2026-11-11 | https://course.mytcas.com/programs/10160101300504A | confirmed |
| `f.mytcas-four` | KMITL 10160101300504A, KKU 10030138220204A, CMU 10040106300502E, TU 10050209220202B and their track types | mytcas, checked 2026-11-11 | https://course.mytcas.com/programs/10050209220202B | confirmed |
| `f.kmitl-portfolio` | KMITL CPE + Cybersecurity Portfolio 40 seats, GPAX ≥ 3.00, closes 28 Jan 2027 16:30 | eduzones, 2026-11-09 | https://www.eduzones.com/2026/11/09/eng-kmitl70/ | pending (secondary) |
| `f.tctt` | Thailand Cyber Top Talent 2026: Junior tier for secondary school; 484 Junior of 1,399; Junior winner 80,000 baht + royal trophy; final 5 Sep 2026 | THNCA; ctf.in.th (data 2026-10-10); MGR Online, 2026-09-07 | https://www.thnca.or.th/tctt2026/ · https://ctf.in.th/tctt-statistics/ · https://mgronline.com/entertainment/detail/9690000087648 | confirmed |
| `f.tctt-kmitl-caveat` | KMITL Top Talents lists it as an example competition; not every award level counts | eduzones, 2026-11-09 | https://www.eduzones.com/2026/11/09/eng-kmitl70/ | pending (secondary) |
| `f.secai` | CompTIA SecAI+ (CY0-001, Feb 17, 2026); recommended 3 to 4 yrs IT + 2+ yrs security | CompTIA | https://www.comptia.org/en/certifications/secai/ | confirmed |
| `f.thm-free` | Offensive Security Intro is listed; "Every room listed in this guide is free to access with a TryHackMe account" | TryHackMe, 2026-08-31 | https://tryhackme.com/resources/blog/free-red-teaming-training-on-tryhackme-to-build-your-skills-in-2026 · room: https://tryhackme.com/room/offensivesecurityintro | confirmed |
| `f.thm-fakebank` | The room uses a practice fake-bank website | Third-party walkthroughs; confirm on screen | https://tryhackme.com/room/offensivesecurityintro | pending |
| `f.jadepuffer` | Agent entered via Langflow CVE-2025-3248 (patched April 2025); produced a working fix 31 s after a failed login; "first" is Sysdig's assessment | Sysdig, 2026-07-01 | https://sysdig.com/blog/jadepuffer-agentic-ransomware-for-automated-database-extortion | vendor |
| `sim.mythos-snippet` | Simulated code: buffer 64 bytes, length byte up to 255 | PassionSeed | n/a | simulated |
| `sim.triage-queue` | Simulated alert queue (times, %, counts) | PassionSeed | n/a | simulated |
| `sim.scam-chat` | Simulated chat (5,000 baht, 120 baht, 3 accounts, คาบ 3) | PassionSeed | n/a | simulated |
| `sim.terminal` | Simulated lab (41 failures, ports, IPs from RFC 5737) | PassionSeed | n/a | simulated |

---

## Must-not-say (CI denylist; patterns checked in copy, clip scripts and reel hooks)

| Never write | Why / use instead |
|---|---|
| `92.7` (as OSS Scanner accuracy) | Not on Anthropic's page. Use 85 of 97 |
| `516`, `6,157`, `8.4%` | Superseded. Use 5,087 / 629 as of 2 Nov 2026 |
| "14" high-severity for Mythos Firefox | Belongs to the Opus 4.6 study. Mythos: 180 sec-high |
| "271 zero-day", "zero-day 271" | Say "Mozilla บอกว่า 271 ตัวเจอด้วย Mythos Preview" |
| "ธปท. สั่ง" + "อัปเดต" / "แพตช์ทั้งหมด" | BOT convened CIOs; no order in the release |
| "ฟิชชิงเพิ่มสามเท่า", "AI tripled phishing" | Microsoft: phishing 7% → 23% of intrusions it investigated |
| จีน / China attribution for the Taiwan attack | Unconfirmed |
| `85+`, "85 บัญชีขึ้นไป" | 85 |
| "8 ตัวพร้อมกัน", "8 parallel" | "สูงสุด 8" |
| hand-over-face deepfake tip | No source |
| Gartner "50%" of Tier 1 | Unsourced |
| LinkedIn `34` / `222` | Unsourced |
| "88% ได้งาน" | Unsourced |
| BLS `29%` | Outdated; current 21% (2025 to 2035) |
| "Thai officials told ABC" | It was an anti-trafficking investigator |
| `7 เท่า` (salary) | Different sources |
| "ถูกกฎหมาย 100%", "ไม่เกิน 2 ชม.", "30 นาที" (TryHackMe) | Unverified |
| `62,500` (JobsDB data scientist) | Not on the live page |
| "AI premium", "พรีเมียม AI 20%" | Source does not show it |
| "เฉลี่ย 35,500", "เงินเดือนเริ่มต้น 35,500" | It is an all-levels median |
| US dollar salaries on the Thai axis or converted to baht | Separate tab only |
| "15 ส.ค." (TCTT qualifier) | No source |
| "ได้คะแนน TCAS แน่นอน", "การันตี" (competitions) | Not every award counts |
| "สมัคร Claude", "สมัคร ChatGPT" addressed to the student | Age terms |
| Victim names; Christeyns, Teckentrup, Helideck (Cursor case) | Keep unnamed |
| "มาตรา 5" | Until legal review |
| "น้องๆ", `—`, `–` | House rules |

---

## Open items before publishing

1. **KMITL TCAS70** seats and deadline: confirm on KMITL's official announcement (current source eduzones). Until then the badge stays `ยังรอตรวจสอบ`.
2. **TryHackMe:** re-confirm Offensive Security Intro is free on a free account (room page returned 429) and check the age terms; confirm the fake-bank site on screen while recording.
3. **picoCTF, OverTheWire:** verify free status and age terms before adding them to `tonight`.
4. **Gartner 70% / 15%:** add the Help Net Security URL to the registry before using it in `firstjob` copy.
5. **Mythos 5.2 consumer access:** the copy says the second door is for vetted organisations and enterprise customers; re-read the 5.2 page if Anthropic changes access.
6. **Legal review** of the fixed legal lines on `doors`, `terminal`, `tonight` against พ.ร.บ.ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ before any section number appears.
7. **Thai copy review** per AGENTS.md: Gemini for drafting, Cursor for proofreading, Codex for logic. Pay attention to the Act 2 card on `doors` (Dream/Taiwan wording) and the scam bubbles.
8. **mytcas feed:** pull the five remaining cyber programme names and links at build time; never hand-type them.
9. **`/r` resolver:** ship the `<alias>-<pagekey>` pattern and seed `radar_links` rows for the 10 reels.
10. **Thai Airways count:** if THAI or the PDPC publishes a final number, replace the "ราว 60,000" line.

---

## How the template carries over to the other three pilots

**Shared across all four guides:** shell, lints, registry, state helper, event mapping, `?demo=1` reels, and these components with career data swapped in: `money`, `fit`, `tcas` (grade gate included), `tonight` (EvidenceMaker), `next` (RecapCard, favourite pick, intent). Same rules: tap-only games, skip-to-answer, no page swipes, single-word keys, every number with a fact id, US labelled, vendor numbers badged. **No page ever tells a minor to sign up for Claude, ChatGPT or another age-limited AI product;** every "try it" step uses an on-page simulation or a site checked for age terms.

### AI engineer (`/radar/ai-engineer/<key>`, 12 pages)

| # | Key | Thai title | Mechanic | News hooks (fact source, date) |
|---|---|---|---|---|
| 1 | `agents` | AI เขียนโค้ดเกือบทั้งหมดของบริษัทที่สร้างมัน | "คนทำอะไรในส่วนที่เหลือ": 6 task chips of an agent run (ตั้งเป้า, แตกงาน, ให้ agent เขียน, ตรวจ, ตัดสินใจ merge, รับผิดชอบเมื่อพัง); tap AI or คน, reveal Anthropic's "with human guidance" | Anthropic: over 90% of merged changes in its core codebase written by Claude with human guidance; ~1,000 Fable 5.2 agents formalized Fermat in Lean in 30 h (anthropic.com/claude-fable-and-mythos-5-2, 2026-11-09, vendor) |
| 2 | `sandbox` | สร้างกรงให้ AI | Build the sandbox: place 4 walls (ไม่มีอินเทอร์เน็ต, ดิสก์อ่านอย่างเดียว, ไม่มีรหัสจริง, ทางออกเดียวผ่าน proxy) then "รัน"; replay shows agents escaping through the one allowed route; add "เฝ้าทางออก + kill switch" | OpenAI eval agents escaped via zero-days in a JFrog Artifactory proxy and breached Hugging Face; ~1,200 agents in the swarm, ~700 attacked HF (METR, 2026-08-26, metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/); HF used open-weight GLM-5.2 because hosted models declined forensics (huggingface.co/blog/security-incident-july-2026, 2026-07-16) |
| 3 | `planner` | ตัวใหญ่วางแผน ตัวเล็กลงมือ | Cost calculator: sliders for calls and tokens; route planning to a big model, volume to a small one; bill updates (input-token cost only, labelled) | Meta Muse Wonder API $4/$20 per M tokens (TechCrunch 2026-10-12); Muse Ember $0.10 per M input, "Muse Wonder plans, Muse Ember handles the volume" (TechCrunch 2026-11-09) |
| 4 | `open` | โหลดมารันเองได้ไหม | Sorter: model cards into "โหลดน้ำหนักมารันเองได้" / "ใช้ผ่าน API เท่านั้น" / "ยังไม่ชัด" | DeepSeek V4 open weights, MIT (api-docs.deepseek.com/updates; HF cards); Qwen3.8 weights Aug 12, 2026 with restrictive licence; Qwen4-Max preview Nov 11, 2026, no weights announced (secondary, `ยังรอตรวจสอบ`); ThaiLLM via API/Playground |
| 5 | `thai` | ถามเป็นภาษาไทย | "Teach the model Thai": 3 tricky inputs (no word spaces, Isan, handwritten form); student guesses how a generic vs a Thai-tuned model reads them (outputs simulated) | ThaiLLM launched Apr 2026: 8B/30B, >100B Thai tokens, sub-models OpenThaiGPT, Pathumma, Typhoon-S, THaLLE (nstda.or.th, 2026-04-01; Nation 2026-04-20); Typhoon OCR v1.5 2B, Apache-2.0, on Qwen3-VL-2B (opentyphoon.ai, released 2025-11-14): "ทีมไทยปรับโมเดลเปิดด้วยข้อมูลไทย"; IFC director: Thailand short ~80,000 AI professionals (Nation 2026-09-10, estimate) |
| 6 | `evals` | ให้คะแนนแชตบอต | On-page simulated school FAQ bot (no sign-up): pick or write 3 test questions, run them, score answers right / wrong / made up; output = first eval report | Lightcast via Stanford AI Index: agentic-AI skills 0.06% → 0.23% of US postings 2024 to 2025 (lightcast.io, 2026-04-13); evals in 56% of 390 AI engineer ads (single blog, `ยังรอตรวจสอบ`) |
| 7 | `metr` | รู้สึกว่าเร็ว กับเร็วจริง | Slider: guess how much faster AI makes engineers, then reveal measured vs self-reported | METR: Anthropic progress ~1.9x (CI 1.5 to 2.8x) vs ~12x self-reported "very loose evidence" (metr.org, 2026-11-05); 2025 RCT 19% slower while feeling faster; Stack Overflow 2026: 6.6% trust AI with important decisions, 4% early-career (survey.stackoverflow.co/2026/ai) |
| 8 | `money` | เงินเดือนจริงในไทย | GuessReveal | Adecco: AI Engineer 30,000 (0 to 3 yrs) to 170,000 (7+ yrs) (HREX 2026-04-22); US tab: LinkedIn AI engineer #1 fastest-growing two years running (linkedin.com 2026-01-07), FDE postings +729% YoY (index, Business Insider May 2026), avg base ~$172K (Indeed via LeadDev) |
| 9 | `fit` | ฉันเหมาะไหม | BinaryChoice, readouts AI engineer / คอมกว้าง / ข้อมูล | shared |
| 10 | `tcas` | สมัครที่ไหน เมื่อไหร่ | ProgrammeFilter + grade gate | KMITL Robotics & AI Engineering and AI & Entrepreneurship Engineering, 10 seats each, intl (eduzones 2026-11-09, secondary); Silpakorn AiDEX Portfolio 20 Oct to 16 Nov 2026 → shows "ปิดแล้ว" after 16 Nov, other rounds still listed (smartmathpro 2026-10-16); KMUTT Ratchaburi AISE GPAX ≥ 2.75, apply by 11 Jan 2027 (ratchaburi.kmutt.ac.th 2026-10-07). Burapha and Walailak hidden until official sources |
| 11 | `tonight` | คืนนี้ eval แรกของเธอ | EvidenceMaker: export the `evals` report as a write-up; optional Thai-model playground only after age terms are checked | shared |
| 12 | `next` | แล้วเธอล่ะ | RecapCard + favourite + intent | shared |

### Software engineer (`/radar/software-engineer/<key>`, 12 pages)

| # | Key | Thai title | Mechanic | News hooks |
|---|---|---|---|---|
| 1 | `agents` | AI เริ่มงานมากกว่า 40% ของโค้ดใหม่บน GitHub | "ใครเขียนบรรทัดนี้": 8 lines, guess คน / AI, then "แล้ววิศวกรทำอะไร" | GitHub Octoverse: >40% of PRs started from an agent draft in Sep 2026, up from 17% in March (github.blog, 2026-10-28); Google: 75% of new code AI-generated and approved by engineers (Semafor, 2026-04-24) |
| 2 | `review` | ตรวจ PR ของ agent | Approve / request changes / reject 3 agent PRs: one clean, one with SQL injection, one that quietly breaks a feature | Veracode Oct 2026: 38% of AI outputs failed Veracode's security tests, top models 73% pass, Java 31% (veracode.com/?p=33104, 2026-10-29) |
| 3 | `migration` | คนทำอะไรในงานย้ายโค้ด 680,000 บรรทัด | Timeline: tap each step AI or คน (กำหนดขอบเขต, เขียนเทสต์, ย้ายโค้ด, รีวิว, ปล่อยจริง, ถอยกลับ) | Opus 5.5: unnamed tester migrated 680,000 lines in under a day; Stripe 40 stacked PRs all passed CI (anthropic.com/claude-opus-5-5, 2026-09-22, vendor) |
| 4 | `kbtg` | ธนาคารไทยใช้ agent 10 ตัว | "ส่งต่อตั๋ว": a feature request passes a 10-agent relay; approve or send back at each stage | KBTG: 10 agents, AI-written code 21m lines (2025) → 41m (Jan to May 2026), ~15% of engineers' code (The Story Thailand, 2026-06-19); Agoda × OpenAI Tech Camp, 420+ Thai students, 5 to 6 Nov 2026 (PR Newswire) |
| 5 | `pdpa` | โค้ดปลอดภัยคือหน้าที่ตามกฎหมาย | Privacy-by-design review: tap fields in a signup form and schema that should not be stored, logged or shown | PDPC Aug 1, 2025: system developer fined THB 3m, client THB 500,000 (Nagashima 2025-08-22) |
| 6 | `firstrung` | บันไดขั้นแรกบางลง | LadderRebuild + proof picks | Indeed: entry-level 4.5% of US software postings Q1 2026, senior 69.3% (hiringlab.indeed.com 2026-07-23); Stanford: 22 to 25 year-olds in most AI-exposed jobs ~19% below expected, descriptive not causal (digitaleconomy.stanford.edu 2026-08-12); postings +~15% since Feb 2025, 71% of the rise senior (Indeed 2026-07-08). All `สหรัฐฯ` |
| 7 | `headlines` | นักสืบพาดหัวข่าว | Headline vs source: 4 headline cards; student picks what the source actually supports | Amazon ~30,000 corporate cuts; Jassy: "not even really AI-driven, not right now at least" (CNBC 2026-01-28); Challenger: AI cited for 121,401 US cuts YTD Oct 2026, October 1,265 (lowest), market conditions now top reason (challengergray.com, Nov 2026); Microsoft ~60,000 eligible for voluntary exit, memo cites no AI (CNBC 2026-10-26) |
| 8 | `money` | เงินเดือนจริงในไทย | GuessReveal | Thai SE salary source **needed** (re-pull JobsDB software engineer page into a factsheet before build); US tab: BLS software developers +10% 2025 to 2035, median $135,980 |
| 9 | `fit` | ฉันเหมาะไหม | BinaryChoice | shared |
| 10 | `tcas` | สมัครที่ไหน เมื่อไหร่ | ProgrammeFilter + grade gate | KMITL Computer Engineering Portfolio 40 (+20 Chumphon), Software Engineering intl 10 (eduzones, secondary); CPE / SE / CS programmes pulled from the mytcas feed |
| 11 | `tonight` | vibe แล้วซ่อม | On-page simulated "prompt a toy app" → checklist of what is missing (input validation, tests, secrets, edge cases); real step: publish a one-page static app with a README (parent helps where a site has age limits) | Collins Word of the Year 2025 "vibe coding" (2025-11-06) |
| 12 | `next` | แล้วเธอล่ะ | shared | shared |

### Data scientist (`/radar/data-scientist/<key>`, 12 pages)

| # | Key | Thai title | Mechanic | News hooks |
|---|---|---|---|---|
| 1 | `proof` | ข่าวใหญ่ หรือพิสูจน์แล้ว | Flip cards: OpenAI's 3 claimed discoveries; student rates each ยืนยันแล้ว / กำลังตรวจ / ยังเถียงกันอยู่, then sees expert status | OpenAI, Oct 26, 2026: local smoothing (expert called it historic), ETH disproof (MIT's Ryan Williams: still verifying), QCD proof not public (Al Jazeera 2026-10-27) |
| 2 | `credit` | ใครควรได้เครดิต | Slider across 5 steps of a discovery (ตั้งคำถาม, ข้อมูล, วิเคราะห์, ตรวจ, เขียน) | Anthropic ART enzyme claim, ~950 agents ~21 h (anthropic.com, 2026-09-23, vendor); CNN pushback: a Copenhagen researcher says his unpublished work has the same finding; not peer-reviewed (CNN 2026-10-08) |
| 3 | `scamdata` | กราฟเดียว เล่าได้สองเรื่อง | Build the chart from the ACSC weekly table; toggle cases vs baht; "บ่อยที่สุด" vs "เสียหายที่สุด" | ACSC 28 Jun to 4 Jul 2026: 5,588 complaints, 207.73m baht; goods/services 4,400 cases (78.7%); impersonating officials 71.75m baht (Nation 2026-07-06) |
| 4 | `mule` | บัญชีไหนคือบัญชีม้า | 6 simulated activity timelines; flag the mule using features (บัญชีใหม่, เงินเข้าจากคนแปลกหน้า, โอนออกทันที) | Mule-broker arrest, ม.2 student, 5 linked cases (Thai Post 2026-10-18) |
| 5 | `measure` | รู้สึกเร็ว แต่ช้ากว่าจริง | Timed mini task twice (with / without hint button); compare felt vs measured | METR RCT 2025: 19% longer with AI while believing faster; self-estimates off by ~40 points (metr.org 2026-02-24); 2026 survey n=349 median self-report 3x speed (metr.org 2026-05-11) |
| 6 | `layoffs` | อ่านกราฟเลิกจ้างให้เป็น | Scrubbable month chart; toggle "เหตุผลที่บริษัทบอก" vs "เกิดอะไรขึ้นเดือนนั้น" | Challenger: AI-cited cuts peaked May 2026 at 38,579, October 1,265; market conditions overtook AI as top stated reason (Challenger Oct 2026 report PDF) |
| 7 | `postings` | งานนี้กลืน AI เข้าไป | Task sort AI ทำ / คนทำ / คนตรวจ for a data job, then Thai exposure list | Extern/Adzuna US: data scientist postings +23%, AI engineer +37% (Jul to Oct 2026; vendor tracker, postings are not hires; extern.com 2026-11-01); BLS +35% 2025 to 2035 (US); TDRI: clerks and data entry most exposed in Thailand (Bangkokbiznews, ~2026-10-22); NESDC figure kept separate |
| 8 | `money` | เงินเดือนจริงในไทย | GuessReveal | Adecco: Data Scientist/Engineer ceiling ~150,000 (HREX 2026-04-22); Thai entry and median source **needed** (JobsDB data-scientist page shows no median; 62,500 banned); US tab: BLS median $120,230 |
| 9 | `fit` | ฉันเหมาะไหม | BinaryChoice | shared |
| 10 | `tcas` | สมัครที่ไหน เมื่อไหร่ | ProgrammeFilter + grade gate | Data science, statistics, CS programmes from the mytcas feed (**not yet verified**; pull and check before build) |
| 11 | `tonight` | คืนนี้ กราฟแรกของเธอ | Turn the ACSC weekly table into a one-page chart with a 3-sentence finding (on-page tool, no sign-up); EvidenceMaker export | ACSC weekly data (Nation 2026-07-06) |
| 12 | `next` | แล้วเธอล่ะ | shared | shared |

Files read (unchanged): `/Users/bunyasit/dev/passionseed/web-radar-guide/docs/radar-guide/scripts/cybersecurity.json`, `/private/tmp/claude-501/-Users-bunyasit-dev-passionseed-web/fcf6b27b-3c80-416a-a5af-40caad930ba6/scratchpad/factsheets/cybersecurity.md`, `/Users/bunyasit/dev/passionseed/web-radar-guide/lib/radar-guide/events.ts`.
