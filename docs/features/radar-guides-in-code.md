# Career Radar guides in code: architecture and migration plan

**As of:** 2026-11-11. **Branch read:** `feat/radar-guide` in `/Users/bunyasit/dev/passionseed/web-radar-guide` (read only; another job is integrating it). Next.js 16.4.4.
**Inputs:** `docs/features/radar-guide.md` (the DB-chapter spec), the final cybersecurity guide design (`scratchpad/redesign/cybersecurity-guide.md`), and the branch code.

All paths are relative to the repo root.

---

## 0. Decisions in one screen

1. **Guides are code.** Each career with a guide is a typed TypeScript package in `lib/radar-guides/<slug>/` (pages, copy, facts, clip slots, reel plans, demo scripts). Its bespoke interactive components are in `components/radar/guides/<slug>/`. Shared shell and game engines are in `components/radar/guide/`. Nothing about a guide's pages is stored in the database.
2. **The database keeps only what people do:** visits, events, career requests, reels, short links, link clicks, comment DMs and reel insights. All of these tables are on the branch already. `chapter_key` columns now hold the **guide page key**. The values match the same CHECK (`^[a-z][a-z0-9_]{1,31}$`), so the columns are not renamed (section 4.4).
3. **Routes:**
   - `/radar/[slug]` shows the guide **cover** for careers with a live code guide. Every other career keeps the DB deck.
   - `/radar/[slug]/[page]` is generated from code with `generateStaticParams`, `dynamicParams = false` and `dynamic = "force-static"`.
   - The DB deck is still reachable for guide careers at `/radar/[slug]?view=deck`, and stays the default when the URL has `?from=plan`.
4. **Founder clips** are described by a committed manifest: `lib/radar-guides/<slug>/clips.json`, plus VTT files in `lib/radar-guides/<slug>/clips/<page>.vtt`. `pnpm radar:clip` writes both files. The video and poster are on B2 behind `cdn.passionseed.org`. No database writes.
5. **Removed before it ever reaches production:**
   - the `radar_guide_chapters` table and its migration
   - the chapter editor and chapter API
   - the script JSON push and pull pipeline
   - the 7-chapter regrouping of the deck: numbering, eyebrows, chapter sheet, chapter video sections and hash navigation

   Before deleting the migration file, confirm it has not been applied (section 4.4).
6. **Kept:**
   - attribution and utm handling
   - `/r` short links, which now resolve to page paths
   - guide events, which now carry page keys
   - the IG "radar" comment-to-DM campaign and DM fencing
   - the reel mapper, now mapping a reel to a career and page
   - the funnel views
   - the clip pipeline (ffmpeg, whisper, B2)
   - the motion reel engine, which can now film guide pages in demo mode

Two rules in the final cybersecurity design are changed here, because as written they break CI. Details are in section 6.

| Design rule | Problem | Change |
|---|---|---|
| Rule 0.7.4: the build fails when `asOf` is more than 45 days old | It would block every unrelated pull request to `main` after 45 days | The 45-day check runs only on PRs that touch guide content, plus a weekly scheduled check |
| "mytcas feed pulled at build time" | The build would depend on a network service, which AGENTS.md forbids | A committed snapshot, refreshed by a script |

---

## 1. Content model

### 1.1 Folder layout

```
lib/radar-guide/guide-types.ts            # ALL shared guide types (Unit 0, merged first)
lib/radar-guide/guide-lint.ts             # pure fact/copy checks used by Jest and `radar:check`
lib/radar-guide/guide-state.ts            # localStorage store + useGuideState hook (client)
lib/radar-guide/demo.ts                   # isDemoMode(), demo player clock helpers (client)

lib/radar-guides/
  index.ts                                # GUIDE_INDEX: light metadata only (safe for client/admin bundles)
  registry.server.ts                      # "server-only": loadGuide(slug) -> CareerGuide, liveGuideSlugs()
  facts.ts                                # mergeFacts(): _shared + per-career, unique ids asserted
  banned.ts                               # global Must-not-say list (house rules + cross-career)
  _shared/facts.ts                        # facts reused by several careers (ISC2, Adecco, BLS, TDRI...)
  __tests__/guides.test.ts                # runs guide-lint over every guide (see 5.3)
  cybersecurity/
    meta.ts                               # GuideIndexEntry (keys, titles, minutes, alias, accent, status)
    guide.ts                              # CareerGuide = meta + pages + banned claims
    pages/mythos.ts … pages/next.ts       # one GuidePage per file
    facts.ts                              # Fact[] for this career
    banned.ts                             # career-specific Must-not-say
    tcas.json                             # committed mytcas snapshot (pnpm radar:tcas cybersecurity)
    clips.json                            # ClipManifest, written by pnpm radar:clip
    clips/<page>.vtt                      # captions, written by radar:clip, editable in PRs

components/radar/guide/                   # shared (exists today; chapter pieces removed)
  shell/  GuideShellProvider.tsx, GuideTopRail.tsx, PageMapSheet.tsx, GuideStickyNav.tsx,
          SourcesChip.tsx, GuidePageView.tsx (server), BlockRenderer.tsx (server),
          GameIsland.tsx (client), BespokeIsland.tsx (client), GuideClip.tsx (client),
          GuideCover.tsx (server), LegacyHashRedirect.tsx (client), ResumeChip.tsx, DemoPlayer.tsx
  games/  FindLine.tsx, GuessReveal.tsx, SortGame.tsx, FlipCards.tsx, DateToggle.tsx,
          LadderRebuild.tsx, BinaryChoice.tsx, ProgrammeFilter.tsx, FakeTerminal.tsx,
          EvidenceMaker.tsx, RecapCard.tsx, index.ts (ENGINE_LOADERS), engine-shell.tsx (skip link, timer toggle)
  (kept) CaptionOverlay, CareerRequestForm, FollowButton, GuideOutro (intent + program line),
         GuideSheet, MidShareCard, ShareButtons, SourcesSheet, TranscriptSheet, usePlaybackManager, guide.css

lib/radar-guide/games/<engine>.ts         # pure reducers + scoring for each engine (tested without DOM)

components/radar/guides/
  registry.ts                             # slug -> () => import("./<slug>") (client)
  cybersecurity/index.ts                  # BESPOKE: id -> next/dynamic loader
  cybersecurity/BirthYearTimeline.tsx, BucketPipe.tsx, ThisWeekStrip.tsx, SchoolSiteCard.tsx, ...
```

The final design named the paths `lib/content/radar-guide/cybersecurity.ts` and `components/radar/guide/cyber/`. They map onto the layout above. Pages are one file each, so that several people can edit pages in parallel with few conflicts.

**Bundle rule.** Only server components import `lib/radar-guides/<slug>/guide.ts` and `pages/*`. A client island receives only the JSON for its own block as props. Two things enforce this:
- An ESLint `no-restricted-imports` rule for files under `components/**` that start with `"use client"`, banning `@/lib/radar-guides/*/pages/*`, `*/guide` and `registry.server`.
- A Jest test that greps for the same imports.

Admin pages and client chrome use `lib/radar-guides/index.ts`, which carries metadata only.

### 1.2 Shared types: `lib/radar-guide/guide-types.ts` (exact)

```ts
/**
 * Code-authored Career Radar guides. Shared by content (lib/radar-guides/**),
 * the shell and engines (components/radar/guide/**), scripts and admin.
 * Additive changes only once merged.
 */
import type { GuideTracker } from "./types";

// ---------------------------------------------------------------- primitives
export type IsoDate = `${number}-${number}-${number}`;          // "2026-11-11"
export type IsoMonth = `${number}-${number}`;                    // "2026-04"
export type IsoDateTime = `${number}-${number}-${number}T${string}`; // "2027-01-28T16:30:00+07:00"
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };

/** Same as the SQL CHECK on radar_guide_events.chapter_key / radar_links.chapter_key. */
export const GUIDE_PAGE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;
/** Never usable as page keys: /r channel suffixes and route words. */
export const RESERVED_PAGE_KEYS = ["ig", "tt", "yt", "story", "deck", "cover", "overview"] as const;

export type GuideStatus = "draft" | "live"; // draft: rendered on preview/dev builds only

// ---------------------------------------------------------------- index (light)
export interface GuideIndexPage {
  key: string;            // GUIDE_PAGE_KEY_PATTERN, unique within the guide
  order: number;          // 1-based, contiguous
  titleTh: string;
  navLabelTh: string;     // short label for the page map sheet
  minutes: number;        // estimated, drives "เหลือราว N นาที"
  legacyHashes?: readonly string[]; // old deck hashes that land here, e.g. ["reality","day"]
}
export interface GuideIndexEntry {
  slug: string;           // = radar_fields.slug (must exist and be published, see 5.3)
  alias: string;          // /r alias, e.g. "cyber"
  nameTh: string;
  nameEn: string;
  accent: string;         // hex, fed to --radar-accent
  status: GuideStatus;
  asOf: IsoDate;          // newest page asOf
  intentPathSlug: string; // pathSlug passed to recordRadarPathIntent on the `next` page
  shareCardAfter?: string;// page key the mid-deck share card follows ("money")
  pages: readonly GuideIndexPage[];
}

// ---------------------------------------------------------------- facts
export type FactBadge = "confirmed" | "vendor" | "pending" | "simulated";
export const FACT_BADGE_TH: Record<FactBadge, string> = {
  confirmed: "ยืนยันแล้ว",
  vendor: "ตัวเลขจากบริษัทเจ้าของเอง",
  pending: "ยังรอตรวจสอบ",
  simulated: "จำลอง",
};
export type FactId = `f.${string}` | `sim.${string}`;
export interface FactSource {
  outlet: string;                 // "Mozilla Hacks"
  url: `https://${string}`;
  publishedAt: IsoDate | IsoMonth;
  title?: string;
}
export interface Fact {
  id: FactId;
  claimEn: string;                // what we claim, in plain English, for reviewers
  /** Exact tokens Thai copy may print for this fact: "423", "271", "20 ถึง 30", "35,500". */
  values?: readonly string[];
  sources: readonly FactSource[]; // >= 1 unless badge === "simulated"
  asOf: IsoDate;
  badge: FactBadge;
  usOnly?: boolean;               // shows "สหรัฐฯ"
  ourMath?: boolean;              // shows "เราคำนวณเอง"
  drawerOnly?: boolean;           // may be cited by the sources drawer, never by copy text
  note?: string;
}

