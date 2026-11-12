# SHIFT High Island Invite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive message-in-a-bottle page at `/shift/island` that tells the island's story and lets SHIFT alumni RSVP to the Season 1 kickoff festival.

**Architecture:** A server page resolves who is looking (signed out, not alumni, can RSVP, going) through a pure function fed by Supabase reads, and passes that state to one client component that plays four scenes (prologue, shore, letter, seal). The RSVP is a `POST` route that repeats the same check and upserts into a new admin-only table.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` (`utils/supabase/server.ts`, `admin.ts`), Jest, CSS modules, canvas 2D. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-shift-island-invite-design.md`

## Status: merged into the island game (2026-11-12)

This invite now lives on `merge/shift-island-all` with the SHIFT High island
game, its rollout work and its lore. What changed from the tasks below:

- **One address.** `/shift/island` is one page (`app/shift/island/page.tsx`)
  for the invitation and the game; the rule is `islandEntry` in
  `lib/shift/islandEntry.ts` (tests in `lib/shift/__tests__/islandEntry.test.ts`
  and `app/shift/island/__tests__/page.test.tsx`):
  - Signed out, not alumni, not RSVPed, or RSVPed and not let into the game
    yet: the invitation (prologue, bottle, letter, seal, ticket).
  - RSVPed and let in by the game (signed in with Discord, in the SHIFT
    server, with the student role): the game. Its story picks up from the
    ticket (panel 1, "เจอกันบนเกาะแล้ว"; lore bible, section 16).
  - Staff the game lets in (mentors, reviewers) skip the RSVP: they are not
    alumni and get no ticket.
  - RSVPed but not let in yet: the ticket carries a door (`ISLAND_DOOR`):
    sign in with Discord (`discord`), wait for the role (`waiting`), or the
    island is off right now (`closed`, e.g. before the quest database is
    set in production).
  - Signed out: under the seal, a quiet "อยู่บนเกาะแล้ว? เข้าด้วย Discord ได้เลย"
    so a returning player goes straight in.
- **Alumni rule kept.** Only people who finished SHIFT (a confirmed or pending
  alumni record, or a linked paid application) or site admins can RSVP; the
  route checks again before it writes.
- **RSVP → Discord role "SHIFT high".** An RSVP should lead to the Discord
  role `SHIFT high` in the SHIFT server, the role the game reads (`/admin
  student-role`). Nothing grants it automatically yet: staff read new rows in
  `shift_island_rsvps` and give the role by hand (rollout runbook, step G).
  Automatic granting is not built: it needs the bot token on the website, a
  match from the PassionSeed account to a Discord member, and a check that
  the person is a confirmed alumnus, never a pending one (safeguarding: an
  unverified account must not land in a room with students). A Discord
  sign-in that makes a second PassionSeed account (different email) does not
  carry the first account's RSVP over; the person RSVPs again on it.
- **Migration renumbered** to `20261112090000_shift_island_rsvps.sql`
  (`20261111120000` is `whiteboard_quest_reviewers` on `main`), now with an
  admin read policy and a read-own policy, like `shift_alumni_members`.
- **Home-page dependencies brought in:** `lib/content/shift-island.ts` (+ its
  test, without the home journey part), the stage sprites and sample picture
  in `public/shift/island/`, and island-local copies of `StageSprite` and
  `IslandTree` in `components/shift/island/` (the home versions depend on the
  home theme). `useReducedMotion` is one hook for the game and the invite.

## Global Constraints

