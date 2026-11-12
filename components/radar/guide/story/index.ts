/**
 * Game-story UI for code guides (unit U7): host NPC, dialogue boxes,
 * cutscenes, level map, XP bar, badge toast, profile card, pixel scenes.
 * Contract and rules: lib/radar-guide/story.ts. Art: docs/radar-guide/art.md.
 */
export { BadgeToast, BADGE_TOAST_MS, type BadgeToastProps } from "./BadgeToast";
export { Cutscene, type CutsceneEventName, type CutsceneMedia, type CutsceneProps } from "./Cutscene";
export { DialogueBox, type DialogueBoxProps } from "./DialogueBox";
export { GuideNPC, MOUTH_FLAP_MS, type GuideNPCProps } from "./GuideNPC";
export { LevelMap, type LevelMapProps } from "./LevelMap";
export { PixelIcon, PixelSprite, type PixelIconProps, type PixelSpriteProps } from "./PixelSprite";
export { PixelScene, type PixelSceneProps } from "./PixelScene";
export { ProfileCard, type ProfileCardProps, type ProfileShareMethod } from "./ProfileCard";
export { XpBar, type XpBarProps } from "./XpBar";
export { dismissBadge, enqueueBadges, useGuideProgress, XP_POP_MS, type ToastQueue, type UseGuideProgress } from "./useGuideProgress";
export { guideArtSrc } from "./art-paths";