// ---------------------------------------------------------------- copy
export type CopyLabel = "usOnly" | "ourMath" | "teamView" | "checkCurriculum";
export const COPY_LABEL_TH: Record<CopyLabel, string> = {
  usOnly: "สหรัฐฯ", ourMath: "เราคำนวณเอง", teamView: "ความเห็นทีมเรา", checkCurriculum: "เช็กหลักสูตรจริง",
};
export interface CopyText {
  th: string;                     // no em/en dash, no น้องๆ, every digit backed (guide-lint)
  factIds?: readonly FactId[];    // facts this sentence relies on (digits are checked against these)
  badge?: FactBadge;              // shown inline next to the text
  labels?: readonly CopyLabel[];
}
export type CopyRole =
  | "hero" | "sub" | "intro" | "body" | "card" | "quote" | "honesty" | "exit" | "update" | "caption";

// ---------------------------------------------------------------- demo (reels)
export type DemoStep =
  | { at: number; action: "tap"; target: string }               // [data-demo="<target>"]
  | { at: number; action: "type"; target: string; text: string }
  | { at: number; action: "scroll"; target: string }
  | { at: number; action: "wait" };

// ---------------------------------------------------------------- games
export type GradeKey = "m4" | "m5" | "m6";

export interface GameTrack {
  /** interactive_tap target for completion, "<pageKey>:<action>", e.g. "triage:done". */
  done: string;
  /** How value_int is computed on done. */
  value: "score" | "attempts" | "bucket" | "count" | "bitmask" | "index" | "none";
  /** Extra milestone targets the engine may fire, by engine-defined name. */
  milestones?: Readonly<Record<string, string>>;
}

export interface FindLineData {
  captionTh: string; simulatedFactId: FactId;
  lines: readonly { n: number; code: string }[];
  answer: number;
  nearMissTh: Readonly<Record<number, string>>;   // line -> feedback
  hintsTh: readonly [string, string];
  outlineOnHint2: readonly number[];
  onFound: { counter?: { to: number; captionTh: string; factId: FactId }; explanationTh: string };
}
export interface GuessRevealData {
  promptTh: string; min: number; max: number; step: number;
  unit: "baht" | "count";
  answer: number; answerFactId: FactId;
  buckets: readonly number[];                      // ascending upper bounds; value_int = index
  chart:
    | { kind: "bars"; band?: { from: number; to: number; labelTh: string };
        bars: readonly { labelTh: string; value: number | null; segment?: { value: number; labelTh: string } }[] }
    | { kind: "axis"; markers: readonly { labelTh: string; value: number; strong?: boolean }[];
        shade?: { from: number; to: number }; gapLabelTh?: string };
  nearTh: string; overTh: string; underTh: string; nearWithin: number; // "เกือบเป๊ะ", "{d}" templates
  revealTh: string;
}
export interface SortItem {
  id: string; labelTh: string;
  meta?: Readonly<Record<string, string>>;         // time, sender, AI label, confidence...
  detailTh?: string;                               // evidence on expand
  answer: string | readonly string[];              // bin id(s) counted as correct
  nearTh?: Readonly<Record<string, string>>;       // bin id -> "ใกล้แล้ว..."
  revealTh: string;
  flags?: readonly string[];
  scored?: boolean;                                // default true
}
export interface SortGameData {
  layout: "cards" | "queue" | "chat";
  goalTh?: string;
  bins: readonly { id: string; labelTh: string }[];
  items: readonly SortItem[];
  timer?: { seconds: number; labelTh: string };    // always optional, "ไม่จับเวลา" toggle
  simulated?: { factId: FactId; watermarkTh?: string };
  resultTh: string;                                // "{score}/{total}" template
  outcomesTh?: Readonly<Record<string, string>>;   // keyed by engine-defined outcome ids
}
export interface FlipCardsData {
  highlightTh: string;
  cards: readonly { id: string; frontTh: string; backTh: string; dateTh: string; factIds: readonly FactId[] }[];
}
export interface DateToggleData {
  chips: readonly { id: string; labelTh: string }[];
  columns: readonly { id: string; labelTh: string }[];
  cells: Readonly<Record<string, Readonly<Record<string, { open: boolean; noteTh?: string }>>>>;
  factIds: readonly FactId[];
}
export interface LadderRebuildData {
  rungsTh: readonly string[]; fadeCount: number;
  aiCaption: CopyText; newRungsTh: readonly string[]; newCaption: CopyText;
  proofChips: readonly { id: string; labelTh: string; evidenceTh: string }[]; pick: number;
}
export type FitOutcome = "A" | "B" | "C";
export interface BinaryChoiceData {
  questions: readonly { id: string; leftTh: string; rightTh: string;
    left: Partial<Record<FitOutcome, number>>; right: Partial<Record<FitOutcome, number>> }[];
  outcomes: Readonly<Record<FitOutcome, { titleTh: string; bodyTh: string }>>;
  disclaimerTh: string;
}
export interface ProgrammeCard {
  id: string;                       // mytcas program id
  uniTh: string; degreeTh: string; track: "thai" | "intl" | "special";
  rounds: readonly ("portfolio" | "quota" | "admission" | "direct")[];
  seats?: number; minGpax?: number;
  deadline?: { at: IsoDateTime; labelTh: string };  // countdown for m6 only
  badge: FactBadge; factIds: readonly FactId[];
  href: `https://${string}`;
  noteTh?: string;
  cyberInName: boolean;
}
export interface ProgrammeFilterData {
  gradeQuestionTh: string;
  gradeBannersTh: Readonly<Record<GradeKey, string>>;
  extraChecklistTh?: Readonly<Partial<Record<GradeKey, readonly string[]>>>;
  programmes: readonly ProgrammeCard[];           // featured ones, hand-checked
  snapshot: "tcas.json";                          // remaining feed programmes come from the committed snapshot
  broadRoutes: readonly { labelTh: string; href: string }[];
  fitOrder: Readonly<Record<FitOutcome, "cyberFirst" | "broadFirst" | "both">>;
}
export interface FakeTerminalData {
  labelTh: string; simulatedFactId: FactId;
  files: Readonly<Record<string, readonly string[]>>;  // filename -> lines (hidden files start with ".")
  commands: readonly { match: readonly string[]; output: readonly string[] | { file: string; head?: number; grep?: string; count?: boolean };
    effect?: "scopeRead" | "outOfScope" | "flag" | "clear"; requiresScope?: boolean; noteTh?: string }[];
  unknownTh: string;
  missions: readonly { id: number; titleTh: string; doneWhen: string; question?: { promptTh: string; options: readonly string[]; answer: string }; feedbackTh?: string }[];
  decision: { options: readonly { id: string; labelTh: string; correct: boolean; feedbackTh: string }[] };
  poll: { prompt: CopyText; options: readonly { id: string; labelTh: string }[]; reveal: CopyText };
}
export interface EvidenceMakerData {
  room: { titleTh: string; href: `https://${string}`; badgeTh: string; subTh: string; factIds: readonly FactId[] };
  checklistTh: readonly string[];
  fields: readonly { id: string; placeholderTh: string }[];
  fixedLinesTh: readonly string[];
  includeProofFrom?: string;        // page key whose proof picks are listed under "แผนของฉัน"
  privacyTh: string;
}
export interface RecapCardData {
  lines: Readonly<Record<string, string>>;           // page key -> template ("{attempts}", "{x}")
  favourites: Readonly<Record<string, string>>;      // page key -> "สายที่เธอเลือกเอง: ..."
  cardLineTh: string;
}

export type GameSpec =
  | { engine: "FindLine"; data: FindLineData }
  | { engine: "GuessReveal"; data: GuessRevealData }
  | { engine: "SortGame"; data: SortGameData }
  | { engine: "FlipCards"; data: FlipCardsData }
  | { engine: "DateToggle"; data: DateToggleData }
  | { engine: "LadderRebuild"; data: LadderRebuildData }
  | { engine: "BinaryChoice"; data: BinaryChoiceData }
  | { engine: "ProgrammeFilter"; data: ProgrammeFilterData }
  | { engine: "FakeTerminal"; data: FakeTerminalData }
  | { engine: "EvidenceMaker"; data: EvidenceMakerData }
  | { engine: "RecapCard"; data: RecapCardData };
export type EngineId = GameSpec["engine"];
export type EngineData<E extends EngineId> = Extract<GameSpec, { engine: E }>["data"];