- Depends on uncommitted home-page work in this tree: `lib/content/shift-island.ts`, `components/home/IslandTree.tsx`, `components/home/StageSprite.tsx`, `public/shift/island/*`. Import them; never stage or edit them on this branch. The PR opens only after that work is on `main` (or the user says to include it).
- Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (AGENTS.md).
- Auth: `createClient()` from `@/utils/supabase/server`, `supabase.auth.getUser()`; anonymous users (`isAnonymousUser` from `@/lib/supabase/auth`) count as signed out.
- Table access only through `lib/supabase/`, with `createAdminClient()` after the caller's own checks.
- Migration additive and idempotent; RLS enabled, no client policies.
- Copy: Thai first, no em dashes (`—`), no "น้องๆ", no ed-tech jargon. Season name and dates only from `ISLAND_SEASON`; stage names only from `ISLAND_STAGES`.
- Motion: `prefers-reduced-motion` shows final states with no animation; every hover effect has a `@media (hover: none)` / `IntersectionObserver` equivalent. Phone width first (360px), no horizontal scroll.
- Page metadata: `robots: { index: false, follow: false }`.
- Discord URL order: `DISCORD_SHIFT_ISLAND_CHANNEL_URL`, then `shiftDiscordUrls().server`, then `shiftDiscordUrls().invite`, then `null`.

## Review Focus

1. Double tap on the seal: one row, same ticket both times; the button is disabled while the request is in flight. (Task 4 test, Task 7 behavior.)
2. Season over (Bangkok date after `ISLAND_SEASON.lastDay`): API answers 422 `SEAL.closed`, page shows the closed line instead of the seal. (Tasks 3 and 4 tests.)
3. Anonymous Supabase session: treated as signed out, never as a member. (Task 3 test.)
4. RSVP request fails (500 or offline): seal returns to pressable with `SEAL.error`; no ticket is shown. (Task 7.)
5. No Discord env set: ticket shows `TICKET.noDiscord` and no link. (Task 3 test.)

---

### Task 1: RSVP table and data access

**Files:**
- Create: `supabase/migrations/20261112090000_shift_island_rsvps.sql`
- Create: `lib/supabase/shift-island-rsvps.ts`
- Test: `lib/supabase/__tests__/shift-island-rsvps.test.ts`

**Interfaces:**
- Produces: `getIslandRsvp(userId: string): Promise<IslandRsvp | null>`, `addIslandRsvp(userId: string, season: string): Promise<IslandRsvp>`, `interface IslandRsvp { user_id: string; season: string; created_at: string }`.

- [ ] **Step 1: Write the migration** exactly as in the spec's Data section (`CREATE TABLE IF NOT EXISTS`, `ENABLE ROW LEVEL SECURITY`, comment on no client policies).
- [ ] **Step 2: Write failing tests** mocking `@/utils/supabase/admin` like `app/api/shift/seats/route.test.ts`:
  - `addIslandRsvp upserts on user_id and ignores duplicates`: expects `from("shift_island_rsvps")`, `upsert({ user_id: "u1", season: "Season 1" }, { onConflict: "user_id", ignoreDuplicates: true })`.
  - `addIslandRsvp reads the row back when a double tap lost the race`: upsert returns `data: null`, then `getIslandRsvp` result is returned.
  - `getIslandRsvp returns null when there is no row`.
  - `throws the Supabase error`.
- [ ] **Step 3: Run** `pnpm test lib/supabase/__tests__/shift-island-rsvps.test.ts`, expect FAIL (module not found).
- [ ] **Step 4: Implement** following the `createAlumniMember` pattern in `lib/supabase/shift-alumni-members.ts` (upsert, `.select(...).maybeSingle()`, fall back to a read).
- [ ] **Step 5: Run the tests**, expect PASS.
- [ ] **Step 6: Commit** `feat(shift): island RSVP table and data access`.

### Task 2: Invite copy

**Files:**
- Create: `lib/content/shift-island-invite.ts`
- Test: `lib/content/__tests__/shift-island-invite.test.ts`

**Interfaces:**
- Consumes: `ISLAND_SEASON`, `islandSeasonPhase`, `ISLAND_STAGES` from `@/lib/content/shift-island`; `formatThaiDate` from `@/lib/content/shift-cohort`.
- Produces: `PROLOGUE: readonly string[]`, `SHORE`, `LETTER_CHAPTERS: { id: "island" | "tree" | "festival" | "rules"; title: string; body: string }[]`, `SEAL`, `TICKET`, `festivalLine(now?: Date): string`, `daysUntilKickoff(now?: Date): number`.

