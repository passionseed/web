import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { SHIFT_VOICES } from "@/lib/content/shift-voices";

/**
 * Marketing Studio content model. A set is one post: an IG carousel, a
 * Story, or a LinkedIn document carousel. Copy lives here as data so the
 * marketing routine writes new posts without writing new components, and
 * the copy rules in `copyRules.ts` can check every word before it renders.
 *
 * Inline markup in any slide string:
 *   ==text==   marker highlight (one per slide, for the line that must land)
 *   **text**   accent ink
 */

export type StudioFormat = "ig-tall" | "ig-portrait" | "story" | "linkedin" | "square";

/** night: black ink on paper with the dawn horizon (SHIFT print).
 *  cosmos: glass over deep space, the SHIFT[3] look (components/shift/next/cosmos.ts).
 *  paper: cream sheet, black ink, riso accents (guides, LinkedIn). */
export type StudioTheme = "night" | "paper" | "cosmos";

export type StudioChannel = "instagram" | "story" | "linkedin";

export type StudioAudience = "student" | "parent" | "school" | "professional";

export type VoiceKey = keyof typeof SHIFT_VOICES;

export type InkName = "orange" | "pink" | "yellow" | "blue";

export interface StudioPoint {
  title: string;
  body?: string;
}

export interface CoverSlide {
  kind: "cover";
  kicker: string;
  /** One string per line, so line breaks are a copy decision, not luck. */
  title: string[];
  sub?: string;
  /** Yellow margin note, short and human (see .pathlab-note). */
  note?: string;
  /** Show the dawn sky behind the title. */
  sky?: boolean;
  /** Big chrome SHIFT wordmark under the title. */
  wordmark?: boolean;
  /** Large riso line icon in the lower corner, so the cover has a picture. */
  icon?: RisoIconName;
}

export interface PointsSlide {
  kind: "points";
  tag: string;
  title: string;
  points: StudioPoint[];
  /** Numbered stamps instead of bullets. */
  numbered?: boolean;
  /** First stamp number, to continue a list from the previous slide. */
  startAt?: number;
  footnote?: string;
}

export interface CompareSlide {
  kind: "compare";
  tag: string;
  title: string;
  left: { label: string; items: string[] };
  right: { label: string; items: string[] };
  footnote?: string;
}

export interface ChatSlide {
  kind: "chat";
  tag: string;
  title: string;
  /** "me" is the reader sending; "them" is the person they ask. */
  lines: { from: "me" | "them"; text: string }[];
  footnote?: string;
}

export interface QuoteSlide {
  kind: "quote";
  tag: string;
  /** Registered voices only: quotes must stay verbatim and consented. */
  voice: VoiceKey;
  /** One line of context under the quote, in our words. */
  context?: string;
}

export interface StatementSlide {
  kind: "statement";
  tag?: string;
  big: string[];
  body?: string;
  note?: string;
}

export interface CtaSlide {
  kind: "cta";
  tag: string;
  title: string;
  /** comment: the SHIFT keyword route. save/share: value posts. link: LinkedIn. */
  action: "comment" | "save" | "share" | "link";
  body?: string;
  /** Link text shown for action "link", e.g. passionseed.org/shift/school. */
  link?: string;
  icon?: RisoIconName;
}

/** The live SHIFT offer, read from cohort data so dates and price never drift. */
export interface OfferSlide {
  kind: "offer";
  tag: string;
  title: string;
  round: number;
}

/** Day-by-day plan of a SHIFT round, read from the cohort schedule. */
export interface ScheduleSlide {
  kind: "schedule";
  tag: string;
  title: string;
  round: number;
}

export type StudioSlide =
  | CoverSlide
  | PointsSlide
  | CompareSlide
  | ChatSlide
  | QuoteSlide
  | StatementSlide
  | CtaSlide
  | OfferSlide
  | ScheduleSlide;

export interface StudioSet {
  /** URL segment and output folder name. */
  slug: string;
  /** Internal working title. */
  title: string;
  channel: StudioChannel;
  format: StudioFormat;
  theme: StudioTheme;
  audience: StudioAudience;
  /** Put the SHIFT wordmark of this round in the masthead. */
  shiftRound?: number;
  /** One line: the story angle, logged so the routine does not repeat it. */
  angle: string;
  /** Where every claim on the slides comes from (file paths, cohort data). */
  sources: string[];
  /** Post text: the IG caption or the LinkedIn post body. */
  caption: string;
  hashtags?: string[];
  slides: StudioSlide[];
  /** Slides that come before this set in the posted carousel (e.g. a
   *  hand-made poster as slide 1), so page marks count from there. */
  pageOffset?: number;
  /** Date the set was written, YYYY-MM-DD, Bangkok. */
  created: string;
}

/** A text-first LinkedIn post, optionally carrying a rendered set. */
export interface LinkedInPost {
  slug: string;
  title: string;
  /** Who should post it. Founder posts read in first person. */
  voice: "founder" | "company";
  angle: string;
  sources: string[];
  body: string;
  /** Slug of a StudioSet to attach as images or a PDF document. */
  attach?: string;
  created: string;
}

/** A single post on X: one text (≤ 280 weighted chars) plus up to 4 slide images. */
export interface XPost {
  slug: string;
  title: string;
  angle: string;
  sources: string[];
  text: string;
  /** Studio set whose first slides ride along as images (max 4). */
  images?: { set: string; slides: number[] };
  created: string;
}

export type PublishPlatform = "linkedin" | "x";

/** One scheduled publication: what goes where, when (Bangkok time). */
export interface PublishSlot {
  platform: PublishPlatform;
  /** LinkedInPost slug or XPost slug. */
  post: string;
  /** ISO time with +07:00 offset. */
  at: string;
}