// ---------------------------------------------------------------- blocks and pages
export type GuideBlock =
  | { kind: "copy"; id: string; role: CopyRole; text: CopyText; titleTh?: string; collapsed?: boolean }
  | { kind: "game"; id: string; game: GameSpec; track: GameTrack;
      /** Static answers rendered by the server (no-JS and "ข้ามเกม ดูเฉลย"). */
      answersTh: readonly string[];
      demoScript?: readonly DemoStep[]; collapsed?: boolean; phase?: 1 | 2 }
  | { kind: "bespoke"; id: string; component: string; props?: JsonObject;
      factIds?: readonly FactId[]; simulated?: boolean; fallbackTh: readonly string[];
      track?: GameTrack; demoScript?: readonly DemoStep[]; phase?: 1 | 2 }
  | { kind: "beat"; id: string; unlockLabelTh: string; blocks: readonly GuideBlock[] } // in-page "ต่อ"
  | { kind: "clip"; id: string }                                  // where page.clip renders
  | { kind: "safety"; id: string; lineTh: string }                // fixed, never dismissable
  | { kind: "link"; id: string; labelTh: string; href: `https://${string}`; cta: "first-step" | "program" | "other-career" }
  | { kind: "shareCard"; id: string }
  | { kind: "outro"; id: string };                                // intent + request + share + follow + program + other careers

export interface ClipSlot {
  seconds: number;
  hookTh: string;                  // on-screen hook
  scriptLinesTh: readonly string[];// teleprompter lines; also the caption text radar:clip aligns
  required: boolean;               // live guide fails `radar:check` (not Jest) while missing
  safety: boolean;                 // founder face on screen for a safety line
  factIds: readonly FactId[];
}
export interface ReelPlan {
  format: "founder" | "motion" | "demo";
  hook: CopyText;
  variantsTh: readonly [string, string];
  sendToFriendTh: string;
  visual: readonly string[];       // shot list for the editor / motion scenes
}
export interface GuidePage {
  key: string; order: number;
  titleTh: string; questionTh: string; navLabelTh: string;
  asOf: IsoDate; minutes: number;
  blocks: readonly GuideBlock[];
  /** Everything the sources drawer lists, including drawerOnly facts. Copy-level factIds must be a subset. */
  factIds: readonly FactId[];
  clip?: ClipSlot;
  reel?: ReelPlan;
  legacyHashes?: readonly string[];
  showsHacking?: boolean;          // requires a `safety` block (guide-lint)
  og: { headlineTh: string; stat?: CopyText };
}
export interface BannedClaim { pattern: RegExp; reason: string; scope?: "all" | "copy" | "clip" | "reel" }
export interface CareerGuide {
  meta: GuideIndexEntry;
  pages: readonly GuidePage[];
  facts: readonly Fact[];          // career facts; shared facts are merged by lib/radar-guides/facts.ts
  banned: readonly BannedClaim[];
}

// ---------------------------------------------------------------- media (clips.json)
export interface ClipMedia {
  videoUrl: string;                // RADAR_GUIDE_VIDEO_URL_PATTERN (radar/guide/<slug>/<page>.<sha8>.mp4)
  posterUrl: string;               // RADAR_GUIDE_POSTER_URL_PATTERN
  captionsFile: `clips/${string}.vtt`;
  durationS: number;
  sha8: string;
  recordedAt: IsoDate;
  scriptHash: string;              // sha256(scriptLinesTh.join("\n")).slice(0, 12) at recording time
}
export type ClipManifest = Readonly<Record<string /* page key */, ClipMedia>>;

// ---------------------------------------------------------------- runtime (client)
export interface GameResult {
  done: boolean; skipped?: boolean;
  score?: number; total?: number; attempts?: number; ms?: number;
}
export interface GuideState {
  v: 1;
  visited: string[];
  grade?: GradeKey;
  games: Record<string, GameResult>;          // key: "<pageKey>:<blockId>"
  choices: Record<string, string>;            // "doors:card3": "redteam"
  fit?: FitOutcome | `${FitOutcome}${FitOutcome}`;
  proof?: string[];
  shortlist?: string[];
  favourite?: string;
  checklist?: Record<string, boolean[]>;
  /** Device-only and never sent: birth year, GPAX, terminal progress, write-up drafts. */
  local?: { birthYear?: number; gpax?: number; drafts?: Record<string, Record<string, string>>; [k: string]: Json | undefined };
}
export const GUIDE_STATE_KEY = (slug: string) => `radar-guide:v1:${slug}`;