- [ ] **Step 1: Write failing tests:**
  - `prologue has 4 to 5 lines and ends on the bottle`: `PROLOGUE.length` in [4, 5]; last line contains `"ขวด"`.
  - `no em dashes or น้องๆ anywhere`: walk every exported string (including `festivalLine` for the three dates below) and assert no `—` and no `น้องๆ`.
  - `festivalLine before kickoff counts days`: `new Date("2026-11-11T05:00:00Z")` → contains `"อีก 3 วัน"`.
  - `festivalLine on kickoff day says today`: `2026-11-14T02:00:00Z` → contains `"วันนี้"`.
  - `festivalLine while running names the last day`: `2026-11-20T05:00:00Z` → contains `formatThaiDate("2026-11-28", false)`.
  - `festivalLine after the season keeps the trees`: `2026-11-29T05:00:00Z` → contains `"ต้นไม้ทุกต้นยังอยู่บนเกาะ"`.
- [ ] **Step 2: Run** `pnpm test lib/content/__tests__/shift-island-invite.test.ts`, expect FAIL.
- [ ] **Step 3: Implement.** Copy (exact; the three-model Thai review in Task 8 may change wording, not facts):

```ts
export const PROLOGUE = [
  "7 วันของ SHIFT จบลง โปรเจกต์จริงหนึ่งชิ้นอยู่ในมือเรา",
  "หลายโปรเจกต์หยุดอยู่ตรงนั้น ไม่ใช่เพราะไม่ดี แต่เพราะไม่มีใครสร้างต่อไปด้วยกัน",
  "เลยมีเกาะแห่งหนึ่ง ที่ทุกโปรเจกต์คือต้นไม้ และต้นไม้ยังโตต่อหลังวันที่ 7",
  "ทุกแปลงคือโปรเจกต์ของใครสักคน ต้นไม้โตเมื่อพี่เลี้ยงเห็นงานที่ทำจริง",
  "ซีซันนี้ เกาะเปิดด้วยเทศกาล และมีขวดใบหนึ่งลอยมาเกยฝั่งถึงเรา",
] as const;
export const SHORE = { hint: "แตะขวดเพื่อเปิด", skip: "ข้าม", next: "ต่อ" } as const;
export const LETTER_CHAPTERS = [
  { id: "island", title: "ถึงคนที่เคยผ่าน SHIFT", body: "เกาะนี้มีไว้ให้โปรเจกต์ที่ยังไม่อยากหยุด หนึ่งโปรเจกต์คือต้นไม้หนึ่งต้น และมันโตเมื่อพี่เลี้ยงยืนยันงานที่ทำจริงเท่านั้น" },
  { id: "tree", title: "ต้นไม้ของเรา", body: `เริ่มจากแปลงว่าง แล้วโตขึ้นทีละขั้น ${ISLAND_STAGES.length - 1} ขั้นจนผลิดอก ทำเควสต์ไหนก่อนก็ได้` },
  { id: "festival", title: `เทศกาลเปิดเกาะ ${ISLAND_SEASON.name}`, body: "สองสัปดาห์แรกของเกาะ ทุกคนลงแปลงพร้อมกัน ช่วยกัน และดูต้นไม้ของกันและกันโต" },
  { id: "rules", title: "กติกาบนเกาะ", body: "พักได้ ต้นไม้ไม่เหี่ยว ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ" },
];
export const SEAL = {
  press: "กดตราประทับเพื่อตอบรับ",
  signIn: "เข้าสู่ระบบเพื่อตอบรับ",
  notAlumni: "การตอบรับเปิดให้คนที่จบ SHIFT แล้ว ถ้ายังไม่เคยเข้า SHIFT เริ่มได้ที่นี่",
  applyCta: "สมัคร SHIFT",
  pending: "กำลังประทับ...",
  error: "ประทับไม่ติด ลองกดอีกครั้ง",
  closed: "ซีซันนี้ปิดรับแล้ว ต้นไม้ทุกต้นยังอยู่บนเกาะ",
} as const;
export const TICKET = {
  heading: "เจอกันบนเกาะ",
  discordCta: "เข้าห้องเกาะใน Discord",
  noDiscord: "ลิงก์ห้องเกาะจะส่งในกลุ่มรุ่นของเรา",
} as const;
```

  `festivalLine`: before (N > 0) `เทศกาลเปิดเกาะเริ่มในอีก ${N} วัน ${kickoff} ถึง ${lastDay}`; N = 0 `เทศกาลเปิดเกาะเริ่มวันนี้ ถึง ${lastDay}`; running `เทศกาลเปิดอยู่ตอนนี้ ถึง ${lastDay}`; after `${name} จบแล้ว ต้นไม้ทุกต้นยังอยู่บนเกาะ`. Dates via `formatThaiDate(iso, false)`. `daysUntilKickoff` uses the same Bangkok day as `islandSeasonPhase` (export `bangkokDay` from `shift-island.ts` is NOT allowed, it is home WIP: re-derive with `now + 7h` and compare ISO dates).
