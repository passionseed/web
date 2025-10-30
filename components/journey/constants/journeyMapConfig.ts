/**
 * Journey Map Configuration Constants
 *
 * Centralized configuration for the Journey Map Canvas including
 * panel sizes, node positioning, and visual theming.
 */

// ========================================
// PANEL SIZES
// ========================================

export const PANEL_SIZES = {
  LEFT_DEFAULT: 70,
  LEFT_MIN: 30,
  LEFT_MAX: 85,
  RIGHT_DEFAULT: 30,
  RIGHT_MIN: 15,
  RIGHT_MAX: 70,
} as const;

// ========================================
// NODE POSITIONING
// ========================================

export const NODE_LAYOUT = {
  USER_CENTER_POSITION: { x: 0, y: 0 },
  NORTH_STAR_RADIUS: 450,
  SHORT_TERM_RADIUS: 650,
  MIN_RADIUS_FROM_CENTER: 350, // Minimum distance from center to avoid username overlap
} as const;

// ========================================
// REACTFLOW CONFIGURATION
// ========================================

export const FLOW_CONFIG = {
  FIT_VIEW_OPTIONS: {
    padding: 0.2,
    minZoom: 0.5,
    maxZoom: 1.5,
  },
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 2,
  PAN_ON_DRAG: [1, 2] as [number, number],
} as const;

// ========================================
// BACKGROUND STYLING
// ========================================

export const BACKGROUND_CONFIG = {
  GAP: 20,
  SIZE: 1,
  COLOR: "#334155",
  BG_COLOR: "#0f172a",
} as const;

// ========================================
// MINIMAP NODE COLORS
// ========================================

export const MINIMAP_COLORS = {
  USER_CENTER: "#3b82f6",
  NORTH_STAR: "#f59e0b",
  SHORT_TERM: "#10b981",
  MASK: "rgba(0, 0, 0, 0.3)",
} as const;

// ========================================
// RECENT ACTIVITY THRESHOLD
// ========================================

export const RECENT_ACTIVITY_DAYS = 1;

// ========================================
// VIEW MODES
// ========================================

export type ViewMode = "overview" | "milestone";

export const VIEW_MODES = {
  OVERVIEW: "overview" as ViewMode,
  MILESTONE: "milestone" as ViewMode,
} as const;
