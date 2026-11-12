/**
 * Code-authored Career Radar guides. Shared by content (lib/radar-guides/**),
 * the shell and engines (components/radar/guide/**), scripts and admin.
 * Spec: docs/features/radar-guides-in-code.md section 1.2, plus the game-story
 * layer (levels, dialogue boxes, in-world items, cutscenes) whose runtime
 * contract lives in lib/radar-guide/story.ts.
 *
 * Additive changes only once merged: seven units import these types.
 */
import type { GuideTracker } from "./types";
import type { GuideStoryMeta, HostMood } from "./story";

// ---------------------------------------------------------------- primitives
export type IsoDate = `${number}-${number}-${number}`; // "2026-11-11"
export type IsoMonth = `${number}-${number}`; // "2026-04"
export type IsoDateTime = `${number}-${number}-${number}T${string}`; // "2027-01-28T16:30:00+07:00"
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };

/** Same as the SQL CHECK on radar_guide_events.chapter_key / radar_links.chapter_key. */
export const GUIDE_PAGE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;
/** Never usable as page keys: /r channel suffixes and route words. */
export const RESERVED_PAGE_KEYS = ["ig", "tt", "yt", "story", "deck", "cover", "overview"] as const;
/** Static siblings of app/radar/[slug]: a career slug can never be one of these. */
export const RESERVED_GUIDE_SLUGS = ["keep", "skills", "territory"] as const;

export type GuideStatus = "draft" | "live"; // draft: rendered on preview/dev builds only

// ---------------------------------------------------------------- index (light)
export interface GuideIndexPage {
  key: string; // GUIDE_PAGE_KEY_PATTERN, unique within the guide
  order: number; // 1-based, contiguous; shown as the level number
  titleTh: string;
  navLabelTh: string; // short label for the page map sheet / level map
  minutes: number; // estimated, drives "เหลือราว N นาที"
  legacyHashes?: readonly string[]; // old deck hashes that land here, e.g. ["reality","day"]
  /**
   * Scene art override (public path). Default: levelSceneSrc(slug, key), i.e.
   * /radar/guides/<slug>/<key>.webp. Renderers fall back to a CSS pixel scene
   * when the image fails to load.
   */
  scene?: string;
  /**
   * DERIVED, never authored: number of trackable games on the level (game
   * blocks plus bespoke blocks with `track`). Filled by
   * registry.server guideIndexFor(); drives the XP maximum.
   */
  games?: number;
  /** DERIVED, never authored: the page has a clip slot (a cutscene). */
  cutscene?: boolean;
}
export interface GuideIndexEntry {
  slug: string; // = radar_fields.slug (must exist and be published, see 5.3)
  alias: string; // /r alias, e.g. "cyber"
  nameTh: string;
  nameEn: string;
  accent: string; // hex, fed to --radar-accent
  status: GuideStatus;
  asOf: IsoDate; // newest page asOf
  intentPathSlug: string; // pathSlug passed to recordRadarPathIntent on the `next` page
  shareCardAfter?: string; // page key the mid-deck share card follows ("money")
  pages: readonly GuideIndexPage[];
  /** Game-story layer: badges, profile traits, profile card title. */
  story?: GuideStoryMeta;
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
  outlet: string; // "Mozilla Hacks"
  url: `https://${string}`;
  publishedAt: IsoDate | IsoMonth;
  title?: string;
}
export interface Fact {
  id: FactId;
  claimEn: string; // what we claim, in plain English, for reviewers
  /** Exact tokens Thai copy may print for this fact: "423", "271", "20 ถึง 30", "35,500". */
  values?: readonly string[];
  sources: readonly FactSource[]; // >= 1 unless badge === "simulated"
  asOf: IsoDate;
  badge: FactBadge;
  usOnly?: boolean; // shows "สหรัฐฯ"
  ourMath?: boolean; // shows "เราคำนวณเอง"
  drawerOnly?: boolean; // may be cited by the sources drawer, never by copy text
  note?: string;
}

// ---------------------------------------------------------------- copy
export type CopyLabel = "usOnly" | "ourMath" | "teamView" | "checkCurriculum";
export const COPY_LABEL_TH: Record<CopyLabel, string> = {
  usOnly: "สหรัฐฯ",
  ourMath: "เราคำนวณเอง",
  teamView: "ความเห็นทีมเรา",
  checkCurriculum: "เช็กหลักสูตรจริง",
};
export interface CopyText {
  th: string; // no em/en dash, no น้องๆ, every digit backed (guide-lint)
  factIds?: readonly FactId[]; // facts this sentence relies on (digits are checked against these)
  badge?: FactBadge; // shown inline next to the text
  labels?: readonly CopyLabel[];
}
export type CopyRole =
  | "hero"
  | "sub"
  | "intro"
  | "body"
  | "card"
  | "quote"
  | "honesty"
  | "exit"
  | "update"
  | "caption";