- [ ] **Step 4: Run the tests**, expect PASS.
- [ ] **Step 5: Commit** `feat(shift): island invite copy`.

### Task 3: Viewer state and Discord link

**Files:**
- Create: `lib/shift/islandInvite.ts` (pure, no Supabase imports)
- Create: `lib/supabase/shift-island-viewer.ts` (loader)
- Test: `lib/shift/__tests__/islandInvite.test.ts`

**Interfaces:**
- Consumes: `getIslandRsvp` (Task 1); `getAlumniMember`, `findLinkedApplication` from `@/lib/supabase/shift-alumni-members`; `islandSeasonPhase`; `shiftDiscordUrls` from `@/lib/shift/discordGuild`.
- Produces:
  ```ts
  export interface IslandTicket { nickname: string; cohort: string }
  export type IslandViewer =
    | { kind: "signedOut" }
    | { kind: "notAlumni" }
    | { kind: "closed" }
    | { kind: "canRsvp" }
    | { kind: "going"; ticket: IslandTicket; discordUrl: string | null };
  export interface IslandViewerInput {
    user: { anonymous: boolean } | null;
    isAdmin: boolean;
    member: { nickname: string; cohort: string; status: AlumniMemberStatus } | null;
    linkedApplication: { nickname: string; cohort: string } | null;
    rsvp: boolean;
    phase: IslandSeasonPhase;
  }
  export function islandViewer(input: IslandViewerInput, discordUrl: string | null): IslandViewer;
  export function islandDiscordUrl(env?: NodeJS.ProcessEnv): string | null;
  export const MENTOR_TICKET: IslandTicket = { nickname: "พี่เลี้ยง", cohort: "SHIFT High" };
  // lib/supabase/shift-island-viewer.ts
  export async function loadIslandViewer(): Promise<{ viewer: IslandViewer; userId: string | null; input: IslandViewerInput }>;
  ```

- [ ] **Step 1: Write failing tests** for `islandViewer` (one `test` each):
  - `null user → signedOut`; `anonymous user → signedOut` (even with a member record).
  - `no member, no linked application → notAlumni`; `declined member → notAlumni`.
  - `pending member, no rsvp → canRsvp`; `no member but linked paid application → canRsvp`; `admin with no member → canRsvp`.
  - `member with rsvp → going` with ticket `{ nickname, cohort }` and the passed `discordUrl`; `admin with rsvp, no member → going` with `MENTOR_TICKET`.
  - `phase "after", alumni without rsvp → closed`; `phase "after", alumni with rsvp → going` (ticket stays).
  - `islandDiscordUrl`: island env wins; falls back to `https://discord.com/channels/<DISCORD_SHIFT_GUILD_ID>`; then `DISCORD_SHIFT_INVITE_URL`; all unset → `null`. Pass `env` explicitly; make `shiftDiscordUrls` accept it or read the two vars directly in `islandDiscordUrl` (same strings).
