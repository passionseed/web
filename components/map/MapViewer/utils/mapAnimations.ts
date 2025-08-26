/**
 * Animation and styling utilities for map nodes
 */

import { EnhancedProgress } from "../types";
import { GLOW_EFFECTS, ANIMATION_CLASSES, NODE_STYLES } from "../constants";

/**
 * Get glow effect for a progress status
 */
export function getGlowEffect(status: string): string {
  return GLOW_EFFECTS[status as keyof typeof GLOW_EFFECTS] || "";
}

/**
 * Get animation class for a progress status
 */
export function getAnimationClass(
  status: string,
  isUnlocked: boolean,
  isCompleted: boolean
): string {
  if (!isUnlocked) {
    return "";
  }

  if (isCompleted) {
    return ANIMATION_CLASSES.success;
  }

  switch (status) {
    case "failed":
      return ANIMATION_CLASSES.failed;
    case "submitted":
      return ANIMATION_CLASSES.submitted;
    case "in_progress":
      return ANIMATION_CLASSES.progress;
    case "not_started":
      return isUnlocked ? ANIMATION_CLASSES.float : "";
    default:
      return isUnlocked ? ANIMATION_CLASSES.float : "";
  }
}

/**
 * Get brightness filter for node based on state
 */
export function getBrightnessFilter(
  isUnlocked: boolean,
  isSelected: boolean
): string {
  if (!isUnlocked) {
    return NODE_STYLES.BRIGHTNESS_LOCKED;
  }
  
  if (isSelected) {
    return NODE_STYLES.BRIGHTNESS_SELECTED;
  }
  
  return NODE_STYLES.BRIGHTNESS_DEFAULT;
}

/**
 * Get node styling based on progress and state
 */
export function getNodeStyling(
  progress: EnhancedProgress | undefined,
  isUnlocked: boolean,
  isSelected: boolean,
  isCompleted: boolean
) {
  const status = progress?.status || (progress as any)?.status || "not_started";
  
  return {
    glowEffect: isCompleted || progress ? getGlowEffect(status) : "",
    animationClass: getAnimationClass(status, isUnlocked, isCompleted),
    brightness: getBrightnessFilter(isUnlocked, isSelected),
    status,
  };
}