export interface EngineProps<E extends EngineId> {
  slug: string; pageKey: string; blockId: string;
  data: EngineData<E>; track: GameTrack;
  tracker: GuideTracker;           // NOOP in demo mode
  demo: boolean; reducedMotion: boolean;
  skipped: boolean;                // "ข้ามเกม ดูเฉลย" pressed: render the solved state
  onResult(result: GameResult): void;
}
export interface BespokeProps<P extends JsonObject = JsonObject> {
  slug: string; pageKey: string; blockId: string; props: P;
  tracker: GuideTracker; demo: boolean; reducedMotion: boolean;
  onResult?(result: GameResult): void;
}
```

`lib/radar-guide/types.ts` gains, as additive changes only in Unit 0:
- `export type GuidePageKey = string`
- `export const RADAR_PAGE_KEY_PATTERN = RADAR_CHAPTER_KEY_PATTERN`
- `GuideEventInput.pageKey?: string`

The chapter-only types are removed last, in Unit 6 (section 5).

### 1.3 Facts and copy checks (`lib/radar-guide/guide-lint.ts`)

These are pure functions. They reuse `findDashes` and `containsNumber` from `lib/radar-guide/thai-copy.ts`, and return `{level: "error" | "warn", pageKey, path, message}[]`.

1. **Dashes and tone.** No `—` or `–` in any `*Th` string, `CopyText.th`, `scriptLinesTh`, reel hook or variant. No `น้องๆ` or `น้อง ๆ`.
2. **Every digit needs a claim.**
   - Each number token in `CopyText.th` (Arabic or Thai digits, with commas or decimals) must appear, comma-normalised, in `values` or `claimEn` of a fact in that `CopyText.factIds`. If the text has no factIds of its own, the page's `factIds` are used.
   - Exempt tokens:
     - `ม.\d`, `TCAS7\d`, `รอบ \d`
     - `{placeholders}`
     - `/11`-style progress, which is rendered by the shell and never authored
     - text in engine data whose block declares `simulated` (it must cite a `sim.*` fact)
   - Spelled-out numbers (`สามหมื่น`) are warnings in copy and errors in `scriptLinesTh`, because captions are spoken numbers.
3. **Registry completeness.**
   - Every `factIds` entry resolves.
   - Every non-simulated fact has at least one `https` source with `outlet` and `publishedAt`, plus `asOf` and `badge`.
   - Copy may not cite a `drawerOnly` fact.
   - Fact ids are unique across `_shared` and all careers.
4. **Staleness** (changed from the design, see section 6):
   - `guide-lint` returns an error when `asOf` is after the run date.
   - It returns a warning above 45 days and an error above 120 days.
   - `radar:check --max-age 45` turns the warning into an error. CI runs it only on PRs touching `lib/radar-guides/**`, and a weekly scheduled workflow runs it too.
5. **Banned claims.** Global and career patterns are checked against copy, clip scripts, reel hooks and variants, OG headlines and engine data strings.
6. **Countdowns.** Every `deadline.at` has an explicit offset. A unit test runs `countdownLabel()` with the clock mocked at 2026-11-17 and 2027-01-29, and expects "ปิดแล้ว", never a negative number.
7. **Structure.**
   - Page keys match the pattern and are not reserved.
   - `order` is contiguous.
   - `meta.pages` equals the pages' `{key, order, titleTh, navLabelTh, minutes, legacyHashes}`.
   - At most one `clip` block, and only if `page.clip` is set.
   - Block ids are unique within a page.
   - A `showsHacking` page has a `safety` block.
   - Every bespoke `component` exists in `components/radar/guides/<slug>/index.ts`. This is checked by a Jest test, because `lib` cannot import components.
   - Every `demoScript` target exists: an RTL render test queries `[data-demo]`.
   - Game blocks are skippable, so `answersTh` is non-empty.
8. **Clips.**
   - Every key in `clips.json` has a page with `clip`.
   - `videoUrl` and `posterUrl` match the CDN patterns.
   - The VTT file exists, parses, starts with `WEBVTT` and is at most 20KB.
   - `scriptHash` equals the current hash. Otherwise the error is "script changed after recording: re-record or revert".
   - A `required` clip missing on a `live` guide is an error in `radar:check` only. It is not a Jest error, so content PRs can merge before recording.
9. **Event targets.** Every `track.done` and milestone matches `GUIDE_EVENT_TARGET_PATTERN` and starts with `<pageKey>:`.

---

## 2. Routing (Next 16)

Read before coding:
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`
- `…/03-file-conventions/02-route-segment-config/dynamicParams.md`
- `…/04-functions/generate-metadata.md`
- `…/03-file-conventions/01-metadata/opengraph-image.md`
- `…/02-guides/caching-without-cache-components.md`

`cacheComponents` is off in `next.config.mjs`, so `dynamicParams` is available.

### 2.1 Files

```
app/radar/[slug]/page.tsx                    # CHANGE: cover for live code guides, DB deck otherwise
app/radar/[slug]/opengraph-image.tsx         # CHANGE: code-guide branch first (no DB for guide careers)
app/radar/[slug]/loading.tsx                 # keep (deck skeleton)
app/radar/[slug]/(guide)/layout.tsx          # NEW: persistent shell across pages (route group, no URL segment)
app/radar/[slug]/(guide)/[page]/page.tsx     # NEW: one guide page
app/radar/[slug]/(guide)/[page]/loading.tsx  # NEW: in-shell placeholder, so the deck skeleton never flashes
app/radar/[slug]/(guide)/[page]/opengraph-image.tsx  # NEW: per-page OG from code
app/studio/radar-guide/[slug]/[page]/page.tsx        # NEW: 1080x1920 filming frame (non-production)
```

**The route group.**
- `(guide)` holds a layout that wraps only `[page]`, so the shell does not remount when the student moves between pages. A layout inside `[page]/` would remount on every page change.
- `app/radar/[slug]/page.tsx` stays outside the group, so the two never resolve to the same path.
- Static siblings (`keep`, `skills`, `territory`) win over `[slug]`, so no career slug may be `keep`, `skills` or `territory`. A guide-lint check enforces this.

### 2.2 `app/radar/[slug]/(guide)/[page]/page.tsx`

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePageView } from "@/components/radar/guide/shell/GuidePageView";
import { guideStaticParams, loadGuidePage } from "@/lib/radar-guides/registry.server";

// Pages come from code only. Unknown slug/page pairs 404 without rendering.
export const dynamicParams = false;
// The root layout reads cookies (supabase.auth.getSession, value unused). force-static makes
// cookies() empty here so the page prerenders at build. Precedent: app/epic-sprint/page.tsx.
export const dynamic = "force-static";

type Params = Promise<{ slug: string; page: string }>;

export function generateStaticParams() {
  // Live guides always; draft guides too unless VERCEL_ENV === "production".
  return guideStaticParams(); // [{ slug: "cybersecurity", page: "mythos" }, ...]
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, page } = await params;
  const hit = loadGuidePage(slug, page);
  if (!hit) return {};
  const { guide, page: p } = hit;
  const title = `${p.titleTh} | ${guide.meta.nameTh} | Career Radar`;   // absolute: skip "%s | PassionSeed"
  const canonical = `/radar/${slug}/${p.key}`;
  return {
    title: { absolute: title },
    description: p.questionTh,
    alternates: { canonical },
    openGraph: { title, description: p.questionTh, url: canonical, type: "article", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description: p.questionTh },
  };
}

export default async function GuidePageRoute({ params }: { params: Params }) {
  const { slug, page } = await params;
  const hit = loadGuidePage(slug, page);
  if (!hit) notFound();
  return <GuidePageView guide={hit.guide} page={hit.page} clip={hit.clip} facts={hit.facts} />;
}
```

`registry.server.ts`:
- Uses static imports, not dynamic `import()`, so the bundler can see every guide:

  ```ts
  const GUIDES = { cybersecurity: cybersecurityGuide } satisfies Record<string, CareerGuide>
  ```

- `loadGuidePage` resolves:
  - the page's facts, through `mergeFacts`
  - the clip, as `{ slot, media, cues }`. `cues` come from reading `clips/<page>.vtt` with `fs.readFileSync(path.join(process.cwd(), "lib/radar-guides", slug, media.captionsFile))`.
- Add `"/radar/**": ["./lib/radar-guides/**/clips/*.vtt"]` to `outputFileTracingIncludes` in `next.config.mjs`. Pages prerender at build, but the OG route and any later re-render must still find the files.

**What renders where.** `GuidePageView` is a server component. It renders:
- the question and the copy
- the fact list for the sources sheet
- the safety lines
- each game's `answersTh` as static text, inside the island's fallback

`GameIsland`, a client component:
- swaps in the engine, loaded through `ENGINE_LOADERS[engine]` (`next/dynamic` with `ssr: false`, which is allowed in a client component)
- starts loading after the hero is painted, on `requestIdleCallback` or when the block is near the viewport
- gives each engine its own chunk

`BespokeIsland` does the same through `components/radar/guides/registry.ts`.

No WebGL on guide pages.

### 2.3 `app/radar/[slug]/(guide)/layout.tsx`

It is a server component. It reads `params.slug` and renders `<GuideShellProvider index={GUIDE_INDEX[slug]}>`. The provider is a client component that:
- runs `useRadarVisit(slug)`. The visit key is the slug, so the whole guide is one visit, and the utm tags are captured on the landing page and then stripped.
- turns the tracker into `NOOP_GUIDE_TRACKER` when `isDemoMode()` (`?demo=1`, read in the browser only)
- owns the `useGuideState(slug)` store (localStorage, try/catch; in-memory in demo mode)
- owns `PlaybackManagerProvider` (the existing `usePlaybackManager`)
- renders the top rail (11 dots, "4/11 · เหลือราว 6 นาที"), the page map sheet, the "เริ่มจากหน้าแรก (1/11)" chip when entering mid-guide, and the sticky bar ("ต่อ" plus a back arrow, no edge swipes)
- reads the current page with `useSelectedLayoutSegment()`
- fires `chapter_view` with `pageKey` once per visit and page, when the page becomes visible
- prefetches the next page's route

### 2.4 `app/radar/[slug]/page.tsx` (cover or DB deck)

```tsx
const [{ slug }, { from, view }] = await Promise.all([params, searchParams]);
const guide = liveGuideIndex(slug);            // GUIDE_INDEX entry if status allows on this deployment
if (guide && from !== "plan" && view !== "deck") return <GuideCover index={guide} />;
// ... existing DB deck path unchanged (minus chapters, see 4.3)
```

- **`GuideCover`** is a server component with:
  - the guide's opening hook
  - the page map with titles and minutes
  - the "ข้อมูล ณ …" chip
  - "เริ่มไกด์" linking to the first page
  - "ข้อมูลครบแบบเดิม", linking to `?view=deck`
- **Client pieces on the cover.**
  - `LegacyHashRedirect` runs first. When the hash matches any page's `legacyHashes` (`#hook`→`mythos`, `#reality`/`#day`→`triage`, `#ai`→`firstjob`, `#money`→`money`, `#study`→`tcas`, `#start`→`tonight`, `#outro`→`next`), it calls `location.replace(`/radar/${slug}/${page}${location.search}`)`, keeping the utm tags.
  - `GuideVisitBeacon` (`useRadarVisit(slug)`) mounts only once no redirect is pending, so the landing visit is recorded with its tags on whichever page the student actually sees.
- **Why the cover takes over `/radar/[slug]`.** The final design kept the deck at `/radar/cybersecurity`. The founder's direction is that the radar for these careers is the interactive guide, and hub tiles, bio links, OG previews and shares all land on `/radar/<slug>`. The deck stays one tap away (`?view=deck`), and the plan flow (`?from=plan`) is unchanged. **This needs founder confirmation.** Reverting is a one-line change: drop the `guide &&` branch and add a "เริ่มไกด์" banner to the deck instead.
- **`generateMetadata` and `opengraph-image.tsx`** check `liveGuideIndex(slug)` first:
  - The cover title is `{ absolute: "${nameTh} ไกด์ 11 หน้า | Career Radar" }`, and the image uses the hook stat from the first page's `og`.
  - Other careers keep the DB metadata.
- **Careers without a code guide:**
  - Nothing changes at `/radar/<slug>`.
  - `/radar/<slug>/<anything>` returns 404 (`dynamicParams = false`).
  - `/r` codes with a page that does not exist resolve to `/radar/<slug>` (section 4.2).

### 2.5 Per-page OG image

`(guide)/[page]/opengraph-image.tsx` copies the existing `app/radar/[slug]/opengraph-image.tsx` (ImageResponse, Kodchasan, `OG_SIZE`). Differences:
- It reads `page.og.headlineTh` and `og.stat` from code.
- It exports `generateStaticParams = guideStaticParams` and needs no DB.
- Its `alt` is generic, because an `alt` export is static per segment.

Confirm in the `pnpm build` output that both the page and the image show as prerendered (●), not dynamic (ƒ).

### 2.6 Sitemap

`app/sitemap.ts` adds the cover and every page of each live guide, with `lastModified = page.asOf`.

---

## 3. Founder clips without the database

**Source of truth.**
- `ClipSlot` in the page file (`scriptLinesTh`, hook, seconds, required, safety) is the script.
- `lib/radar-guides/<slug>/clips.json` holds the recorded media.
- `lib/radar-guides/<slug>/clips/<page>.vtt` holds the captions, which are reviewed and edited in PRs.

All three are committed, so a clip appears on the page only after a PR is merged and the preview has been checked. That is the publish gate that `radar_guide_chapters.status` used to provide.

**`pnpm radar:clip <slug> <page> <input.mov> [--dry-run] [--no-whisper] [--out dir]`** (changes to `scripts/radar-guide/clip.ts`):
1. Loads `loadGuide(slug)` through tsx and fails if the page has no `clip`.
2. Keeps the existing ffprobe, HLG tone-map, master, web clip (540x960, about 1.2 Mbps, faststart), webp poster (under 60KB) and whisper steps (`lib/radar-guide/caption-align.ts`, `vtt.ts`, `scripts/radar-guide/lib/media.ts`).
3. Aligns `clip.scriptLinesTh` to the whisper cues (`alignScriptToCues`), keeping whisper's times and our text, and builds the VTT.
4. Uploads to B2 with `putImmutable`, using the keys:
   - `radar/guide/<slug>/<page>.<sha8>.mp4`
   - `radar/guide/<slug>/<page>.<sha8>.webp`

   These match `RADAR_GUIDE_VIDEO_URL_PATTERN` and `RADAR_GUIDE_POSTER_URL_PATTERN` unchanged, because page keys are `[a-z0-9_]+`.
5. Writes `lib/radar-guides/<slug>/clips/<page>.vtt` and updates `clips.json`: sorted keys, 2-space JSON, with `scriptHash`, `durationS`, `sha8` and `recordedAt`.
6. Writes the clean 1080x1920 master, the `.vtt` and `<page>.cuts.json` to `~/Movies/radar-guide/<slug>/` for the Dusk City edit, as today.
7. Prints "commit lib/radar-guides/<slug>/clips.json and clips/<page>.vtt in a PR".
8. Makes no Supabase calls. The `serviceClient` import is removed.

**Teleprompter.**
- New route: `app/admin/radar/guide/[slug]/teleprompter/page.tsx`. It is admin only (`requireAdmin`) and reads `loadGuide(slug)` on the server.
- It feeds the existing `components/admin/radar/RadarTeleprompter.tsx`, adapted to `{pageKey, titleTh, hookTh, scriptLinesTh, safety, required}`.
- The recording order comes from `clip.required`, then `safety`, then page order.
- `?all=1` prints the whole list.
- `lib/radar-guide/teleprompter.ts` changes to `teleprompterPages(guide)`, a pure function with a test.

**On the page.**
- `GuideClip.tsx` is the old `ChapterVideo.tsx`, renamed and changed to take `{ slot, media, cues }`.
- It renders where the page's `clip` block sits.
- Behaviour:
  - It autoplays muted and inline only when it is the first clip of the visit and has been at least 60% visible for 700ms, with no reduced motion and no Save-Data.
  - Tapping turns the sound on.
  - Captions are on by default.
  - "อ่านสิ่งที่พูด" opens the `TranscriptSheet`, built from `cueTranscript(cues)`.
  - Events: `video_*` with `pageKey`.
- Pages work without the clip. With no media the slot renders nothing, except the `safety` line, which is always in the copy.

**Reels filmed from pages.**
- `app/studio/radar-guide/[slug]/[page]/page.tsx`:
  - returns `notFound()` when `VERCEL_ENV === "production"`, with `robots: noindex`
  - renders `GuidePageView` inside a 432x768 CSS viewport (deviceScaleFactor 2.5 = 1080x1920) with `demo` forced on
  - draws IG safe-zone guides only in non-render mode
  - shows a hook title card from `page.reel.hook` and the end card "คอมเมนต์ RADAR รับลิงก์ทาง DM" with the send-to-friend line
  - reuses `components/radar/reel/parts.tsx`, `EndCard`, `fonts.ts` and `duskCity.ts`
  - makes no Supabase calls. Code content is allowed, so no `window.__RADAR_REEL__` injection is needed.
- `pnpm radar:reel <slug> --page <key> [--platform ig|tt] [--format demo|motion]`:
  - **demo:** Playwright opens the studio route and enables Chrome virtual time through CDP (`Emulation.setVirtualTimePolicy({ policy: "pause" })`). For each frame it advances the budget by 33.33ms and takes a screenshot, and pipes the frames to ffmpeg. `DemoPlayer` runs the page's `demoScript` steps on `setTimeout`, clicking `[data-demo=...]`. Virtual time makes timers and CSS animations deterministic without changing any engine. If virtual time proves flaky with React scheduling, fall back to `page.video` real-time capture and say so in the CLI.
  - **motion:** the existing scene reel (`buildRadarReelPayload`), now fed from guide data (section 4.3).
  - Audio, loudnorm and faststart stay as today.

---

## 4. Keep, change, delete

Status of the branch: all Radar Guide files are uncommitted on `feat/radar-guide`, and the four migrations are untracked. `lib/supabase/database.types.ts` does not contain them, so they have very likely never been pushed. Confirm in 4.4 before deleting.

### 4.1 Keep as is

| Area | Files |
|---|---|
| Attribution and visits | `lib/radar-guide/attribution.ts`, `lib/radar-guide/use-radar-visit.ts`, their tests; `components/radar/RadarLandingBeacon.tsx` |
| Career requests | `lib/radar-guide/career-request.ts` + test; `components/radar/guide/CareerRequestForm.tsx` + test |
| Thai copy helpers | `lib/radar-guide/thai-copy.ts` + test |
| Captions | `lib/radar-guide/vtt.ts`, `lib/radar-guide/caption-align.ts` + tests; `components/radar/guide/CaptionOverlay.tsx`, `TranscriptSheet.tsx`, `usePlaybackManager.ts` + test |
| Shared UI | `components/radar/guide/GuideSheet.tsx`, `FollowButton.tsx`, `guide.css` (chapter selectors removed in Unit 6) |
| IG campaign and DM safety | `lib/meta/comment-intent.ts` + test, `lib/meta/graph.ts`, `lib/meta/process-webhook-event.ts`, `lib/radar-guide/comment-dm.ts`, `dm-thread.ts`, `reel-insights.ts` + tests, `lib/dm-leads/**`, `lib/supabase/{ig-comments,dm-leads,dm-campaigns}.ts`, `types/dm-leads.ts`, `components/admin/{DmLeadConversation,DmLeadDetailPane,DmLeadPublicReplyBar,IgCommentReplyRow,MissedCommentsCard,RadarCommentQueue,RadarThreadNotice}.tsx`, `app/admin/ig-comments/**`, `app/admin/dm-leads/**`, `app/api/copilot/advise/route.ts`, `app/api/cron/radar-reel-insights/route.ts`, `vercel.json` |
| Proxy | `proxy.ts`, `utils/supabase/proxy.ts`, `utils/supabase/proxy-radar.test.ts` |
| Deck improvements unrelated to chapters | `lib/radar/field-meta.ts`, `lib/radar/card-visuals.ts`, `lib/content/radar-cta.ts` + tests, `components/radar/RadarCards.tsx` (CtaCard intent, no mentor button, copy fixes), `components/radar/RadarSkillExperience.tsx`, `components/radar/RadarPageClient.tsx`, `components/map/MapCard.tsx`, `app/globals.css`, `app/radar/page.tsx`, `public/images/radar/detail/` |
| Admin | `components/admin/radar/RadarCareerRequests.tsx`, `app/api/cron/radar-reel-insights` |
| Pipeline | `scripts/radar-guide/{cover.ts,dump.ts}`, `scripts/radar-guide/lib/{b2,cli,media,art,card-copy,dump}.ts` |
| Fixtures and content lint | `lib/radar-guide/__fixtures__/**` (deck careers), `lib/radar-guide/__tests__/card-copy.test.ts` |
| Migrations | `20261111100100_radar_visits.sql` |

### 4.2 Change

| File | Change |
|---|---|
| `lib/radar-guide/types.ts` | **Unit 0 (additive):**<br>• `GuidePageKey`<br>• `RADAR_PAGE_KEY_PATTERN`<br>• `GuideEventInput.pageKey?`<br>• `RadarVideoKind` adds `"demo"`<br><br>**Unit 6 (last):**<br>• Remove `GUIDE_CHAPTER_KEYS`, `GuideChapterKey`, `GUIDE_EXTRA_KEYS`, `GuideSectionKey`, `GuideCardChapterKey`, `GuideChapterDef`, `RadarGuideChapterPublic`, `GuideSection*`, `RadarCardRow` alias (if unused), `GuideInteractTarget` (old deck targets move to the deck), `RADAR_GUIDE_CHAPTER_STATUSES`, `RadarGuideChapter*Row`, `RADAR_GUIDE_CHAPTER_PUBLIC_COLUMNS`, `isGuideChapterKey` and `isGuideSectionKey`.<br>• `RadarReel.chapterKey`, `RadarLink.chapterKey` and `CommentTarget.chapterKey` become `pageKey: GuidePageKey \| null`. The SQL column stays `chapter_key`. |
| `lib/radar-guide/events.ts` + test | • `guideEventArgs` sends `p_chapter_key = event.pageKey`, kept only when it matches `RADAR_PAGE_KEY_PATTERN` (today it requires the 7 chapter keys).<br>• `guideEventOnceKey` does the same.<br>• Targets keep the SQL pattern.<br>• Add a `pageKey` round-trip test and a test that `mythos:firefox-guess` passes. |
| `lib/radar-guide/utm.ts` + test | • `buildRadarUrl({ slug, page?, utm, hash? })` builds `/radar/<slug>/<page>`. `page` must match the pattern, otherwise it throws. `hash` remains only for deck links.<br>• `radarUtmContent({ slug, page?, kind, shortcode })` returns `<slug\|hub>[-<page>]-<founder\|motion\|demo>-<shortcode\|x>`. |
| `lib/radar-guide/short-links.ts` + test | **Resolution, in order:**<br>1. An active `radar_links` row. `chapter_key` holds the page key. If the slug has a live code guide and the key is one of its pages, go to `/radar/<slug>/<page>`. Otherwise go to `/radar/<slug>` with no hash.<br>2. The pattern `<alias\|slug>[-<page>][-<ig\|tt\|yt\|story>]`, parsed by **longest known prefix first** (`ai-engineer-agents` → `ai-engineer` + `agents`; `ai-agents` → `ai` + `agents`). It uses the code index (`isGuidePageKey(slug, key)`) and a legacy chapter map (`hook`→first page, `money`→`money`, …) taken from each page's `legacyHashes`.<br>3. Hub fallback.<br><br>**Inputs:** `ShortLinkDeps` gains `pagesFor(slug): readonly string[] \| null` (pure, from `GUIDE_INDEX`).<br>**New tests:** `cyber-mythos`, `cyber-mythos-tt`, `cyber-nope` (resolves to `/radar/cybersecurity`), `data-proof`, `ai-engineer-agents`, a legacy row with `chapter_key='money'`, and a deck career with a page (no page in the result). |
| `app/r/[code]/route.ts` + test | Passes `pagesFor`. The logged `field_slug` is unchanged. Add `page_key` to the click log only if 4.4 adds the column (optional). |
| `lib/radar-guide/social.ts` + test | • `radarShareUrl(slug, page?)`: shared links go to the page the student is on.<br>• Share target stays `native`. The design's `webshare` is the same event; keep the existing name. |
| `components/radar/guide/{ShareButtons,MidShareCard,GuideOutro}.tsx` + tests | • `chapterKey` prop becomes `pageKey`.<br>• `GuideOutro` is split into sections the `next` page composes:<br>  • `GuideIntentButton` (exists)<br>  • the request form<br>  • share<br>  • follow<br>  • `GuideProgramLine` (exists)<br>  • the other-careers cards |
| `components/radar/guide/ChapterVideo.tsx` | Becomes `components/radar/guide/shell/GuideClip.tsx`, taking `{slot, media, cues}`. |
| `components/radar/guide/SourcesSheet.tsx` | Takes `Fact[]` and renders the badge, the `สหรัฐฯ` and `เราคำนวณเอง` labels, outlet, date and link. |
| `lib/radar-guide/dm-copy.ts` + test | • `buildReelLinkCode({ slug, pageKey })` returns `<alias>-<page>-<4 random>`, at most 32 chars (`dev-headlines-k3f9` fits).<br>• The career DM template gains an optional page line: "หน้า {pageTitle}". It stays fixed, with no names, at most 1000 chars and no dashes.<br>• `radarLinkRowForReel` writes the page key into `chapter_key` and passes `kind` through to `radarUtmContent`. |
| `lib/radar-guide/comment-target.ts` + test | Page key type only. |
| `lib/radar-guide/admin-social.ts` + test | `ReelUpsertBody` / `LinkUpsertBody` validate `pageKey` against `GUIDE_INDEX[slug].pages`. A deck career must have `pageKey` null. `videoKind` adds `demo`. |
| `lib/radar-guide/admin-funnel.ts` + test, `components/admin/radar/RadarGuideFunnel.tsx` | Rename "chapters" to "pages". Add a per-page table from the new `analytics_radar_guide_pages` view (4.4), labelled from `GUIDE_INDEX`, with milestone targets and skip rate. |
| `lib/supabase/radar-guide-admin.ts` | • Delete `listGuideChapters`, `getGuideChapterRow`, `writeGuideChapter`, `RadarChapterConflictError`, `listChapterReelPlans`, `ChapterReelPlan`.<br>• Add `listGuidePageViews()` (reads the new view). |
| `lib/supabase/radar-reels.ts` | `pageKey` naming. `upsertReel` validates through `admin-social`. |
| `app/admin/radar/reels/page.tsx`, `components/admin/radar/RadarReelMapper.tsx`, `RadarLinksEditor.tsx`, `app/api/admin/radar/{reels,links}/route.ts` + tests | • Page select comes from `GUIDE_INDEX[slug].pages`; there is no chapter list.<br>• Hook variants come from `listGuideReelPlans()`, a new server-only function in `lib/radar-guides/registry.server.ts` that returns `{slug, pageKey, format, hookTh, variantsTh}`. It replaces `listChapterReelPlans(db)` and is passed as props.<br>• "Kind" adds `demo`. |
| `lib/radar/recent-reels.ts` + test, `components/radar/RecentReelsStrip.tsx` | • Titles come from `GUIDE_INDEX`, posters from `clips.json` (through `registry.server`), and links go to `/radar/<slug>/<page>`.<br>• The `radar_guide_chapters` read is removed.<br>• The `published-radar-fields` revalidation note is removed. |
| `lib/radar/server.ts` + `cache-preview.test.ts` | Remove `loadGuideChapters` and the `radar_guide_chapters` merge. Keep `getCachedFieldSkills`. Bump the key to `published-radar-field-v8` so cached v7 entries carrying chapters are dropped. |
| `app/radar/[slug]/page.tsx`, `app/radar/[slug]/opengraph-image.tsx` | Cover branch (2.4). Remove `toPublicChapter` and `initialChapters`. |
| `components/radar/RadarFieldPageClient.tsx` + 3 tests | **Remove the chapter model:**<br>• `ChapterEyebrow`, `ChapterSheet`, `ChapterVideoSection`, `ReplayVideoSheet`<br>• header "3/7 · เงิน", the chapter progress groups, the hash sync and settle<br>• `chapter_view`, `video*` and sources-by-chapter<br><br>**Keep:**<br>• `useRadarVisit` + tracker<br>• `onInteract` targets<br>• `MidShareCard` after the salary cards<br>• `GuideOutro`, the AI blackout, the perf fixes, the copy and English fixes<br>• the fix that puts `realPeople` before the CTA<br><br>**Ordering** moves from `lib/radar-guide/sections.ts` to `lib/radar/deck-sections.ts`. That file is `buildDeckSections(cards, skills, { fromPlan })` and emits `card \| skills \| midShare \| outro` with no chapter keys. The excluded-kind rules (reflection, startCarousel, explore text…) move with it from `chapters.ts`.<br><br>**Intent:** extract the `onIntent` body into `lib/radar/record-intent.ts` (`recordFieldIntent({fieldSlug, fieldId?, pathSlug, scope, visitId})`). Unit 1 creates it and Unit 6 switches the deck to it. |
| `components/radar/reel/payload.ts` + `radarReel.test.ts` | • Drop `CareerScriptFile`. Input is `{ dump, guide?: CareerGuide }`.<br>• With a guide: hook, money and start lines come from page copy with fact ids, and sources come from facts.<br>• Without one: card fallback, as today, with `notes` warnings.<br>• Modes `career` and `compare` stay. `chapter` mode becomes `page`. |
| `scripts/radar-guide/clip.ts`, `reel.ts`, `lib/cuts.ts`, `__tests__/pipeline.test.ts` | Section 3. |
| `lib/radar-guide/teleprompter.ts` + test, `components/admin/radar/RadarTeleprompter.tsx` | Section 3. |
| `package.json` | **Remove** `radar:scripts:draft`, `radar:scripts:push`, `radar:scripts:pull`.<br>**Keep** `radar:dump`, `radar:clip`, `radar:reel`, `radar:cover`.<br>**Add:**<br>• `radar:check` (`tsx scripts/radar-guide/check.ts [slug] [--max-age 45]`)<br>• `radar:tcas` (`tsx scripts/radar-guide/tcas.ts <slug>`, which writes `lib/radar-guides/<slug>/tcas.json`; network, local only) |
| `next.config.mjs` | `outputFileTracingIncludes` gains `"/radar/**": ["./lib/radar-guides/**/clips/*.vtt"]`. |
| `eslint.config.*` | `no-restricted-imports` for content modules in client files (1.1). |
| `docs/features/radar-guide.md` | A banner at the top: "Sections 2.1-2.6, 3.1, 6.1, 7.1-7.2 superseded by docs/features/radar-guides-in-code.md". Then a new doc with this architecture and the final cybersecurity design. |
| `docs/radar-guide/README.md` | Caption templates kept. Script workflow replaced by the code workflow. |
| `supabase/migrations/20261111100200_radar_guide_events.sql`, `…100300_radar_social.sql` | Section 4.4. |

### 4.3 Delete

Do these only after confirming 4.4, and as Unit 6's last commits.

| What | Files |
|---|---|
| Chapter table | `supabase/migrations/20261111100000_radar_guide_chapters.sql` |
| Chapter model and deck regrouping | `lib/radar-guide/chapters.ts`, `lib/radar-guide/sections.ts`, `lib/radar-guide/__tests__/chapters.test.ts`, `lib/radar-guide/__tests__/sections.test.ts` (ordering tests move to `lib/radar/__tests__/deck-sections.test.ts`) |
| Script schema and DB scripts | `lib/radar-guide/script-schema.ts`, `lib/radar-guide/__tests__/script-schema.test.ts`, `lib/radar-guide/__tests__/scripts-lint.test.ts` |
| Admin chapter writes | `lib/radar-guide/admin-chapters.ts`, `lib/radar-guide/__tests__/admin-chapters.test.ts`, `app/api/admin/radar/fields/[fieldId]/chapters/route.ts`, `app/api/admin/radar/fields/[fieldId]/chapters/route.test.ts` |
| Chapter editor UI | `components/admin/radar/RadarGuideChapters.tsx`, `components/admin/radar/guide/**` (BeatEditor, ChapterMediaPanel, ChapterScriptForm, ChapterWorkflowBar, ScriptLintPanel, fields.tsx, script-draft.ts, `__tests__/script-draft.test.ts`); the chapters panel mount and loader in `app/admin/radar/[fieldId]/page.tsx` (the file stays, back to main plus the deck editor) |
| Old teleprompter route | `app/admin/radar/[fieldId]/teleprompter/**` (replaced by `app/admin/radar/guide/[slug]/teleprompter/`) |
| Chapter-only guide UI | `components/radar/guide/ChapterEyebrow.tsx`, `ChapterSheet.tsx`, `ChapterVideoSection.tsx`, `ReplayVideoSheet.tsx`, `__tests__/ChapterVideo.test.tsx` (rewritten as `shell/__tests__/GuideClip.test.tsx`); in `guide-helpers.ts` delete `headerChapterLabel`, `chapterForSectionKey`, `chapterSources`, `chapterUpdatedAt`, `sourcesChipLabel` and keep `formatThaiMonthYear`, `formatClock`, the video milestones and `careerRequestMessage`; trim `index.ts` exports to match |
| Script pipeline | `scripts/radar-guide/scripts-draft.ts`, `scripts-push.ts`, `scripts-pull.ts`, `scripts/radar-guide/lib/{chapter-rows,draft,factsheet,lint-report,script-file,start-options}.ts` |
| Script docs | `docs/radar-guide/scripts/*.json` (4 files; content is ported into `lib/radar-guides/<slug>/pages/*` first, then deleted in the same PR); `docs/radar-guide/session-1.md` (replaced by the teleprompter's clip slate) |
| Kept as research notes, not product | `docs/radar-guide/factsheets/*.md` (their URLs and grades are ported into `facts.ts`); `docs/radar-guide/content-fixes/*.md` (still apply to DB deck cards) |

### 4.4 Migrations (none has reached production; verify first)

1. **Verify.** From the main checkout, run `supabase migration list --linked` and confirm `20261111100000`-`20261111100300` show as local only. Also check that `public.radar_guide_chapters` does not exist (`select to_regclass('public.radar_guide_chapters')`).
   - **If they are local only:** delete `20261111100000_radar_guide_chapters.sql` and edit the other three in place. They are not yet history.
   - **If `100000` was applied:** keep the file, stop using the table, and add a later reviewed migration with `DROP TABLE IF EXISTS public.radar_guide_chapters`. That table is empty and only admins can write to it. Treat that migration as an exception to "additive only", and make sure the founder signs it off.
2. **`20261111100200_radar_guide_events.sql`.** Keep everything. `chapter_key` accepts page keys as they are. Append:
   ```sql
   COMMENT ON COLUMN public.radar_guide_events.chapter_key IS 'Guide page key (code-authored guides), e.g. mythos';
   CREATE OR REPLACE VIEW public.analytics_radar_guide_pages WITH (security_invoker = true) AS
   SELECT field_slug, chapter_key AS page_key,
     date_trunc('week', (created_at AT TIME ZONE 'Asia/Bangkok'))::date AS week,
     count(DISTINCT visit_id) FILTER (WHERE event_type = 'chapter_view')    AS viewers,
     count(DISTINCT visit_id) FILTER (WHERE event_type = 'interactive_tap') AS players,
     count(*) FILTER (WHERE event_type = 'interactive_tap' AND target LIKE '%:skip') AS skips,
     count(DISTINCT visit_id) FILTER (WHERE event_type = 'video_play')      AS clip_plays,
     count(DISTINCT visit_id) FILTER (WHERE event_type = 'video_complete')  AS clip_completes,
     count(*) FILTER (WHERE event_type = 'share_click') AS shares,
     count(*) FILTER (WHERE event_type = 'cta_click')   AS ctas
   FROM public.radar_guide_events
   WHERE chapter_key IS NOT NULL
   GROUP BY 1, 2, 3;
   REVOKE ALL ON public.analytics_radar_guide_pages FROM anon;
   GRANT SELECT ON public.analytics_radar_guide_pages TO authenticated;
   ```
   Admins read it through the base table's `is_admin` policy. In `analytics_radar_guide_funnel`, the `chapters_seen` and `chapters_done` names stay as they are, and the admin labels them "pages".
   The RPC keeps requiring `field_slug` to be a published `radar_fields` row. That is why every code guide's slug must have one (guide-lint documents it, and `radar:check` verifies it against the database).
3. **`20261111100300_radar_social.sql`.**
   - `radar_reels.video_kind` CHECK becomes `IN ('founder','motion','demo')`.
   - Add a column comment on `radar_reels.chapter_key` and `radar_links.chapter_key`: "guide page key".
   - Leave the `angle` column nullable and unused by the page flow. The reel mapper stops asking for it.
   - Optional: `radar_link_clicks` gets `page_key text CHECK (page_key IS NULL OR page_key ~ '^[a-z][a-z0-9_]{1,31}$')`, so typed `cyber-<page>` aliases can be counted per page.
4. **Why the columns are not renamed to `page_key`.** The values and CHECKs are identical. The DM, webhook, admin and analytics code already reads `chapter_key`. A rename would touch about 25 files that another job is integrating right now. The TypeScript layer uses `pageKey` and maps at the query boundary.
5. After `supabase db push`, regenerate `lib/supabase/database.types.ts` (Unit 0 owns this).

---

## 5. Work breakdown

### 5.1 Order

```
Unit 0 Foundation (half day, merged first)
   ├─ Unit 1 Routes + shell
   ├─ Unit 2 Game engines
   ├─ Unit 3 Cybersecurity content + bespoke      (needs Unit 0 types; renders once U1/U2 land)
   ├─ Unit 4 Funnel, links, DM, admin mapping
   └─ Unit 5 Media pipeline + filming
Unit 6 Removal + deck + type pruning (starts in parallel on the deck; deletions and types.ts pruning merge last)
```

Merge order: U0 → U2 → U1 → U4 → U3 → U5 → U6.
- U3 can merge before U1 if the pages are `status: "draft"`.
- Each PR runs `pnpm lint && pnpm test && pnpm build`.
- The branch rule from AGENTS.md applies: never push to `main`.

### 5.2 Units (each file has exactly one owner)

| Unit | Owns | Consumes |
|---|---|---|
| **U0 Foundation** | **Shared types and checks:** `lib/radar-guide/guide-types.ts`, `lib/radar-guide/guide-lint.ts` + `__tests__/guide-lint.test.ts`, `lib/radar-guide/guide-state.ts` + test, `lib/radar-guide/demo.ts`<br>**Guide registry:** `lib/radar-guides/{index.ts,registry.server.ts,facts.ts,banned.ts}`, `lib/radar-guides/_shared/facts.ts`, `lib/radar-guides/__tests__/guides.test.ts`<br>**Cyber skeleton:** `lib/radar-guides/cybersecurity/meta.ts` (11 keys and titles, `status: "draft"`)<br>**Edits:** additive edits to `lib/radar-guide/types.ts`, the migration edits in 4.4 and the migration deletion (after verification), `lib/supabase/database.types.ts` regeneration, `eslint.config.*` rule, `next.config.mjs` tracing entry | nothing |
| **U1 Routes and shell** | **Routes:** `app/radar/[slug]/page.tsx`, `app/radar/[slug]/opengraph-image.tsx`, `app/radar/[slug]/(guide)/**`, `app/sitemap.ts` (radar entries)<br>**Shell:** `components/radar/guide/shell/**` (incl. GuideClip, GuideCover, LegacyHashRedirect, GameIsland, BespokeIsland, DemoPlayer, SourcesChip)<br>**Existing components it rewrites:** `components/radar/guide/SourcesSheet.tsx`, `ChapterVideo.tsx` (moved), `guide.css` (shell styles)<br>**Other:** `lib/radar/record-intent.ts` + test | U0 types/registry; `ENGINE_LOADERS` from U2 (stubbed until merged); `BESPOKE` registry from U3; ShareButtons, GuideOutro etc. from U4 by props |
| **U2 Game engines** | **Engines:** `components/radar/guide/games/**` (11 engines, `index.ts` `ENGINE_LOADERS`, `engine-shell.tsx`: skip link, timer toggle, `data-demo` conventions)<br>**Logic:** `lib/radar-guide/games/*.ts` (pure reducers: scoring, buckets, bitmask, fit tally, terminal state machine, countdown labels) + tests | U0 types only. No content imports: tests use small inline fixtures |
| **U3 Cybersecurity content** | **Content:** `lib/radar-guides/cybersecurity/**` (`guide.ts`, `pages/*.ts`, `facts.ts`, `banned.ts`, `tcas.json`, empty `clips.json`)<br>**Bespoke:** `components/radar/guides/registry.ts`, `components/radar/guides/cybersecurity/**` (BirthYearTimeline, BucketPipe, ThisWeekStrip, SchoolSiteCard, Firefox band if not covered by GuessReveal `bars`)<br>**Shared facts:** `lib/radar-guides/_shared/facts.ts` (after U0 creates it)<br>**Scripts:** `scripts/radar-guide/tcas.ts`<br>**Review:** Thai copy review per AGENTS.md (Gemini drafting, Cursor proofreading, Codex logic) | U0 types; U2 data shapes |
| **U4 Funnel, links, DM, admin mapping** | **Links and events:** `lib/radar-guide/{utm,short-links,events,social,dm-copy,comment-target,admin-social,admin-funnel}.ts` + tests, `app/r/[code]/route.ts` + test<br>**Share UI:** `components/radar/guide/{ShareButtons,MidShareCard,GuideOutro,FollowButton,CareerRequestForm}.tsx` + tests<br>**Reels:** `lib/radar/recent-reels.ts` + test, `components/radar/RecentReelsStrip.tsx`, `lib/supabase/radar-reels.ts`<br>**Admin data:** `lib/supabase/radar-guide-admin.ts` (non-chapter parts), `app/admin/radar/reels/**`, `components/admin/radar/{RadarReelMapper,RadarLinksEditor,RadarGuideFunnel}.tsx`, `app/admin/radar/page.tsx` (funnel tab), `app/api/admin/radar/{reels,links}/**` | U0 index (`GUIDE_INDEX`, `listGuideReelPlans` from `registry.server`) |
| **U5 Media pipeline and filming** | **Scripts:** `scripts/radar-guide/{clip,reel,check}.ts`, `scripts/radar-guide/lib/cuts.ts`, `scripts/radar-guide/__tests__/pipeline.test.ts`<br>**Reels:** `components/radar/reel/**` (payload refactor, PageFrame), `app/studio/radar-guide/**`<br>**Teleprompter:** `app/admin/radar/guide/[slug]/teleprompter/**`, `components/admin/radar/RadarTeleprompter.tsx`, `lib/radar-guide/teleprompter.ts` + test<br>**Other:** `package.json` (scripts only), `docs/radar-guide/README.md` | U0 registry; U1 `GuidePageView` and `DemoPlayer` (import only) |
| **U6 Removal, deck, type pruning** | **Deck:** `components/radar/RadarFieldPageClient.tsx` + its 3 tests, `lib/radar/deck-sections.ts` + test, `lib/radar/server.ts` + `cache-preview.test.ts`, `app/admin/radar/[fieldId]/page.tsx`<br>**Deletes:** everything in 4.3, the old `components/radar/guide/index.ts` exports, `guide-helpers.ts` trimming, final `lib/radar-guide/types.ts` pruning<br>**Docs:** `docs/features/radar-guide.md` banner, new `docs/features/radar-guides-in-code.md` | U1 `record-intent.ts`; all units merged before types pruning |

**Contract between U1 and U2:**
- `ENGINE_LOADERS: { [E in EngineId]: () => Promise<{ default: ComponentType<EngineProps<E>> }> }`
- Engines call `onResult` once at completion.
- Engines fire their own `interactive_tap` milestones through `tracker`, using `track.done` and `track.milestones`.
- Engines render the solved state when `skipped` is true.
- The shell renders the "ข้ามเกม ดูเฉลย" link (it fires `<pageKey>:skip`) and the static `answersTh` fallback.

**Contract between U1 and U3:**
- `components/radar/guides/registry.ts` exports `loadBespoke(slug): Promise<Record<string, ComponentType<BespokeProps>>>`.
- Bespoke components follow the same skip, demo and reduced-motion rules as engines.

### 5.3 Test plan (Jest)

- **U0:**
  - **`guide-lint`, one fixture per rule.** Each must be flagged: an em dash; `น้องๆ`; an unbacked digit; a Thai-digit number; a digit allowed through `values`; the `ม.5` / `TCAS70` exemptions; a `sim.*` citation in simulated data; a drawer-only fact cited in copy; a missing source; a duplicate fact id; `asOf` in the future, 46 days old (warn) and 121 days old (error); a banned pattern found in a reel variant; a reserved page key; non-contiguous order; meta/page mismatch; `showsHacking` without a safety block; a target without the page prefix.
  - **`guides.test.ts`.** Runs lint over every guide and fails on errors.
  - **Guide-wide checks:**
    - every slug is in a hand-kept `KNOWN_PUBLISHED_RADAR_SLUGS` list. `radar:check` verifies the list against the database.
    - no slug equals `keep`, `skills` or `territory`
    - `clips.json` entries match pages, the VTT parses, and `scriptHash` is current
    - the client-import ban (grep)
  - **`guide-state`:**
    - read and write with `localStorage` throwing (private mode)
    - a corrupt JSON value resets to empty
    - demo mode never writes
    - `local.*` is never part of anything returned for events
- **U1:**
  - `generateStaticParams`:
    - lists every live page
    - leaves out drafts when `VERCEL_ENV=production`
  - `loadGuidePage` returns null for an unknown page.
  - `LegacyHashRedirect` maps every legacy hash and keeps `location.search`.
  - The shell:
    - fires `chapter_view` once per page and visit, with `p_chapter_key = pageKey`
    - computes "เหลือราว N นาที" from the remaining `minutes`
  - `GameIsland` renders `answersTh` with JS off (server render snapshot) and after skip.
  - `GuideClip`: the existing playback-manager tests, carried over (first clip autoplays muted, later ones show the play button).
  - The cover branch:
    - a guide slug shows the cover
    - `?from=plan` and `?view=deck` show the deck
    - a non-guide slug shows the deck
  - Metadata:
    - title is absolute
    - no dashes
    - the canonical is the page path
- **U2:** pure reducers. Each engine gets an RTL test for: tap-to-select then tap-a-target (no drag needed); skip shows the solution; every `data-demo` id used by a `demoScript` fixture exists; reduced motion shows final values.
  - `FindLine`:
    - states go idle → wrong → found
    - hint 1, then hint 2 outlining lines 5, 7 and 8
    - attempts are counted
  - `GuessReveal`:
    - the bucket thresholds match the design tables
    - "เกือบเป๊ะ" within the tolerance
  - `SortGame`:
    - near-miss answers
    - multi-answer items (the ผู้ดูแลระบบไฟฟ้า card)
    - unscored items
    - the triage value `x*10+y`
  - `BinaryChoice`:
    - tallies the outcomes
    - ties give `AB`
  - `ProgrammeFilter`:
    - countdowns for ม.6 only
    - "ปิดแล้ว" after the deadline (clock mocked at 2026-11-17 and 2027-01-29)
    - GPAX greys cards out and never hides them
    - the fit result sets the order
  - `FakeTerminal`:
    - input is trimmed and inner spaces collapsed
    - unknown commands give "ไม่มีคำสั่งนี้ในแล็บ ลอง help"
    - `scan` chips stay hidden until `cat scope.txt`
    - out-of-scope commands increment `scopeTries`
    - `grep -c "Failed"` with and without quotes gives `41`
    - nothing typed is sent or stored
  - `EvidenceMaker`:
    - Markdown output includes the fixed lines and the proof picks
    - a clipboard failure falls back to a selected textarea
    - drafts stay in `local`
  - `RecapCard`:
    - only played pages appear
    - the favourite line comes from the pick, not the scores
- **U3:**
  - The content passes `guide-lint`.
  - The bespoke registry covers every `component` id.
  - `tcas.json` shape: mytcas ids match `^\d{14}[A-Z]$`, links are `https://course.mytcas.com/programs/<id>`, and there are exactly 9 programmes with ไซเบอร์ in the name (`f.mytcas-9`).
  - A snapshot of the copy strings for the Thai review.
- **U4:**
  - `resolveShortLink` cases listed in 4.2.
  - `buildRadarUrl` with a page:
    - params stay in order
    - an invalid page throws
  - `radarUtmContent` with page and `demo`.
  - `guideEventArgs` keeps `mythos` and drops `Mythos-1`.
  - `buildReelLinkCode` is at most 32 chars and passes the SQL pattern for every alias × page in `GUIDE_INDEX`.
  - Admin zod schemas:
    - reject a page that is not in the guide
    - require `pageKey` null for deck careers
  - DM copy with a page title:
    - no dash
    - at most 1000 chars
  - The existing DM, comment and fencing tests keep passing unchanged.
- **U5:**
  - `teleprompterPages` orders required clips, then safety clips, then page order.
  - `clip.ts --dry-run` on a fixture:
    - writes the VTT and manifest JSON with the expected keys and a stable sort
    - fails for a page without a clip slot
  - Reel payload from a guide uses only fact-backed numbers.
  - Demo timeline: the steps' `at` values ascend and stay within the reel's target length.
- **U6:**
  - `deck-sections` ordering:
    - `realPeople` comes before the outro
    - `midShare` follows the salary cards
    - `fromPlan` removes the outro, CTA and midShare
  - The stability test without video sections.
  - `cache-preview` with the v8 key.
  - `rg "radar_guide_chapters|GUIDE_CHAPTER_KEYS|script-schema" app components lib scripts` returns nothing.

**Manual checks before the first reel posts.** Use the Vercel preview, an iPhone, and the Instagram in-app browser.
- Open `/r/cyber-mythos-<code>`.
- Land on `/radar/cybersecurity/mythos`, and check the utm tags are stripped and the visit row is tagged `ig-comment-dm`.
- Play each game by tapping only, and check that edge swipes do nothing.
- Check that "ต่อ" and back stay in the shell, with no deck skeleton flash.
- Check that the first clip autoplays muted and a tap turns the sound on.
- Open `/radar/cybersecurity#money` and check it lands on `/money`.
- Check `?view=deck`.
- Check that `?demo=1` sends no events, using the network tab.
- Check that the OG preview in LINE shows the page headline.

---

## 6. Changes to the final design, and open items

1. **Staleness rule (design 0.7.4).** A Jest failure at 45 days would break every PR in the repo, including the whiteboard and SHIFT work, the first time nobody refreshes the news. This plan uses:
   - a Jest warning at 45 days and an error at 120 days
   - a path-filtered CI job, `radar:check --max-age 45`, on PRs that touch `lib/radar-guides/**`
   - a weekly scheduled workflow that opens an issue when a guide is stale
   - the "ข้อมูล ณ …" chip, which keeps the date visible to students either way
2. **mytcas "pulled at build time" (design `tcas`, open item 8).** CI builds offline with placeholder secrets. `pnpm radar:tcas <slug>` writes `tcas.json` and the result is reviewed in a PR. Names and links are never typed by hand, which keeps the intent of the design.
3. **Cover at `/radar/[slug]`** (2.4) replaces "deck stays at `/radar/cybersecurity`". The founder should confirm this.
4. **Fact sources are an array.** Several facts have two outlets (`f.dream-taiwan`, `f.us-directive`, `f.thai-airways`, `f.tctt`, `f.gasa-survey`). The design's single `url` and `source` fields cannot hold them.
5. **Share event target** stays `native`, not `webshare`, to match the existing code, tests and funnel.
6. **`?demo=1`** is detected in the browser only. Pages are force-static, so the server never sees query strings, which also keeps the "server never reads utm" rule.
7. **Every code-guide slug must also exist as a published `radar_fields` row.** The event, visit and reel RPCs and the foreign keys check it. All 4 pilot slugs already exist, and `radar:check` verifies it before a guide goes `live`.
8. **Open:**
   - Will Chrome virtual time hold up for filming the demo reels? Unit 5 should spike it on day 1. The fallback is real-time capture.
   - Founder confirmation for a later `DROP TABLE` migration if `100000` turns out to have been applied.
   - Founder confirmation of the cover decision.