- [ ] **Step 2: Run** `pnpm test lib/shift/__tests__/islandInvite.test.ts`, expect FAIL.
- [ ] **Step 3: Implement** `islandViewer` (precedence: signedOut, notAlumni, going, closed, canRsvp) and `islandDiscordUrl`. Then `loadIslandViewer`: `getUser()`, admin check via `user_roles` like `getBoardAccess`, `getAlumniMember`, `findLinkedApplication` only when there is no member, `getIslandRsvp`, `islandSeasonPhase()`. If the table is missing (error), treat `rsvp` as false and log, matching `rsvpNamesByDate`.
- [ ] **Step 4: Run the tests**, expect PASS.
- [ ] **Step 5: Commit** `feat(shift): island invite viewer state`.

### Task 4: RSVP route

**Files:**
- Create: `app/api/shift/island/rsvp/route.ts`
- Test: `app/api/shift/island/rsvp/route.test.ts`

**Interfaces:**
- Consumes: `loadIslandViewer` (Task 3), `createAlumniMember` from `@/lib/supabase/shift-alumni-members`, `addIslandRsvp` (Task 1), `safeServerError` from `@/lib/security/route-guards`, `islandDiscordUrl`, `ISLAND_SEASON.name`, `SEAL`.
- Produces: `POST` → `200 { ok: true, ticket: IslandTicket, discordUrl: string | null }`; `401 { error }` signed out; `403 { error: SEAL.notAlumni }`; `422 { error: SEAL.closed }`; `500` via `safeServerError`.

- [ ] **Step 1: Write failing tests** (`/** @jest-environment node */`, mock `@/lib/supabase/shift-island-viewer`, `@/lib/supabase/shift-island-rsvps`, `@/lib/supabase/shift-alumni-members`):
  - `401 when signed out`, `403 when not alumni`, `422 when closed`: `addIslandRsvp` not called.
  - `canRsvp with a linked application creates the confirmed member first`: `createAlumniMember("u1", { nickname, cohort })` called before `addIslandRsvp("u1", "Season 1")`; response ticket uses the created member.
  - `already going returns the same ticket without a second insert` (double tap): 200, `addIslandRsvp` not called.
  - `500 when the insert throws`, body has no `ticket`.
- [ ] **Step 2: Run** `pnpm test app/api/shift/island/rsvp`, expect FAIL.
- [ ] **Step 3: Implement.** Ticket for admins without a member is `MENTOR_TICKET`.
- [ ] **Step 4: Run the tests**, expect PASS.
- [ ] **Step 5: Commit** `feat(shift): island RSVP route`.

### Task 5: Page, root component and prologue

**Files:**
- Create: `app/shift/island/page.tsx`
- Create: `components/shift/island/IslandInvite.tsx` (client root)
- Create: `components/shift/island/IslandPrologue.tsx`
- Create: `components/shift/island/islandInvite.module.css`

**Interfaces:**
- Consumes: `loadIslandViewer`, copy from Task 2, `SHIFT_ISLAND.sample`.
- Produces: `<IslandInvite viewer={IslandViewer} festival={string} />`; scene state `"prologue" | "shore" | "letter"` held in `IslandInvite`; `<IslandPrologue lines={readonly string[]} onDone={() => void} />`.

- [ ] **Step 1: Read** `node_modules/next/dist/docs/` for App Router pages and metadata, and `docs/ui-design-system.md`.
- [ ] **Step 2: Page.** `export const dynamic = "force-dynamic"`; metadata title `"SHIFT High Island | เทศกาลเปิดเกาะ"`, `robots` noindex, OG image `/shift/island/island-sample.png`. Server computes `festivalLine()` and passes it as a prop (no `Date` on the client for first render). Viewer `going` starts on the letter scene with the ticket.
- [ ] **Step 3: Prologue.** Full-viewport island sample, `image-rendering: pixelated`, slow horizontal pan (CSS keyframes, 30s). Lines appear one at a time on "ต่อ" tap or scroll; "ข้าม" calls `onDone`. Reduced motion: no pan, all lines visible, one "ต่อ".
- [ ] **Step 4: Verify** with `pnpm dev`, open `http://localhost:3000/shift/island` at 360px and 1280px: prologue reads, skip works, no horizontal scroll, no console errors.
- [ ] **Step 5: Commit** `feat(shift): island invite page and prologue`.