// ---------------------------------------------------------------- story (game layer)
/** Who speaks in a dialogue box. `host` is GUIDE_HOST (story.ts). */
export type DialogueSpeaker = "host" | "player" | "system";
/** One dialogue box: at most about two lines on a 360px phone (DIALOGUE_BOX_MAX_CHARS). */
export interface DialogueLine {
  speaker: DialogueSpeaker;
  text: CopyText;
  mood?: HostMood;
}
/**
 * How an in-world fact item is drawn. Facts are never body copy: they appear as
 * an intel card, a phone notification, a terminal line, a chat bubble or a
 * stat readout, always with the sources chip.
 */
export type ItemKind = "intel" | "notification" | "terminal" | "chat" | "stat";

// ---------------------------------------------------------------- demo (reels)
export type DemoStep =
  | { at: number; action: "tap"; target: string } // [data-demo="<target>"]
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
  captionTh: string;
  simulatedFactId: FactId;
  lines: readonly { n: number; code: string }[];
  answer: number;
  nearMissTh: Readonly<Record<number, string>>; // line -> feedback
  hintsTh: readonly [string, string];
  outlineOnHint2: readonly number[];
  onFound: { counter?: { to: number; captionTh: string; factId: FactId }; explanationTh: string };
}
export interface GuessRevealData {
  promptTh: string;
  min: number;
  max: number;
  step: number;
  unit: "baht" | "count";
  answer: number;
  answerFactId: FactId;
  buckets: readonly number[]; // ascending upper bounds; value_int = index
  chart:
    | {
        kind: "bars";
        band?: { from: number; to: number; labelTh: string };
        bars: readonly {
          labelTh: string;
          value: number | null;
          segment?: { value: number; labelTh: string };
        }[];
      }
    | {
        kind: "axis";
        markers: readonly { labelTh: string; value: number; strong?: boolean }[];
        shade?: { from: number; to: number };
        gapLabelTh?: string;
      };
  nearTh: string;
  overTh: string;
  underTh: string;
  nearWithin: number; // "เกือบเป๊ะ", "{d}" templates
  revealTh: string;
}
export interface SortItem {
  id: string;
  labelTh: string;
  meta?: Readonly<Record<string, string>>; // time, sender, AI label, confidence...
  detailTh?: string; // evidence on expand
  answer: string | readonly string[]; // bin id(s) counted as correct
  nearTh?: Readonly<Record<string, string>>; // bin id -> "ใกล้แล้ว..."
  revealTh: string;
  flags?: readonly string[];
  scored?: boolean; // default true
}
export interface SortGameData {
  layout: "cards" | "queue" | "chat";
  goalTh?: string;
  bins: readonly { id: string; labelTh: string }[];
  items: readonly SortItem[];
  timer?: { seconds: number; labelTh: string }; // always optional, "ไม่จับเวลา" toggle
  simulated?: { factId: FactId; watermarkTh?: string };
  resultTh: string; // "{score}/{total}" template
  outcomesTh?: Readonly<Record<string, string>>; // keyed by engine-defined outcome ids
}
export interface FlipCardsData {
  highlightTh: string;
  cards: readonly {
    id: string;
    frontTh: string;
    backTh: string;
    dateTh: string;
    factIds: readonly FactId[];
  }[];
}
export interface DateToggleData {
  chips: readonly { id: string; labelTh: string }[];
  columns: readonly { id: string; labelTh: string }[];
  cells: Readonly<Record<string, Readonly<Record<string, { open: boolean; noteTh?: string }>>>>;
  factIds: readonly FactId[];
}
export interface LadderRebuildData {
  rungsTh: readonly string[];
  fadeCount: number;
  aiCaption: CopyText;
  newRungsTh: readonly string[];
  newCaption: CopyText;
  proofChips: readonly { id: string; labelTh: string; evidenceTh: string }[];
  pick: number;
}
export type FitOutcome = "A" | "B" | "C";
export interface BinaryChoiceData {
  questions: readonly {
    id: string;
    leftTh: string;
    rightTh: string;
    left: Partial<Record<FitOutcome, number>>;
    right: Partial<Record<FitOutcome, number>>;
  }[];
  outcomes: Readonly<Record<FitOutcome, { titleTh: string; bodyTh: string }>>;
  disclaimerTh: string;
}
export interface ProgrammeCard {
  id: string; // mytcas program id
  uniTh: string;
  degreeTh: string;
  track: "thai" | "intl" | "special";
  rounds: readonly ("portfolio" | "quota" | "admission" | "direct")[];
  seats?: number;
  minGpax?: number;
  deadline?: { at: IsoDateTime; labelTh: string }; // countdown for m6 only
  badge: FactBadge;
  factIds: readonly FactId[];
  href: `https://${string}`;
  noteTh?: string;
  cyberInName: boolean;
}
export interface ProgrammeFilterData {
  gradeQuestionTh: string;
  gradeBannersTh: Readonly<Record<GradeKey, string>>;
  extraChecklistTh?: Readonly<Partial<Record<GradeKey, readonly string[]>>>;
  programmes: readonly ProgrammeCard[]; // featured ones, hand-checked
  /** The rest of the snapshot, shown behind "ดูอีก N หลักสูตร". */
  snapshotProgrammes?: readonly ProgrammeCard[];
  snapshot: "tcas.json"; // remaining feed programmes come from the committed snapshot
  broadRoutes: readonly { labelTh: string; href: string }[];
  fitOrder: Readonly<Record<FitOutcome, "cyberFirst" | "broadFirst" | "both">>;
}
export interface FakeTerminalData {
  labelTh: string;
  simulatedFactId: FactId;
  files: Readonly<Record<string, readonly string[]>>; // filename -> lines (hidden files start with ".")
  commands: readonly {
    match: readonly string[];
    output: readonly string[] | { file: string; head?: number; grep?: string; count?: boolean };
    effect?: "scopeRead" | "outOfScope" | "flag" | "clear";
    requiresScope?: boolean;
    noteTh?: string;
  }[];
  unknownTh: string;
  missions: readonly {
    id: number;
    titleTh: string;
    doneWhen: string;
    question?: { promptTh: string; options: readonly string[]; answer: string };
    feedbackTh?: string;
  }[];
  decision: {
    options: readonly { id: string; labelTh: string; correct: boolean; feedbackTh: string }[];
  };
  poll: { prompt: CopyText; options: readonly { id: string; labelTh: string }[]; reveal: CopyText };
}
export interface EvidenceMakerData {
  room: {
    titleTh: string;
    href: `https://${string}`;
    badgeTh: string;
    subTh: string;
    factIds: readonly FactId[];
  };
  checklistTh: readonly string[];
  fields: readonly { id: string; placeholderTh: string }[];
  fixedLinesTh: readonly string[];
  includeProofFrom?: string; // page key whose proof picks are listed under "แผนของฉัน"
  privacyTh: string;
}
export interface RecapCardData {
  lines: Readonly<Record<string, string>>; // page key -> template ("{attempts}", "{x}")
  favourites: Readonly<Record<string, string>>; // page key -> "สายที่เธอเลือกเอง: ..."
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
  | {
      kind: "game";
      id: string;
      game: GameSpec;
      track: GameTrack;
      /** Static answers rendered by the server (no-JS and "ข้ามเกม ดูเฉลย"). */
      answersTh: readonly string[];
      demoScript?: readonly DemoStep[];
      collapsed?: boolean;
      phase?: 1 | 2;
    }
  | {
      kind: "bespoke";
      id: string;
      component: string;
      props?: JsonObject;
      factIds?: readonly FactId[];
      simulated?: boolean;
      fallbackTh: readonly string[];
      track?: GameTrack;
      demoScript?: readonly DemoStep[];
      phase?: 1 | 2;
    }
  | { kind: "beat"; id: string; unlockLabelTh: string; blocks: readonly GuideBlock[] } // in-page "ต่อ"
  | { kind: "clip"; id: string } // where page.clip renders (the cutscene)
  | { kind: "safety"; id: string; lineTh: string } // fixed, never dismissable
  | {
      kind: "link";
      id: string;
      labelTh: string;
      href: `https://${string}`;
      cta: "first-step" | "program" | "other-career";
    }
  | { kind: "shareCard"; id: string }
  | { kind: "outro"; id: string } // intent + request + share + follow + program + other careers
  /** Story beat: typewriter dialogue boxes, tap to advance. Each line is one box. */
  | { kind: "dialogue"; id: string; lines: readonly DialogueLine[] }
  /**
   * An in-world fact item (intel card, notification, terminal line, chat
   * bubble, stat). The sources chip lists `text.factIds`. `simulated` items
   * cite a `sim.*` fact and carry the "จำลอง" badge.
   */
  | {
      kind: "item";
      id: string;
      item: ItemKind;
      text: CopyText;
      titleTh?: string;
      metaTh?: string; // sender, time, prompt: short chrome, no digits unless backed by text.factIds
      simulated?: boolean;
    };

export interface ClipSlot {
  seconds: number;
  hookTh: string; // on-screen hook
  /**
   * Teleprompter lines; also the caption text radar:clip aligns. Until a clip is
   * recorded, the cutscene falls back to the host NPC saying these lines in
   * dialogue boxes, so every level is complete without video.
   */
  scriptLinesTh: readonly string[];
  required: boolean; // live guide fails `radar:check` (not Jest) while missing
  safety: boolean; // founder face on screen for a safety line
  factIds: readonly FactId[];
}
export interface ReelPlan {
  format: "founder" | "motion" | "demo";
  hook: CopyText;
  variantsTh: readonly [string, string];
  sendToFriendTh: string;
  visual: readonly string[]; // shot list for the editor / motion scenes
}
export interface GuidePage {
  key: string;
  order: number;
  titleTh: string;
  questionTh: string;
  navLabelTh: string;
  asOf: IsoDate;
  minutes: number;
  blocks: readonly GuideBlock[];
  /** Everything the sources drawer lists, including drawerOnly facts. Copy-level factIds must be a subset. */
  factIds: readonly FactId[];
  clip?: ClipSlot;
  reel?: ReelPlan;
  legacyHashes?: readonly string[];
  showsHacking?: boolean; // requires a `safety` block (guide-lint)
  og: { headlineTh: string; stat?: CopyText };
}
export interface BannedClaim {
  pattern: RegExp;
  reason: string;
  scope?: "all" | "copy" | "clip" | "reel";
}
export interface CareerGuide {
  meta: GuideIndexEntry;
  pages: readonly GuidePage[];
  facts: readonly Fact[]; // career facts; shared facts are merged by lib/radar-guides/facts.ts
  banned: readonly BannedClaim[];
}

// ---------------------------------------------------------------- media (clips.json)
export interface ClipMedia {
  videoUrl: string; // RADAR_GUIDE_VIDEO_URL_PATTERN (radar/guide/<slug>/<page>.<sha8>.mp4)
  posterUrl: string; // RADAR_GUIDE_POSTER_URL_PATTERN
  captionsFile: `clips/${string}.vtt`;
  durationS: number;
  sha8: string;
  recordedAt: IsoDate;
  scriptHash: string; // clipScriptHash(scriptLinesTh) at recording time (guide-lint)
}
export type ClipManifest = Readonly<Record<string /* page key */, ClipMedia>>;

// ---------------------------------------------------------------- runtime (client)
export interface GameResult {
  done: boolean;
  skipped?: boolean;
  score?: number;
  total?: number;
  attempts?: number;
  ms?: number;
}
/**
 * The one per-viewer object in localStorage (GUIDE_STATE_KEY). story.ts calls
 * it GuideProgress and owns its reducers. Device-only convenience: nothing is
 * needed to render a page.
 */
export interface GuideState {
  v: 1;
  visited: string[];
  grade?: GradeKey;
  games: Record<string, GameResult>; // key: "<pageKey>:<blockId>"
  choices: Record<string, string>; // "doors:card3": "redteam"
  fit?: FitOutcome | `${FitOutcome}${FitOutcome}`;
  proof?: string[];
  shortlist?: string[];
  favourite?: string;
  checklist?: Record<string, boolean[]>;
  /** Device-only and never sent: birth year, GPAX, terminal progress, write-up drafts. */
  local?: {
    birthYear?: number;
    gpax?: number;
    drafts?: Record<string, Record<string, string>>;
    [k: string]: Json | undefined;
  };
  // ---- game-story layer (story.ts) ----
  /** Level (page) keys the viewer cleared, in the order cleared. */
  cleared?: string[];
  /** Badge ids already earned (and toasted), in the order earned. */
  badges?: string[];
  /** Page keys whose cutscene was watched to the end or skipped. */
  cutscenes?: Record<string, "watched" | "skipped">;
  /** Last level the viewer was on, for "เล่นต่อ" on the cover and level map. */
  last?: string;
}
export const GUIDE_STATE_KEY = (slug: string) => `radar-guide:v1:${slug}`;

export interface EngineProps<E extends EngineId> {
  slug: string;
  pageKey: string;
  blockId: string;
  data: EngineData<E>;
  track: GameTrack;
  tracker: GuideTracker; // NOOP in demo mode
  demo: boolean;
  reducedMotion: boolean;
  skipped: boolean; // "ข้ามเกม ดูเฉลย" pressed: render the solved state
  onResult(result: GameResult): void;
}
export interface BespokeProps<P extends JsonObject = JsonObject> {
  slug: string;
  pageKey: string;
  blockId: string;
  props: P;
  tracker: GuideTracker;
  demo: boolean;
  reducedMotion: boolean;
  onResult?(result: GameResult): void;
}
