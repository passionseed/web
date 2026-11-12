/**
 * Radar guide pieces shared by the code guides (lib/radar-guides) and the DB
 * deck. Everything takes props and a `GuideTracker`; nothing here imports
 * Supabase. The guide shell and game engines live in `./shell` and `./games`.
 */
export { CaptionOverlay, type CaptionOverlayProps } from "./CaptionOverlay";
export { CareerRequestForm, type CareerRequestFormProps } from "./CareerRequestForm";
export { FollowButton, type FollowButtonProps } from "./FollowButton";
export {
  GuideIntentButton,
  GuideOutro,
  GuideProgramLine,
  type GuideIntentButtonProps,
  type GuideOutroProps,
  type GuideProgramLineProps,
} from "./GuideOutro";
export { GuideSheet, type GuideSheetProps } from "./GuideSheet";
export { MidShareCard, type MidShareCardProps } from "./MidShareCard";
export { ShareButtons, type ShareButtonsProps } from "./ShareButtons";
export { SourcesSheet, type SourcesSheetProps } from "./SourcesSheet";
export { TranscriptSheet, type TranscriptSheetProps } from "./TranscriptSheet";
export { collectSourceRefs, formatThaiMonthYear, type GuideSource } from "./guide-helpers";
export {
  PlaybackManager,
  PlaybackManagerProvider,
  usePlaybackManager,
} from "./usePlaybackManager";