### Task 6: Shore scene

**Files:**
- Create: `components/shift/island/BottleShore.tsx`
- Modify: `components/shift/island/islandInvite.module.css`

**Interfaces:**
- Produces: `<BottleShore onOpen={() => void} hint={string} />`.

- [ ] **Step 1: Implement.** Canvas sea at dusk (pixel bands, 2–3 wave rows, `requestAnimationFrame`, paused when off-screen or `document.hidden`), sand strip in CSS, bottle as an inline pixel SVG that drifts in and lands (CSS keyframes). The bottle is a `<button aria-label={hint}>`; tap or Enter pops the cork (keyframe), then `onOpen` after 600ms. Reduced motion: static sea, bottle already on the sand, `onOpen` immediate.
- [ ] **Step 2: Verify** in `pnpm dev`: tap, keyboard Enter, and reduced motion (DevTools emulation) all reach the letter; CPU idle when the tab is hidden.
- [ ] **Step 3: Commit** `feat(shift): island invite shore scene`.

### Task 7: Letter, seal and ticket

**Files:**
- Create: `components/shift/island/InviteLetter.tsx`, `WaxSeal.tsx`, `IslandTicket.tsx`
- Modify: `components/shift/island/islandInvite.module.css`

**Interfaces:**
- Consumes: `LETTER_CHAPTERS`, `SEAL`, `TICKET`, `IslandTree` + `ISLAND_STAGES` (tree chapter), `IslandViewer`, `POST /api/shift/island/rsvp`.
- Produces: `<InviteLetter festival={string}>{seal}</InviteLetter>`, `<WaxSeal viewer={IslandViewer} onGoing={(t: IslandTicket, discordUrl: string | null) => void} />`, `<IslandTicket ticket={IslandTicket} discordUrl={string | null} festival={string} />`.

- [ ] **Step 1: Letter.** Paper scroll that unrolls (clip-path + opacity + filter together, per the design system). Chapters reveal with `IntersectionObserver`; the festival chapter shows the `festival` prop under its body; the tree chapter renders `IslandTree`.
- [ ] **Step 2: Seal** by viewer kind: `signedOut` → link to `/login?next=%2Fshift%2Fisland` with `SEAL.signIn`; `notAlumni` → `SEAL.notAlumni` + link `/shift/apply` with `SEAL.applyCta`; `closed` → `SEAL.closed`; `canRsvp` → seal button with `SEAL.press`. On press: disable, show `SEAL.pending`, POST; 200 → stamp keyframe then `onGoing`; any other status or network error → re-enable and show `SEAL.error` (or the 422/403 message from the body). Never show a ticket without a 200.
- [ ] **Step 3: Ticket.** Replaces the seal: `TICKET.heading`, nickname, cohort, `festival`, and a Discord button when `discordUrl`, else `TICKET.noDiscord`.
- [ ] **Step 4: Verify** in `pnpm dev` for each state (signed out; a test account with no alumni record; an alumni account; same account reloaded shows the ticket; double-tap shows one ticket). Then check the row: `select * from shift_island_rsvps` via the Supabase dashboard after `supabase db push` (production, ask the user before pushing).
- [ ] **Step 5: Commit** `feat(shift): island invite letter, seal and ticket`.

### Task 8: Ship checks

- [ ] **Step 1:** Thai copy review per AGENTS.md (Antigravity for wording, Cursor for proofreading, Codex for logic); apply lines flagged by two or more, re-run Task 2 tests.
- [ ] **Step 2:** `pnpm lint && pnpm test && pnpm build`, all green.
- [ ] **Step 3:** Audit staged changes for secrets; confirm no home-page WIP is staged.
- [ ] **Step 4:** Ask the user before `supabase db push`; set `DISCORD_SHIFT_ISLAND_CHANNEL_URL` in Vercel if they have the channel link.
- [ ] **Step 5:** Push the branch and open the PR once the home-page work is on `main`; check the Vercel preview at phone width.
